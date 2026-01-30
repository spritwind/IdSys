import React, { useState, useEffect, useCallback } from 'react';
import { oidcApi, TokenResponse, OidcConfig } from './api';
import './App.css';

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(Array.from(array, byte => String.fromCharCode(byte)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

function Tooltip({ text, children }: TooltipProps) {
  return (
    <span className="tooltip-wrapper">
      {children}
      <span className="tooltip-text">{text}</span>
    </span>
  );
}

function FlowDiagram() {
  const [showFlow, setShowFlow] = useState(false);

  return (
    <div className="flow-section">
      <button className="btn flow-toggle" onClick={() => setShowFlow(!showFlow)}>
        {showFlow ? '隱藏流程圖' : '顯示認證流程圖'}
      </button>

      {showFlow && (
        <div className="flow-diagram">
          <h3>OAuth/OIDC 認證流程</h3>

          <div className="flow-container">
            <div className="flow-column">
              <div className="flow-label">使用者端</div>
              <div className="flow-box user">1. 點擊登入按鈕</div>
              <div className="flow-arrow down" />
              <div className="flow-box user">7. 收到授權碼</div>
              <div className="flow-arrow down" />
              <div className="flow-box user">8. 交換 Token</div>
            </div>

            <div className="flow-column">
              <div className="flow-label">IdentityServer (STS)</div>
              <div className="flow-box sts">2. 收到授權請求</div>
              <div className="flow-arrow down" />
              <div className="flow-box sts hint">
                3. 檢查 acr_values
                <span className="flow-hint">若為 idp:Google 則導向 Google</span>
              </div>
              <div className="flow-arrow down" />
              <div className="flow-box sts">5. 接收 Google 回調</div>
              <div className="flow-arrow down" />
              <div className="flow-box sts">6. 驗證並發行授權碼</div>
            </div>

            <div className="flow-column">
              <div className="flow-label">Google OAuth</div>
              <div className="flow-box google">4. 使用者登入 Google</div>
              <div className="flow-arrow down" />
              <div className="flow-box google">回傳至 IdentityServer</div>
            </div>
          </div>

          <div className="flow-notes">
            <h4>流程說明</h4>
            <ol>
              <li><strong>OIDC 登入</strong>：直接導向 IdentityServer 登入頁面</li>
              <li><strong>Google 登入</strong>：透過 acr_values=idp:Google 參數，IdentityServer 會自動導向 Google</li>
              <li><strong>Token 交換</strong>：無論哪種登入方式，最終都由 IdentityServer 發行 Token</li>
              <li><strong>安全性</strong>：Client Secret 只存在後端，前端不會接觸到敏感資訊</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [config, setConfig] = useState<OidcConfig | null>(null);
  const [discovery, setDiscovery] = useState<any>(null);
  const [tokens, setTokens] = useState<TokenResponse | null>(null);
  const [introspectResult, setIntrospectResult] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [usePkce, setUsePkce] = useState(true);
  const [forceLogin, setForceLogin] = useState(true); // 預設啟用強制登入
  const [activeTab, setActiveTab] = useState<'login' | 'token' | 'api' | 'manual' | 'flow' | 'endpoints'>('login');

  // 端點測試頁籤的狀態
  const [endpointResults, setEndpointResults] = useState<Record<string, any>>({});
  const [endpointParams, setEndpointParams] = useState<Record<string, Record<string, string>>>({});
  const [endpointParamsInitialized, setEndpointParamsInitialized] = useState(false);

  // 手動測試頁籤的狀態
  const [manualRedirectUri, setManualRedirectUri] = useState(`${window.location.origin}/callback`);
  const [manualState, setManualState] = useState('');
  const [manualCodeVerifier, setManualCodeVerifier] = useState('');
  const [manualCodeChallenge, setManualCodeChallenge] = useState('');
  const [manualScope, setManualScope] = useState('openid profile email roles offline_access');
  const [manualIdp, setManualIdp] = useState('');
  const [manualPrompt, setManualPrompt] = useState('login');
  const [generatedAuthUrl, setGeneratedAuthUrl] = useState('');
  const [manualAuthCode, setManualAuthCode] = useState('');
  const [manualTokenResponse, setManualTokenResponse] = useState<any>(null);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
  }, []);

  useEffect(() => {
    loadConfig();
    // 恢復手動測試的 code_verifier（如果有的話）
    const savedVerifier = sessionStorage.getItem('manual_code_verifier');
    if (savedVerifier) {
      setManualCodeVerifier(savedVerifier);
    }
  }, []);

  // 儲存回調 URL 資訊
  const [callbackInfo, setCallbackInfo] = useState<{
    fullUrl: string;
    params: Record<string, string>;
    source: 'manual' | 'endpoint' | 'login';
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code && state) {
      // 保存完整的回調資訊
      const fullUrl = window.location.href;
      const callbackParams: Record<string, string> = {};
      params.forEach((value, key) => {
        callbackParams[key] = value;
      });

      // 檢查是否來自手動測試流程
      const isManualFlow = sessionStorage.getItem('manual_state') === state;
      // 檢查是否來自端點測試流程
      const isEndpointFlow = sessionStorage.getItem('endpoint_state') === state;

      if (isManualFlow) {
        // 手動測試流程：顯示 code，不自動交換
        setCallbackInfo({ fullUrl, params: callbackParams, source: 'manual' });
        setManualAuthCode(code);
        setActiveTab('manual');
        addLog(`收到授權碼: ${code}`);
        addLog('請點擊「交換 Token」按鈕進行交換');
      } else if (isEndpointFlow) {
        // 端點測試流程：顯示 code 並填入 Token Endpoint 參數
        setCallbackInfo({ fullUrl, params: callbackParams, source: 'endpoint' });
        setManualAuthCode(code); // 同步更新，讓其他地方也能用
        setActiveTab('endpoints');
        addLog(`[端點測試] 收到回調 URL`);
        addLog(`[端點測試] 授權碼: ${code}`);
        addLog('請到 Token Endpoint 執行交換 Token');
      } else {
        // 一般登入流程：自動交換 token
        setCallbackInfo({ fullUrl, params: callbackParams, source: 'login' });
        const savedVerifier = sessionStorage.getItem('code_verifier');
        handleCallback(code, savedVerifier || undefined);
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadConfig = async () => {
    try {
      const res = await oidcApi.getConfig();
      setConfig(res.data);
      addLog('設定載入完成');
    } catch (e: any) {
      addLog(`設定錯誤: ${e.message}`);
    }
  };

  const loadDiscovery = async () => {
    try {
      const res = await oidcApi.getDiscovery();
      setDiscovery(res.data);
      addLog('Discovery 文件載入完成');
    } catch (e: any) {
      addLog(`Discovery 錯誤: ${e.message}`);
    }
  };

  const startLogin = async (idp?: string) => {
    try {
      const state = Math.random().toString(36).substring(7);
      const redirectUri = `${window.location.origin}/callback`;

      let verifier: string | undefined;
      if (usePkce) {
        verifier = generateCodeVerifier();
        sessionStorage.setItem('code_verifier', verifier);
      }

      const res = await oidcApi.getAuthorizeUrl(redirectUri, state, verifier, idp, forceLogin);
      addLog(`導向授權端點${usePkce ? ' (PKCE 已啟用)' : ''}${forceLogin ? ' (強制登入)' : ''}${idp ? ` [${idp}]` : ''}`);
      console.log('授權 URL:', res.data.url);
      addLog(`URL: ${res.data.url.substring(0, 100)}...`);
      window.location.href = res.data.url;
    } catch (e: any) {
      addLog(`登入錯誤: ${e.message}`);
    }
  };

  const handleCallback = async (code: string, savedVerifier?: string) => {
    try {
      addLog(`處理回調，授權碼: ${code.substring(0, 10)}...`);
      const redirectUri = `${window.location.origin}/callback`;
      const res = await oidcApi.exchangeToken(code, redirectUri, savedVerifier);

      if (res.data.error) {
        addLog(`Token 錯誤: ${res.data.error} - ${res.data.error_description}`);
      } else {
        setTokens(res.data);
        addLog('Token 取得成功');
        sessionStorage.removeItem('code_verifier');
      }
    } catch (e: any) {
      addLog(`回調錯誤: ${e.message}`);
    }
  };

  const refreshAccessToken = async () => {
    if (!tokens?.refresh_token) {
      addLog('沒有可用的 Refresh Token');
      return;
    }
    try {
      addLog('正在更換 Token...');
      const res = await oidcApi.refreshToken(tokens.refresh_token);
      if (res.data.error) {
        addLog(`更換錯誤: ${res.data.error}`);
      } else {
        setTokens(res.data);
        addLog('Token 更換成功');
      }
    } catch (e: any) {
      addLog(`更換錯誤: ${e.message}`);
    }
  };

  // 手動測試相關函數
  const generateManualState = () => {
    const state = Math.random().toString(36).substring(2, 15);
    setManualState(state);
    addLog(`產生 state: ${state}`);
  };

  const generateManualPkce = async () => {
    const verifier = generateCodeVerifier();
    setManualCodeVerifier(verifier);

    // 計算 code_challenge
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    setManualCodeChallenge(challenge);
    addLog(`產生 PKCE - verifier: ${verifier.substring(0, 20)}... challenge: ${challenge.substring(0, 20)}...`);
  };

  const buildManualAuthUrl = () => {
    if (!config) {
      addLog('設定尚未載入');
      return;
    }

    let url = `${config.authority}/connect/authorize?`;
    const params: string[] = [];

    params.push(`client_id=${config.clientId}`);
    params.push(`redirect_uri=${encodeURIComponent(manualRedirectUri)}`);
    params.push(`response_type=code`);
    params.push(`scope=${encodeURIComponent(manualScope)}`);

    if (manualState) {
      params.push(`state=${manualState}`);
    }

    if (manualPrompt) {
      params.push(`prompt=${manualPrompt}`);
    }

    if (manualCodeChallenge) {
      params.push(`code_challenge=${manualCodeChallenge}`);
      params.push(`code_challenge_method=S256`);
    }

    if (manualIdp) {
      params.push(`acr_values=idp:${manualIdp}`);
    }

    url += params.join('&');
    setGeneratedAuthUrl(url);
    addLog('授權 URL 已產生');
  };

  const goToManualAuthUrl = () => {
    if (!generatedAuthUrl) {
      addLog('請先產生授權 URL');
      return;
    }
    // 儲存 code_verifier 以便後續交換 token
    if (manualCodeVerifier) {
      sessionStorage.setItem('manual_code_verifier', manualCodeVerifier);
    }
    sessionStorage.setItem('manual_state', manualState);
    window.location.href = generatedAuthUrl;
  };

  const exchangeManualToken = async () => {
    if (!manualAuthCode) {
      addLog('請輸入授權碼');
      return;
    }

    try {
      addLog(`正在交換 Token，授權碼: ${manualAuthCode.substring(0, 20)}...`);
      const savedVerifier = sessionStorage.getItem('manual_code_verifier') || manualCodeVerifier;
      const res = await oidcApi.exchangeToken(manualAuthCode, manualRedirectUri, savedVerifier || undefined);

      setManualTokenResponse(res.data);
      if (res.data.error) {
        addLog(`Token 錯誤: ${res.data.error} - ${res.data.error_description}`);
      } else {
        setTokens(res.data);
        addLog('Token 交換成功');
        sessionStorage.removeItem('manual_code_verifier');
        sessionStorage.removeItem('manual_state');
      }
    } catch (e: any) {
      addLog(`Token 交換錯誤: ${e.message}`);
    }
  };

  const introspectToken = async () => {
    if (!tokens?.access_token) {
      addLog('沒有 Access Token 可檢查');
      return;
    }
    try {
      addLog('正在檢查 Token...');
      const res = await oidcApi.introspect(tokens.access_token);
      setIntrospectResult(res.data);
      addLog(`Token 狀態: ${res.data.active ? '有效' : '無效'}`);
    } catch (e: any) {
      addLog(`檢查錯誤: ${e.message}`);
    }
  };

  const revokeAccessToken = async () => {
    if (!tokens?.access_token) {
      addLog('沒有 Access Token 可撤銷');
      return;
    }
    try {
      addLog('正在撤銷 Access Token...');
      const res = await oidcApi.revoke(tokens.access_token, 'access_token');
      if (res.data.success) {
        addLog('Access Token 已撤銷 (Token 值保留供檢查驗證)');
        // 不清除 access_token，保留供 introspect 驗證使用
      } else {
        addLog('撤銷失敗');
      }
    } catch (e: any) {
      addLog(`撤銷錯誤: ${e.message}`);
    }
  };

  const revokeRefreshToken = async () => {
    if (!tokens?.refresh_token) {
      addLog('沒有 Refresh Token 可撤銷');
      return;
    }
    try {
      addLog('正在撤銷 Refresh Token...');
      const res = await oidcApi.revoke(tokens.refresh_token, 'refresh_token');
      if (res.data.success) {
        addLog('Refresh Token 已撤銷 (Token 值保留供檢查)');
        // 不清除 refresh_token，保留供驗證使用
      } else {
        addLog('撤銷失敗');
      }
    } catch (e: any) {
      addLog(`撤銷錯誤: ${e.message}`);
    }
  };

  const getUserInfo = async () => {
    if (!tokens?.access_token) {
      addLog('沒有 Access Token 可取得使用者資訊');
      return;
    }
    try {
      addLog('正在取得使用者資訊...');
      const res = await oidcApi.getUserInfo(tokens.access_token);
      setUserInfo(res.data);
      addLog('使用者資訊取得成功');
    } catch (e: any) {
      addLog(`使用者資訊錯誤: ${e.message}`);
    }
  };

  const clearTokens = () => {
    setTokens(null);
    setIntrospectResult(null);
    setUserInfo(null);
    addLog('所有 Token 已清除');
  };

  const logout = async () => {
    try {
      addLog('正在登出...');
      const postLogoutRedirectUri = window.location.origin;
      const res = await oidcApi.getLogoutUrl(tokens?.id_token, postLogoutRedirectUri);

      // 清除本地狀態
      setTokens(null);
      setIntrospectResult(null);
      setUserInfo(null);
      sessionStorage.removeItem('code_verifier');

      // 導向 IdentityServer 的登出端點
      window.location.href = res.data.url;
    } catch (e: any) {
      addLog(`登出錯誤: ${e.message}`);
    }
  };

  const clearLogs = () => setLogs([]);

  // 參數說明
  const paramDescriptions: Record<string, Record<string, string>> = {
    authorize: {
      client_id: '客戶端識別碼，在 IdentityServer 註冊時取得',
      redirect_uri: '授權完成後的回調 URL，必須與註冊時設定的一致',
      response_type: '回應類型，code 表示使用 Authorization Code Flow',
      scope: '請求的權限範圍，如 openid、profile、email 等',
      state: '防止 CSRF 攻擊的隨機字串，回調時會原封不動回傳',
      code_challenge: 'PKCE 驗證碼，由 code_verifier 經 SHA256 後 Base64URL 編碼',
      code_challenge_method: 'PKCE 編碼方式，S256 表示使用 SHA-256',
      prompt: '登入提示：login=強制登入、consent=強制同意、none=靜默驗證'
    },
    token: {
      grant_type: '授權類型，authorization_code 表示使用授權碼交換',
      code: '從授權端點取得的授權碼，只能使用一次',
      redirect_uri: '必須與授權請求時的 redirect_uri 一致',
      client_id: '客戶端識別碼',
      code_verifier: 'PKCE 原始驗證碼，用於驗證 code_challenge'
    },
    refresh: {
      grant_type: '授權類型，refresh_token 表示更新 Token',
      refresh_token: '用於取得新 Access Token 的 Refresh Token',
      client_id: '客戶端識別碼'
    },
    introspect: {
      token: '要檢查的 Token（Access Token 或 Refresh Token）',
      token_type_hint: 'Token 類型提示，幫助伺服器更快找到 Token',
      client_id: '客戶端識別碼'
    },
    'validate-local': {
      token: 'JWT 格式的 Access Token，將使用 JWKS 公鑰進行本地簽章驗證'
    },
    revoke: {
      token: '要撤銷的 Token',
      token_type_hint: 'Token 類型：access_token 或 refresh_token',
      client_id: '客戶端識別碼'
    },
    userinfo: {
      Authorization: 'Bearer Token 認證標頭，格式為 "Bearer {access_token}"'
    },
    endsession: {
      id_token_hint: 'ID Token，用於識別要登出的使用者',
      post_logout_redirect_uri: '登出後導向的 URL'
    }
  };

  // 產生新的 state
  const generateNewState = (endpointId: string) => {
    const newState = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    updateEndpointParam(endpointId, 'state', newState);
    addLog(`產生新的 state: ${newState}`);
  };

  // 產生新的 PKCE
  const generateNewPkce = async (endpointId: string) => {
    const verifier = generateCodeVerifier();

    // 計算 code_challenge
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // 更新 authorize 的 code_challenge
    updateEndpointParam('authorize', 'code_challenge', challenge);
    // 更新 token 的 code_verifier
    updateEndpointParam('token', 'code_verifier', verifier);

    // 同步更新手動測試的狀態
    setManualCodeVerifier(verifier);
    setManualCodeChallenge(challenge);

    addLog(`產生新的 PKCE - verifier: ${verifier.substring(0, 20)}...`);
  };

  // 端點參數更新函數
  const updateEndpointParam = (endpointId: string, paramKey: string, value: string) => {
    setEndpointParams(prev => ({
      ...prev,
      [endpointId]: {
        ...prev[endpointId],
        [paramKey]: value
      }
    }));
  };

  // 初始化端點參數
  const initEndpointParams = useCallback(() => {
    if (endpointParamsInitialized || !config) return;

    const savedVerifier = sessionStorage.getItem('endpoint_code_verifier') || sessionStorage.getItem('manual_code_verifier') || manualCodeVerifier;

    const initialParams: Record<string, Record<string, string>> = {
      authorize: {
        client_id: config.clientId,
        redirect_uri: `${window.location.origin}/callback`,
        response_type: 'code',
        scope: 'openid profile email roles offline_access',
        state: Math.random().toString(36).substring(7),
        code_challenge: manualCodeChallenge || '(需先在「手動測試」產生 PKCE)',
        code_challenge_method: 'S256',
        prompt: 'login'
      },
      token: {
        grant_type: 'authorization_code',
        code: manualAuthCode || '(需先從 Authorize 端點取得)',
        redirect_uri: `${window.location.origin}/callback`,
        client_id: config.clientId,
        code_verifier: savedVerifier || '(需先產生 PKCE)'
      },
      refresh: {
        grant_type: 'refresh_token',
        refresh_token: tokens?.refresh_token || '(需先登入取得)',
        client_id: config.clientId
      },
      introspect: {
        token: tokens?.access_token || '(需先登入取得)',
        token_type_hint: 'access_token',
        client_id: config.clientId
      },
      'validate-local': {
        token: tokens?.access_token || '(需先登入取得)'
      },
      revoke: {
        token: tokens?.access_token || '(需先登入取得)',
        token_type_hint: 'access_token',
        client_id: config.clientId
      },
      userinfo: {
        Authorization: `Bearer ${tokens?.access_token || '(需先登入取得)'}`
      },
      endsession: {
        id_token_hint: tokens?.id_token || '(需先登入取得)',
        post_logout_redirect_uri: window.location.origin
      }
    };

    setEndpointParams(initialParams);
    setEndpointParamsInitialized(true);
  }, [config, manualCodeChallenge, manualAuthCode, manualCodeVerifier, tokens, endpointParamsInitialized]);

  // 當 config 載入後初始化端點參數
  useEffect(() => {
    if (config && !endpointParamsInitialized) {
      initEndpointParams();
    }
  }, [config, endpointParamsInitialized, initEndpointParams]);

  // 當 tokens 更新時，同步更新相關的端點參數
  useEffect(() => {
    if (tokens && endpointParamsInitialized) {
      setEndpointParams(prev => ({
        ...prev,
        refresh: {
          ...prev.refresh,
          refresh_token: tokens.refresh_token || prev.refresh?.refresh_token || ''
        },
        introspect: {
          ...prev.introspect,
          token: tokens.access_token || prev.introspect?.token || ''
        },
        'validate-local': {
          ...prev['validate-local'],
          token: tokens.access_token || prev['validate-local']?.token || ''
        },
        revoke: {
          ...prev.revoke,
          token: tokens.access_token || prev.revoke?.token || ''
        },
        userinfo: {
          ...prev.userinfo,
          Authorization: `Bearer ${tokens.access_token || ''}`
        },
        endsession: {
          ...prev.endsession,
          id_token_hint: tokens.id_token || prev.endsession?.id_token_hint || ''
        }
      }));
    }
  }, [tokens, endpointParamsInitialized]);

  // 當 manual auth code 更新時，同步更新 token 端點參數
  useEffect(() => {
    if (manualAuthCode && endpointParamsInitialized) {
      setEndpointParams(prev => ({
        ...prev,
        token: {
          ...prev.token,
          code: manualAuthCode
        }
      }));
    }
  }, [manualAuthCode, endpointParamsInitialized]);

  // 當 PKCE 更新時，同步更新 authorize 端點參數
  useEffect(() => {
    if (manualCodeChallenge && endpointParamsInitialized) {
      setEndpointParams(prev => ({
        ...prev,
        authorize: {
          ...prev.authorize,
          code_challenge: manualCodeChallenge
        },
        token: {
          ...prev.token,
          code_verifier: manualCodeVerifier
        }
      }));
    }
  }, [manualCodeChallenge, manualCodeVerifier, endpointParamsInitialized]);

  // 重置單一端點參數
  const resetEndpointParams = (endpointId: string) => {
    if (!config) return;
    const savedVerifier = sessionStorage.getItem('endpoint_code_verifier') || sessionStorage.getItem('manual_code_verifier') || manualCodeVerifier;

    const defaults: Record<string, Record<string, string>> = {
      authorize: {
        client_id: config.clientId,
        redirect_uri: `${window.location.origin}/callback`,
        response_type: 'code',
        scope: 'openid profile email roles offline_access',
        state: Math.random().toString(36).substring(7),
        code_challenge: manualCodeChallenge || '(需先在「手動測試」產生 PKCE)',
        code_challenge_method: 'S256',
        prompt: 'login'
      },
      token: {
        grant_type: 'authorization_code',
        code: manualAuthCode || '(需先從 Authorize 端點取得)',
        redirect_uri: `${window.location.origin}/callback`,
        client_id: config.clientId,
        code_verifier: savedVerifier || '(需先產生 PKCE)'
      },
      refresh: {
        grant_type: 'refresh_token',
        refresh_token: tokens?.refresh_token || '(需先登入取得)',
        client_id: config.clientId
      },
      introspect: {
        token: tokens?.access_token || '(需先登入取得)',
        token_type_hint: 'access_token',
        client_id: config.clientId
      },
      'validate-local': {
        token: tokens?.access_token || '(需先登入取得)'
      },
      revoke: {
        token: tokens?.access_token || '(需先登入取得)',
        token_type_hint: 'access_token',
        client_id: config.clientId
      },
      userinfo: {
        Authorization: `Bearer ${tokens?.access_token || '(需先登入取得)'}`
      },
      endsession: {
        id_token_hint: tokens?.id_token || '(需先登入取得)',
        post_logout_redirect_uri: window.location.origin
      }
    };

    if (defaults[endpointId]) {
      setEndpointParams(prev => ({
        ...prev,
        [endpointId]: defaults[endpointId]
      }));
      addLog(`${endpointId} 參數已重置`);
    }
  };

  // 端點測試函數
  const endpoints = [
    {
      id: 'discovery',
      name: 'Discovery Document',
      method: 'GET',
      path: '/.well-known/openid-configuration',
      description: '【用途】取得 OIDC 設定文件，包含授權伺服器支援的所有端點 URL、支援的 scope、grant type 等資訊。這是 OIDC 流程的起點，客戶端應用會先讀取此文件來取得各端點位置。',
      execute: async () => {
        const res = await oidcApi.getDiscovery();
        return res.data;
      }
    },
    {
      id: 'authorize',
      name: 'Authorization Endpoint',
      method: 'GET',
      path: '/connect/authorize',
      description: '【用途】授權端點，OAuth 2.0 流程的第一步。將使用者導向登入頁面進行身份驗證，成功後返回授權碼 (Authorization Code)。此 Client 要求使用 PKCE。',
      hasEditableParams: true,
      execute: async () => {
        const params = endpointParams.authorize;
        if (!params?.code_challenge || params.code_challenge.startsWith('(需先')) {
          return { error: '此 Client 要求 PKCE，請先到「手動測試」頁籤產生 PKCE' };
        }
        sessionStorage.setItem('endpoint_state', params.state);
        sessionStorage.setItem('endpoint_code_verifier', endpointParams.token?.code_verifier || manualCodeVerifier);
        const url = `${config?.authority}/connect/authorize?${new URLSearchParams(params).toString()}`;
        return { url, note: '此為導向 URL，點擊「前往」按鈕執行授權流程。回調後請到「端點測試」的 Token Endpoint 交換 Token。' };
      },
      navigable: true
    },
    {
      id: 'token',
      name: 'Token Endpoint',
      method: 'POST',
      path: '/connect/token',
      description: '【用途】Token 端點，使用授權碼交換 Access Token、Refresh Token 和 ID Token。這是 Authorization Code Flow 的第二步，必須在後端執行以保護 Client Secret。',
      hasEditableParams: true,
      execute: async () => {
        const params = endpointParams.token;
        if (!params?.code || params.code.startsWith('(需先')) return { error: '請先從「手動測試」頁籤取得授權碼' };
        const res = await oidcApi.exchangeToken(params.code, params.redirect_uri, params.code_verifier || undefined);
        if (!res.data.error) {
          setTokens(res.data);
          sessionStorage.removeItem('endpoint_code_verifier');
          sessionStorage.removeItem('endpoint_state');
        }
        return res.data;
      }
    },
    {
      id: 'refresh',
      name: 'Token Refresh',
      method: 'POST',
      path: '/connect/token',
      description: '【用途】Token 更新，使用 Refresh Token 取得新的 Access Token，讓使用者不需重新登入即可延長存取權限。Refresh Token 通常有較長的有效期。',
      hasEditableParams: true,
      execute: async () => {
        const params = endpointParams.refresh;
        if (!params?.refresh_token || params.refresh_token.startsWith('(需先')) return { error: '請先登入取得 Refresh Token' };
        const res = await oidcApi.refreshToken(params.refresh_token);
        if (!res.data.error) setTokens(res.data);
        return res.data;
      }
    },
    {
      id: 'introspect',
      name: 'Token Introspection',
      method: 'POST',
      path: '/connect/introspect',
      description: '【用途】Token 內省端點（遠端驗證），向授權伺服器查詢 Token 狀態。可偵測已撤銷的 Token，但每次驗證都需要網路請求。',
      hasEditableParams: true,
      execute: async () => {
        const params = endpointParams.introspect;
        if (!params?.token || params.token.startsWith('(需先')) return { error: '請先登入取得 Access Token' };
        const res = await oidcApi.introspect(params.token);
        return res.data;
      }
    },
    {
      id: 'validate-local',
      name: 'Local JWT Validation',
      method: 'POST',
      path: '/api/oidc/validate-local',
      description: '【用途】本地 JWT 驗證（不呼叫授權伺服器）。使用 JWKS 公鑰驗證 Token 簽章，速度快但無法偵測已撤銷的 Token。這是資源伺服器（API）通常採用的驗證方式。',
      hasEditableParams: true,
      execute: async () => {
        const params = endpointParams['validate-local'];
        if (!params?.token || params.token.startsWith('(需先')) return { error: '請先登入取得 Access Token' };
        const res = await oidcApi.validateLocal(params.token);
        return res.data;
      }
    },
    {
      id: 'revoke',
      name: 'Token Revocation',
      method: 'POST',
      path: '/connect/revocation',
      description: '【用途】Token 撤銷端點，用於主動使 Token 失效。當使用者登出或需要強制終止存取權時使用。注意：JWT 格式的 Token 撤銷後，本地驗證仍可能通過，需配合 Introspection 確認。',
      hasEditableParams: true,
      execute: async () => {
        const params = endpointParams.revoke;
        if (!params?.token || params.token.startsWith('(需先')) return { error: '請先登入取得 Access Token' };
        const res = await oidcApi.revoke(params.token, params.token_type_hint || 'access_token');
        return res.data;
      }
    },
    {
      id: 'userinfo',
      name: 'UserInfo Endpoint',
      method: 'GET',
      path: '/connect/userinfo',
      description: '【用途】使用者資訊端點，使用 Access Token 取得已登入使用者的身份資訊（如姓名、Email、角色等）。回傳的欄位取決於請求的 scope。',
      hasEditableParams: true,
      execute: async () => {
        const params = endpointParams.userinfo;
        // 從 Authorization header 取得 token
        const authHeader = params?.Authorization || '';
        const accessToken = authHeader.replace('Bearer ', '');
        if (!accessToken || accessToken.startsWith('(需先')) return { error: '請先登入取得 Access Token' };
        const res = await oidcApi.getUserInfo(accessToken);
        return res.data;
      }
    },
    {
      id: 'endsession',
      name: 'End Session Endpoint',
      method: 'GET',
      path: '/connect/endsession',
      description: '【用途】登出端點，結束使用者在授權伺服器的 Session。支援 Single Sign-Out，可同時登出所有使用相同 Session 的應用程式。',
      hasEditableParams: true,
      execute: async () => {
        const params = endpointParams.endsession;
        const res = await oidcApi.getLogoutUrl(params?.id_token_hint, params?.post_logout_redirect_uri || window.location.origin);
        return { url: res.data.url, note: '此為導向 URL，點擊「前往」按鈕執行登出' };
      },
      navigable: true
    }
  ];

  const executeEndpoint = async (endpoint: typeof endpoints[0]) => {
    try {
      addLog(`執行 ${endpoint.name} 端點...`);
      const result = await endpoint.execute();
      setEndpointResults(prev => ({ ...prev, [endpoint.id]: result }));
      addLog(`${endpoint.name} 執行完成`);
    } catch (e: any) {
      setEndpointResults(prev => ({ ...prev, [endpoint.id]: { error: e.message } }));
      addLog(`${endpoint.name} 錯誤: ${e.message}`);
    }
  };

  const navigateToEndpoint = (endpoint: typeof endpoints[0]) => {
    const result = endpointResults[endpoint.id];
    if (result?.url) {
      window.location.href = result.url;
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div>
            <h1>OAuth/OIDC 測試工具</h1>
            <p className="subtitle">驗證伺服器: {config?.authority || '載入中...'}</p>
          </div>
          <button onClick={logout} className="btn danger logout-btn">
            登出 (End Session)
          </button>
        </div>
      </header>

      <nav className="tabs">
        <button className={activeTab === 'login' ? 'active' : ''} onClick={() => setActiveTab('login')}>授權登入</button>
        <button className={activeTab === 'token' ? 'active' : ''} onClick={() => setActiveTab('token')}>Token 操作</button>
        <button className={activeTab === 'api' ? 'active' : ''} onClick={() => setActiveTab('api')}>API 測試</button>
        <button className={activeTab === 'manual' ? 'active' : ''} onClick={() => setActiveTab('manual')}>手動測試</button>
        <button className={activeTab === 'flow' ? 'active' : ''} onClick={() => setActiveTab('flow')}>流程說明</button>
        <button className={activeTab === 'endpoints' ? 'active' : ''} onClick={() => setActiveTab('endpoints')}>端點測試</button>
      </nav>

      <main className="main">
        <section className="panel">
          {activeTab === 'login' && (
            <div className="section">
              <h2>授權登入</h2>
              <div className="form-group">
                <Tooltip text="PKCE (Proof Key for Code Exchange) 可防止授權碼攔截攻擊，建議啟用">
                  <label>
                    <input type="checkbox" checked={usePkce} onChange={e => setUsePkce(e.target.checked)} />
                    啟用 PKCE
                  </label>
                </Tooltip>
                <Tooltip text="強制顯示登入畫面，即使已有 SSO Session (加入 prompt=login 參數)">
                  <label style={{ marginLeft: '20px' }}>
                    <input type="checkbox" checked={forceLogin} onChange={e => setForceLogin(e.target.checked)} />
                    強制登入
                  </label>
                </Tooltip>
              </div>
              <div className="button-group">
                <Tooltip text="使用 Authorization Code Flow 進行 OIDC 登入，會導向 IdentityServer 登入頁面">
                  <button onClick={() => startLogin()} className="btn primary">OIDC 登入</button>
                </Tooltip>
                <Tooltip text="直接使用 Google 帳號登入，僅限 uccapital.com.tw 網域">
                  <button onClick={() => startLogin('Google')} className="btn google">Google 登入</button>
                </Tooltip>
                <Tooltip text="載入 IdentityServer 的 Discovery 文件，包含所有端點資訊">
                  <button onClick={loadDiscovery} className="btn">載入 Discovery</button>
                </Tooltip>
              </div>

              {discovery && (
                <div className="result">
                  <h3>Discovery 文件</h3>
                  <pre>{JSON.stringify(discovery, null, 2)}</pre>
                </div>
              )}

              <FlowDiagram />
            </div>
          )}

          {activeTab === 'token' && (
            <div className="section">
              <h2>Token 操作</h2>
              <div className="button-group">
                <Tooltip text="使用 Refresh Token 取得新的 Access Token，無需重新登入">
                  <button onClick={refreshAccessToken} className="btn" disabled={!tokens?.refresh_token}>更換 Token</button>
                </Tooltip>
                <Tooltip text="向伺服器查詢 Token 的詳細資訊和有效狀態">
                  <button onClick={introspectToken} className="btn" disabled={!tokens?.access_token}>檢查 Token</button>
                </Tooltip>
                <Tooltip text="撤銷 Access Token，注意 JWT 格式的 Token 撤銷後本地驗證仍可能通過">
                  <button onClick={revokeAccessToken} className="btn danger" disabled={!tokens?.access_token}>撤銷 Access</button>
                </Tooltip>
                <Tooltip text="撤銷 Refresh Token，使其無法再用於取得新的 Access Token">
                  <button onClick={revokeRefreshToken} className="btn danger" disabled={!tokens?.refresh_token}>撤銷 Refresh</button>
                </Tooltip>
                <Tooltip text="清除本地儲存的所有 Token">
                  <button onClick={clearTokens} className="btn">清除全部</button>
                </Tooltip>
              </div>

              {tokens && (
                <div className="result">
                  <h3>目前的 Token</h3>
                  <div className="token-display">
                    {tokens.access_token && (
                      <div className="token-item">
                        <label>Access Token:</label>
                        <code>{tokens.access_token.substring(0, 50)}...</code>
                      </div>
                    )}
                    {tokens.refresh_token && (
                      <div className="token-item">
                        <label>Refresh Token:</label>
                        <code>{tokens.refresh_token.substring(0, 30)}...</code>
                      </div>
                    )}
                    {tokens.id_token && (
                      <div className="token-item">
                        <label>ID Token:</label>
                        <code>{tokens.id_token.substring(0, 50)}...</code>
                      </div>
                    )}
                    <div className="token-item">
                      <label>有效期限:</label>
                      <code>{tokens.expires_in} 秒</code>
                    </div>
                  </div>
                </div>
              )}

              {introspectResult && (
                <div className="result">
                  <h3>Token 檢查結果</h3>
                  <div className="introspect-details">
                    <table className="introspect-table">
                      <thead>
                        <tr>
                          <th>欄位</th>
                          <th>值</th>
                          <th>說明</th>
                        </tr>
                      </thead>
                      <tbody>
                        {introspectResult.active !== undefined && (
                          <tr className={introspectResult.active ? 'active-true' : 'active-false'}>
                            <td><strong>active</strong></td>
                            <td>{introspectResult.active ? '✓ true' : '✗ false'}</td>
                            <td>Token 是否有效。{introspectResult.active ? '此 Token 目前有效' : '此 Token 已失效或被撤銷'}</td>
                          </tr>
                        )}
                        {introspectResult.token_type && (
                          <tr>
                            <td><strong>token_type</strong></td>
                            <td>{introspectResult.token_type}</td>
                            <td>Token 類型 (access_token / refresh_token)</td>
                          </tr>
                        )}
                        {introspectResult.iss && (
                          <tr>
                            <td><strong>iss</strong></td>
                            <td className="value-cell">{introspectResult.iss}</td>
                            <td>發行者 (Issuer) - 發行此 Token 的授權伺服器</td>
                          </tr>
                        )}
                        {introspectResult.sub && (
                          <tr>
                            <td><strong>sub</strong></td>
                            <td className="value-cell">{introspectResult.sub}</td>
                            <td>主體 (Subject) - 使用者的唯一識別碼</td>
                          </tr>
                        )}
                        {introspectResult.client_id && (
                          <tr>
                            <td><strong>client_id</strong></td>
                            <td>{introspectResult.client_id}</td>
                            <td>客戶端 ID - 請求此 Token 的應用程式</td>
                          </tr>
                        )}
                        {introspectResult.scope && (
                          <tr>
                            <td><strong>scope</strong></td>
                            <td>{introspectResult.scope}</td>
                            <td>授權範圍 - Token 被授予的存取權限</td>
                          </tr>
                        )}
                        {introspectResult.idp && (
                          <tr>
                            <td><strong>idp</strong></td>
                            <td>{introspectResult.idp}</td>
                            <td>身份提供者 - 使用者透過哪個 IdP 登入 (如 Google)</td>
                          </tr>
                        )}
                        {introspectResult.amr && (
                          <tr>
                            <td><strong>amr</strong></td>
                            <td>{introspectResult.amr}</td>
                            <td>驗證方法參考 (Authentication Method Reference)</td>
                          </tr>
                        )}
                        {introspectResult.iat && (
                          <tr>
                            <td><strong>iat</strong></td>
                            <td>{new Date(introspectResult.iat * 1000).toLocaleString()}</td>
                            <td>發行時間 (Issued At)</td>
                          </tr>
                        )}
                        {introspectResult.nbf && (
                          <tr>
                            <td><strong>nbf</strong></td>
                            <td>{new Date(introspectResult.nbf * 1000).toLocaleString()}</td>
                            <td>生效時間 (Not Before) - Token 開始生效的時間</td>
                          </tr>
                        )}
                        {introspectResult.exp && (
                          <tr>
                            <td><strong>exp</strong></td>
                            <td>{new Date(introspectResult.exp * 1000).toLocaleString()}</td>
                            <td>過期時間 (Expiration) - Token 失效的時間</td>
                          </tr>
                        )}
                        {introspectResult.auth_time && (
                          <tr>
                            <td><strong>auth_time</strong></td>
                            <td>{new Date(introspectResult.auth_time * 1000).toLocaleString()}</td>
                            <td>驗證時間 - 使用者完成登入的時間</td>
                          </tr>
                        )}
                        {introspectResult.sid && (
                          <tr>
                            <td><strong>sid</strong></td>
                            <td className="value-cell">{introspectResult.sid}</td>
                            <td>Session ID - 使用者的登入工作階段識別碼</td>
                          </tr>
                        )}
                        {introspectResult.jti && (
                          <tr>
                            <td><strong>jti</strong></td>
                            <td className="value-cell">{introspectResult.jti}</td>
                            <td>JWT ID - 此 Token 的唯一識別碼</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'api' && (
            <div className="section">
              <h2>API 測試</h2>
              <div className="button-group">
                <Tooltip text="使用 Access Token 呼叫 UserInfo 端點，取得使用者的身份資訊">
                  <button onClick={getUserInfo} className="btn" disabled={!tokens?.access_token}>取得使用者資訊</button>
                </Tooltip>
              </div>

              {userInfo && (
                <div className="result">
                  <h3>使用者資訊</h3>
                  <pre>{JSON.stringify(userInfo, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="section">
              <h2>手動測試 - Authorization Code Flow</h2>
              <p className="section-desc">手動控制每個步驟，觀察完整的 OAuth 流程</p>

              <div className="manual-section">
                <h3>步驟 1: 準備參數</h3>
                <div className="manual-form">
                  <div className="form-row">
                    <label>Redirect URI:</label>
                    <input
                      type="text"
                      value={manualRedirectUri}
                      onChange={e => setManualRedirectUri(e.target.value)}
                      placeholder="http://localhost:3001/callback"
                    />
                  </div>
                  <div className="form-row">
                    <label>Scope:</label>
                    <input
                      type="text"
                      value={manualScope}
                      onChange={e => setManualScope(e.target.value)}
                      placeholder="openid profile email"
                    />
                  </div>
                  <div className="form-row">
                    <label>State:</label>
                    <div className="input-with-btn">
                      <input
                        type="text"
                        value={manualState}
                        onChange={e => setManualState(e.target.value)}
                        placeholder="隨機字串，用於防止 CSRF"
                      />
                      <button onClick={generateManualState} className="btn small">產生</button>
                    </div>
                  </div>
                  <div className="form-row">
                    <label>Prompt:</label>
                    <select value={manualPrompt} onChange={e => setManualPrompt(e.target.value)}>
                      <option value="">無 (使用 SSO Session)</option>
                      <option value="login">login (強制登入)</option>
                      <option value="consent">consent (強制同意)</option>
                      <option value="none">none (靜默驗證)</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <label>IdP (acr_values):</label>
                    <select value={manualIdp} onChange={e => setManualIdp(e.target.value)}>
                      <option value="">無 (使用預設登入)</option>
                      <option value="Google">Google</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="manual-section">
                <h3>步驟 2: PKCE (選用但建議)</h3>
                <div className="manual-form">
                  <div className="form-row">
                    <label>Code Verifier:</label>
                    <div className="input-with-btn">
                      <input
                        type="text"
                        value={manualCodeVerifier}
                        onChange={e => setManualCodeVerifier(e.target.value)}
                        placeholder="43-128 字元的隨機字串"
                      />
                      <button onClick={generateManualPkce} className="btn small">產生 PKCE</button>
                    </div>
                  </div>
                  <div className="form-row">
                    <label>Code Challenge:</label>
                    <input
                      type="text"
                      value={manualCodeChallenge}
                      readOnly
                      placeholder="SHA256(code_verifier) 的 Base64URL 編碼"
                      className="readonly"
                    />
                  </div>
                </div>
              </div>

              <div className="manual-section">
                <h3>步驟 3: 產生授權 URL</h3>
                <div className="button-group">
                  <button onClick={buildManualAuthUrl} className="btn primary">產生授權 URL</button>
                  <button onClick={goToManualAuthUrl} className="btn" disabled={!generatedAuthUrl}>前往授權</button>
                </div>
                {generatedAuthUrl && (
                  <div className="url-display">
                    <label>授權 URL:</label>
                    <textarea readOnly value={generatedAuthUrl} rows={4} />
                    <div className="url-params">
                      <h4>URL 參數解析:</h4>
                      <pre>{generatedAuthUrl.split('?')[1]?.split('&').join('\n')}</pre>
                    </div>
                  </div>
                )}
              </div>

              <div className="manual-section">
                <h3>步驟 4: 交換 Token</h3>
                <p className="hint">授權完成後，code 會自動填入下方欄位，點擊「交換 Token」即可</p>
                <div className="manual-form">
                  <div className="form-row">
                    <label>Authorization Code:</label>
                    <input
                      type="text"
                      value={manualAuthCode}
                      onChange={e => setManualAuthCode(e.target.value)}
                      placeholder="從回調 URL 取得的授權碼"
                    />
                  </div>
                </div>
                <div className="button-group">
                  <button onClick={exchangeManualToken} className="btn primary" disabled={!manualAuthCode}>交換 Token</button>
                </div>
                {manualTokenResponse && (
                  <div className="result">
                    <h3>Token Response</h3>
                    <pre>{JSON.stringify(manualTokenResponse, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'flow' && (
            <div className="section flow-section">
              <h2>OAuth 2.0 / OIDC 完整流程說明</h2>
              <p className="section-desc">
                本頁說明 Authorization Code Flow with PKCE 的完整流程，以及各端點的用途與 JWT Token 的特性。
              </p>

              {/* 流程總覽 */}
              <div className="flow-card">
                <h3>📋 流程總覽</h3>
                <div className="flow-steps">
                  <div className="flow-step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h4>Authorization Request</h4>
                      <p>使用者點擊登入，前端導向 <code>/connect/authorize</code></p>
                      <div className="step-params">
                        <span className="param">client_id</span>
                        <span className="param">redirect_uri</span>
                        <span className="param">scope</span>
                        <span className="param">state</span>
                        <span className="param">code_challenge</span>
                      </div>
                    </div>
                  </div>

                  <div className="flow-step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h4>使用者驗證</h4>
                      <p>IdentityServer 顯示登入頁面，使用者輸入帳密或選擇外部 IdP（如 Google）</p>
                    </div>
                  </div>

                  <div className="flow-step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h4>Authorization Response</h4>
                      <p>驗證成功，IdentityServer 導回 <code>redirect_uri?code=xxx&state=xxx</code></p>
                      <div className="step-params">
                        <span className="param success">code</span>
                        <span className="param">state</span>
                        <span className="param">session_state</span>
                      </div>
                    </div>
                  </div>

                  <div className="flow-step">
                    <div className="step-number">4</div>
                    <div className="step-content">
                      <h4>Token Request</h4>
                      <p>後端使用授權碼呼叫 <code>/connect/token</code> 交換 Token</p>
                      <div className="step-params">
                        <span className="param">code</span>
                        <span className="param">code_verifier</span>
                        <span className="param secret">client_secret</span>
                      </div>
                    </div>
                  </div>

                  <div className="flow-step">
                    <div className="step-number">5</div>
                    <div className="step-content">
                      <h4>Token Response</h4>
                      <p>IdentityServer 回傳 Access Token、Refresh Token、ID Token</p>
                      <div className="step-params">
                        <span className="param success">access_token</span>
                        <span className="param success">refresh_token</span>
                        <span className="param success">id_token</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* JWT Token 無狀態特性 */}
              <div className="flow-card warning">
                <h3>🔐 JWT Token 無狀態 (Stateless) 特性</h3>
                <div className="jwt-explanation">
                  <div className="jwt-structure">
                    <h4>JWT 結構</h4>
                    <div className="jwt-parts">
                      <div className="jwt-part header">
                        <span className="part-name">Header</span>
                        <code>{"{ \"alg\": \"RS256\", \"typ\": \"JWT\" }"}</code>
                      </div>
                      <div className="jwt-part payload">
                        <span className="part-name">Payload</span>
                        <code>{"{ \"sub\": \"user123\", \"exp\": 1234567890, ... }"}</code>
                      </div>
                      <div className="jwt-part signature">
                        <span className="part-name">Signature</span>
                        <code>RSASHA256(header + payload, privateKey)</code>
                      </div>
                    </div>
                  </div>

                  <div className="stateless-features">
                    <h4>無狀態的意義</h4>
                    <ul>
                      <li>
                        <strong>自包含 (Self-contained)</strong>
                        <p>Token 內含所有必要資訊（使用者 ID、權限、過期時間），驗證時不需查詢資料庫</p>
                      </li>
                      <li>
                        <strong>本地驗證</strong>
                        <p>資源伺服器只需公鑰即可驗證 Token 簽章，不需呼叫授權伺服器</p>
                      </li>
                      <li>
                        <strong>高效能</strong>
                        <p>無需網路請求即可完成驗證，適合高併發場景</p>
                      </li>
                      <li className="warning-item">
                        <strong>⚠️ 無法即時撤銷</strong>
                        <p>Token 一旦發行，在過期前都是有效的。即使呼叫 Revoke 端點，本地驗證仍會通過！</p>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 驗證方式比較 */}
              <div className="flow-card">
                <h3>🔍 Token 驗證方式比較</h3>
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>特性</th>
                      <th>本地驗證 (Local)</th>
                      <th>遠端驗證 (Introspection)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>驗證方式</td>
                      <td>使用 JWKS 公鑰驗證簽章</td>
                      <td>呼叫 /connect/introspect 端點</td>
                    </tr>
                    <tr>
                      <td>網路請求</td>
                      <td className="good">不需要（僅首次取 JWKS）</td>
                      <td className="bad">每次驗證都需要</td>
                    </tr>
                    <tr>
                      <td>驗證速度</td>
                      <td className="good">極快（毫秒級）</td>
                      <td className="bad">較慢（網路延遲）</td>
                    </tr>
                    <tr>
                      <td>偵測撤銷</td>
                      <td className="bad">❌ 無法偵測</td>
                      <td className="good">✅ 可以偵測</td>
                    </tr>
                    <tr>
                      <td>適用場景</td>
                      <td>一般 API、微服務</td>
                      <td>高安全性需求（如金融）</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 各端點說明 */}
              <div className="flow-card">
                <h3>🌐 OIDC 端點說明</h3>
                <div className="endpoint-list">
                  <div className="endpoint-item">
                    <div className="endpoint-header">
                      <span className="method get">GET</span>
                      <code>/.well-known/openid-configuration</code>
                    </div>
                    <p><strong>Discovery Document</strong> - OIDC 的起點，包含所有端點 URL 和支援的功能</p>
                  </div>

                  <div className="endpoint-item">
                    <div className="endpoint-header">
                      <span className="method get">GET</span>
                      <code>/connect/authorize</code>
                    </div>
                    <p><strong>Authorization Endpoint</strong> - 發起授權請求，導向使用者登入頁面</p>
                  </div>

                  <div className="endpoint-item">
                    <div className="endpoint-header">
                      <span className="method post">POST</span>
                      <code>/connect/token</code>
                    </div>
                    <p><strong>Token Endpoint</strong> - 使用授權碼交換 Token，或使用 Refresh Token 更新 Token</p>
                  </div>

                  <div className="endpoint-item">
                    <div className="endpoint-header">
                      <span className="method post">POST</span>
                      <code>/connect/introspect</code>
                    </div>
                    <p><strong>Introspection Endpoint</strong> - 向授權伺服器查詢 Token 狀態（遠端驗證）</p>
                  </div>

                  <div className="endpoint-item">
                    <div className="endpoint-header">
                      <span className="method post">POST</span>
                      <code>/connect/revocation</code>
                    </div>
                    <p><strong>Revocation Endpoint</strong> - 撤銷 Token，使其在 Introspection 中失效</p>
                  </div>

                  <div className="endpoint-item">
                    <div className="endpoint-header">
                      <span className="method get">GET</span>
                      <code>/connect/userinfo</code>
                    </div>
                    <p><strong>UserInfo Endpoint</strong> - 使用 Access Token 取得使用者資訊</p>
                  </div>

                  <div className="endpoint-item">
                    <div className="endpoint-header">
                      <span className="method get">GET</span>
                      <code>/connect/endsession</code>
                    </div>
                    <p><strong>End Session Endpoint</strong> - 登出，結束使用者的 SSO Session</p>
                  </div>

                  <div className="endpoint-item local">
                    <div className="endpoint-header">
                      <span className="method post">POST</span>
                      <code>/api/oidc/validate-local</code>
                    </div>
                    <p><strong>Local Validation</strong> - 使用 JWKS 公鑰本地驗證 JWT（本 Demo 提供）</p>
                  </div>
                </div>
              </div>

              {/* PKCE 說明 */}
              <div className="flow-card">
                <h3>🛡️ PKCE (Proof Key for Code Exchange)</h3>
                <div className="pkce-explanation">
                  <p>PKCE 用於防止授權碼攔截攻擊，特別適用於無法安全儲存 Client Secret 的公開客戶端。</p>
                  <div className="pkce-flow">
                    <div className="pkce-step">
                      <span className="step-label">1. 產生</span>
                      <code>code_verifier = random(43~128 chars)</code>
                    </div>
                    <div className="pkce-arrow">→</div>
                    <div className="pkce-step">
                      <span className="step-label">2. 雜湊</span>
                      <code>code_challenge = BASE64URL(SHA256(code_verifier))</code>
                    </div>
                    <div className="pkce-arrow">→</div>
                    <div className="pkce-step">
                      <span className="step-label">3. 授權</span>
                      <code>送出 code_challenge</code>
                    </div>
                    <div className="pkce-arrow">→</div>
                    <div className="pkce-step">
                      <span className="step-label">4. 交換</span>
                      <code>送出 code_verifier</code>
                    </div>
                  </div>
                  <p className="pkce-note">授權伺服器會驗證 SHA256(code_verifier) === code_challenge，確保是同一個客戶端發起的請求。</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'endpoints' && (
            <div className="section">
              <h2>OIDC 端點測試</h2>
              <p className="section-desc">
                驗證伺服器: <code>{config?.authority}</code>
              </p>

              {/* 回調資訊顯示 */}
              {callbackInfo && callbackInfo.source === 'endpoint' && (
                <div className="callback-info">
                  <div className="callback-header">
                    <h3>授權回調資訊</h3>
                    <button
                      onClick={() => setCallbackInfo(null)}
                      className="btn tiny secondary"
                    >
                      清除
                    </button>
                  </div>
                  <div className="callback-url">
                    <label>完整回調 URL:</label>
                    <textarea readOnly value={callbackInfo.fullUrl} rows={3} />
                  </div>
                  <div className="callback-params">
                    <label>回調參數:</label>
                    <table className="params-table">
                      <thead>
                        <tr>
                          <th>參數</th>
                          <th>值</th>
                          <th>說明</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(callbackInfo.params).map(([key, value]) => (
                          <tr key={key}>
                            <td><code>{key}</code></td>
                            <td className="value-cell">{value}</td>
                            <td className="desc-cell">
                              {key === 'code' && '授權碼，用於交換 Token（只能使用一次）'}
                              {key === 'state' && '原封不動回傳的 state，用於驗證請求來源'}
                              {key === 'session_state' && 'IdentityServer 的 Session 識別碼'}
                              {key === 'iss' && '發行者 (Issuer) URL'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="callback-hint">
                    授權碼已自動填入下方 Token Endpoint 的 <code>code</code> 參數，請點擊「執行」交換 Token
                  </p>
                </div>
              )}

              <div className="endpoints-list">
                {endpoints.map(endpoint => (
                  <div key={endpoint.id} className="endpoint-card">
                    <div className="endpoint-header">
                      <span className={`method-badge ${endpoint.method.toLowerCase()}`}>
                        {endpoint.method}
                      </span>
                      <span className="endpoint-path">{endpoint.path}</span>
                    </div>
                    <div className="endpoint-name">{endpoint.name}</div>
                    <p className="endpoint-desc">{endpoint.description}</p>

                    {endpoint.hasEditableParams && endpointParams[endpoint.id] && (
                      <div className="endpoint-params editable">
                        <h4>參數 (可編輯):</h4>
                        <div className="params-form">
                          {Object.entries(endpointParams[endpoint.id]).map(([key, value]) => (
                            <div key={key} className="param-row">
                              <div className="param-label-row">
                                <label>{key}:</label>
                                {paramDescriptions[endpoint.id]?.[key] && (
                                  <span className="param-desc">{paramDescriptions[endpoint.id][key]}</span>
                                )}
                              </div>
                              <div className="param-input-row">
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) => updateEndpointParam(endpoint.id, key, e.target.value)}
                                  className={value.startsWith('(需先') ? 'placeholder-hint' : ''}
                                />
                                {key === 'state' && (
                                  <button
                                    onClick={() => generateNewState(endpoint.id)}
                                    className="btn tiny"
                                    title="產生新的 state"
                                  >
                                    產生
                                  </button>
                                )}
                                {key === 'code_challenge' && (
                                  <button
                                    onClick={() => generateNewPkce(endpoint.id)}
                                    className="btn tiny"
                                    title="產生新的 PKCE (同時更新 code_verifier)"
                                  >
                                    產生 PKCE
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="endpoint-actions">
                      <button
                        onClick={() => executeEndpoint(endpoint)}
                        className="btn primary small"
                      >
                        執行
                      </button>
                      {endpoint.navigable && endpointResults[endpoint.id]?.url && (
                        <button
                          onClick={() => navigateToEndpoint(endpoint)}
                          className="btn small"
                        >
                          前往
                        </button>
                      )}
                      {endpoint.hasEditableParams && (
                        <button
                          onClick={() => resetEndpointParams(endpoint.id)}
                          className="btn small secondary"
                        >
                          重置參數
                        </button>
                      )}
                    </div>

                    {endpointResults[endpoint.id] && (
                      <div className="endpoint-result">
                        <h4>回應:</h4>
                        <pre>{JSON.stringify(endpointResults[endpoint.id], null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="panel logs">
          <div className="logs-header">
            <h2>操作日誌</h2>
            <button onClick={clearLogs} className="btn small">清除</button>
          </div>
          <div className="log-content">
            {logs.map((log, i) => (
              <div key={i} className="log-line">{log}</div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
