/**
 * Client Edit Page
 * UC Capital Identity Admin
 *
 * OAuth 2.0 / OpenID Connect 客戶端編輯頁面
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Save,
    Loader2,
    AppWindow,
    Settings,
    Clock,
    Shield,
    Link2,
    Key,
    ChevronDown,
    ChevronUp,
    X,
    AlertCircle,
} from 'lucide-react';
import { clientService } from '@/services/clientService';
import type { ClientApiDto } from '@/types/client';
import {
    defaultClient,
    GRANT_TYPE_OPTIONS,
    ACCESS_TOKEN_TYPE_OPTIONS,
    REFRESH_TOKEN_USAGE_OPTIONS,
    REFRESH_TOKEN_EXPIRATION_OPTIONS,
} from '@/types/client';

interface SectionProps {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

function Section({ title, icon: Icon, children, defaultOpen = true }: SectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--color-accent-primary)]/20 rounded-lg">
                        <Icon size={18} className="text-[var(--color-accent-primary)]" />
                    </div>
                    <span className="text-white font-medium">{title}</span>
                </div>
                {isOpen ? (
                    <ChevronUp size={18} className="text-[var(--color-text-secondary)]" />
                ) : (
                    <ChevronDown size={18} className="text-[var(--color-text-secondary)]" />
                )}
            </button>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 pt-0 border-t border-[rgba(255,255,255,0.05)]"
                >
                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {children}
                    </div>
                </motion.div>
            )}
        </div>
    );
}

interface FormFieldProps {
    label: string;
    description?: string;
    required?: boolean;
    fullWidth?: boolean;
    children: React.ReactNode;
}

function FormField({ label, description, required, fullWidth, children }: FormFieldProps) {
    return (
        <div className={`space-y-1.5 ${fullWidth ? 'md:col-span-2' : ''}`}>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>
            {children}
            {description && (
                <p className="text-xs text-[var(--color-text-secondary)] opacity-70">{description}</p>
            )}
        </div>
    );
}

interface TagInputProps {
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
}

function TagInput({ value, onChange, placeholder }: TagInputProps) {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const trimmed = inputValue.trim();
            if (trimmed && !value.includes(trimmed)) {
                onChange([...value, trimmed]);
            }
            setInputValue('');
        }
    };

    const removeTag = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {value.map((tag, index) => (
                    <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)] text-sm rounded-lg"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(index)}
                            className="hover:text-red-400 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </span>
                ))}
            </div>
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors text-sm"
            />
        </div>
    );
}

export default function ClientEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    // 當 id 為 undefined（新增頁面路由）或 'new' 時，視為新增模式
    const isNew = !id || id === 'new';

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<ClientApiDto>>(defaultClient);

    useEffect(() => {
        if (!isNew && id) {
            loadClient(parseInt(id));
        }
    }, [id, isNew]);

    const loadClient = async (clientId: number) => {
        try {
            setLoading(true);
            setError(null);
            const data = await clientService.getClient(clientId);
            setFormData(data);
        } catch (err) {
            console.error('Failed to load client:', err);
            setError('無法載入客戶端資料');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.clientId || !formData.clientName) {
            setError('請填寫必要欄位');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            if (isNew) {
                await clientService.createClient(formData as ClientApiDto);
            } else {
                await clientService.updateClient(formData as ClientApiDto);
            }

            navigate('/identity-server-settings');
        } catch (err) {
            console.error('Failed to save client:', err);
            setError('儲存失敗，請稍後再試');
        } finally {
            setSaving(false);
        }
    };

    const updateField = <K extends keyof ClientApiDto>(field: K, value: ClientApiDto[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-[var(--color-accent-primary)] animate-spin" />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/identity-server-settings')}
                        className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-[var(--color-text-secondary)] hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </motion.button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                            <AppWindow className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                {isNew ? '新增客戶端' : '編輯客戶端'}
                            </h1>
                            {!isNew && formData.clientId && (
                                <p className="text-sm text-[var(--color-text-secondary)]">{formData.clientId}</p>
                            )}
                        </div>
                    </div>
                </div>
                <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white font-medium shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all disabled:opacity-50"
                >
                    {saving ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Save size={18} />
                    )}
                    <span>{saving ? '儲存中...' : '儲存'}</span>
                </motion.button>
            </div>

            {/* Error Message */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400"
                >
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </motion.div>
            )}

            {/* Basic Information */}
            <Section title="基本資訊" icon={AppWindow}>
                <FormField label="客戶端 ID" required>
                    <input
                        type="text"
                        value={formData.clientId || ''}
                        onChange={(e) => updateField('clientId', e.target.value)}
                        disabled={!isNew}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors disabled:opacity-50"
                        placeholder="my-client"
                    />
                </FormField>
                <FormField label="客戶端名稱" required>
                    <input
                        type="text"
                        value={formData.clientName || ''}
                        onChange={(e) => updateField('clientName', e.target.value)}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                        placeholder="My Application"
                    />
                </FormField>
                <FormField label="描述" fullWidth>
                    <textarea
                        value={formData.description || ''}
                        onChange={(e) => updateField('description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors resize-none"
                        placeholder="客戶端應用程式的描述..."
                    />
                </FormField>
                <FormField label="客戶端 URI">
                    <input
                        type="url"
                        value={formData.clientUri || ''}
                        onChange={(e) => updateField('clientUri', e.target.value)}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                        placeholder="https://example.com"
                    />
                </FormField>
                <FormField label="Logo URI">
                    <input
                        type="url"
                        value={formData.logoUri || ''}
                        onChange={(e) => updateField('logoUri', e.target.value)}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                        placeholder="https://example.com/logo.png"
                    />
                </FormField>
                <FormField label="啟用狀態">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.enabled ?? true}
                            onChange={(e) => updateField('enabled', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)] focus:ring-offset-0"
                        />
                        <span className="text-white">啟用此客戶端</span>
                    </label>
                </FormField>
            </Section>

            {/* Grant Types and Scopes */}
            <Section title="授權與範圍" icon={Key}>
                <FormField label="授權類型" fullWidth description="選擇允許的 OAuth 2.0 授權流程">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {GRANT_TYPE_OPTIONS.map((option) => (
                            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.allowedGrantTypes?.includes(option.value) ?? false}
                                    onChange={(e) => {
                                        const current = formData.allowedGrantTypes || [];
                                        if (e.target.checked) {
                                            updateField('allowedGrantTypes', [...current, option.value]);
                                        } else {
                                            updateField('allowedGrantTypes', current.filter(g => g !== option.value));
                                        }
                                    }}
                                    className="w-4 h-4 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]"
                                />
                                <span className="text-sm text-white">{option.label}</span>
                            </label>
                        ))}
                    </div>
                </FormField>
                <FormField label="允許的範圍" fullWidth description="輸入後按 Enter 新增">
                    <TagInput
                        value={formData.allowedScopes || []}
                        onChange={(value) => updateField('allowedScopes', value)}
                        placeholder="openid, profile, email..."
                    />
                </FormField>
            </Section>

            {/* URIs */}
            <Section title="重新導向 URI" icon={Link2}>
                <FormField label="重新導向 URI" fullWidth description="登入成功後的回呼 URL">
                    <TagInput
                        value={formData.redirectUris || []}
                        onChange={(value) => updateField('redirectUris', value)}
                        placeholder="https://example.com/callback"
                    />
                </FormField>
                <FormField label="登出後重新導向 URI" fullWidth description="登出後的回呼 URL">
                    <TagInput
                        value={formData.postLogoutRedirectUris || []}
                        onChange={(value) => updateField('postLogoutRedirectUris', value)}
                        placeholder="https://example.com/signout-callback"
                    />
                </FormField>
                <FormField label="允許的 CORS 來源" fullWidth>
                    <TagInput
                        value={formData.allowedCorsOrigins || []}
                        onChange={(value) => updateField('allowedCorsOrigins', value)}
                        placeholder="https://example.com"
                    />
                </FormField>
            </Section>

            {/* Authentication Settings */}
            <Section title="驗證設定" icon={Shield} defaultOpen={false}>
                <FormField label="需要客戶端密鑰">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.requireClientSecret ?? true}
                            onChange={(e) => updateField('requireClientSecret', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-[var(--color-accent-primary)]"
                        />
                        <span className="text-white">需要密鑰</span>
                    </label>
                </FormField>
                <FormField label="需要 PKCE">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.requirePkce ?? false}
                            onChange={(e) => updateField('requirePkce', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-[var(--color-accent-primary)]"
                        />
                        <span className="text-white">啟用 PKCE</span>
                    </label>
                </FormField>
                <FormField label="允許純文字 PKCE">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.allowPlainTextPkce ?? false}
                            onChange={(e) => updateField('allowPlainTextPkce', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-[var(--color-accent-primary)]"
                        />
                        <span className="text-white">允許純文字</span>
                    </label>
                </FormField>
                <FormField label="啟用本機登入">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.enableLocalLogin ?? true}
                            onChange={(e) => updateField('enableLocalLogin', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-[var(--color-accent-primary)]"
                        />
                        <span className="text-white">啟用</span>
                    </label>
                </FormField>
                <FormField label="需要同意">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.requireConsent ?? true}
                            onChange={(e) => updateField('requireConsent', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-[var(--color-accent-primary)]"
                        />
                        <span className="text-white">需要同意</span>
                    </label>
                </FormField>
                <FormField label="記住同意選擇">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.allowRememberConsent ?? true}
                            onChange={(e) => updateField('allowRememberConsent', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-[var(--color-accent-primary)]"
                        />
                        <span className="text-white">記住選擇</span>
                    </label>
                </FormField>
            </Section>

            {/* Token Settings */}
            <Section title="權杖設定" icon={Settings} defaultOpen={false}>
                <FormField label="Access Token 類型">
                    <select
                        value={formData.accessTokenType ?? 0}
                        onChange={(e) => updateField('accessTokenType', parseInt(e.target.value))}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                    >
                        {ACCESS_TOKEN_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </FormField>
                <FormField label="Refresh Token 使用方式">
                    <select
                        value={formData.refreshTokenUsage ?? 1}
                        onChange={(e) => updateField('refreshTokenUsage', parseInt(e.target.value))}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                    >
                        {REFRESH_TOKEN_USAGE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </FormField>
                <FormField label="Refresh Token 過期方式">
                    <select
                        value={formData.refreshTokenExpiration ?? 1}
                        onChange={(e) => updateField('refreshTokenExpiration', parseInt(e.target.value))}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                    >
                        {REFRESH_TOKEN_EXPIRATION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </FormField>
                <FormField label="允許離線存取">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.allowOfflineAccess ?? false}
                            onChange={(e) => updateField('allowOfflineAccess', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-[var(--color-accent-primary)]"
                        />
                        <span className="text-white">允許 Refresh Token</span>
                    </label>
                </FormField>
                <FormField label="允許透過瀏覽器取得 Access Token">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.allowAccessTokensViaBrowser ?? false}
                            onChange={(e) => updateField('allowAccessTokensViaBrowser', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-[var(--color-accent-primary)]"
                        />
                        <span className="text-white">允許</span>
                    </label>
                </FormField>
                <FormField label="包含 JWT ID">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.includeJwtId ?? false}
                            onChange={(e) => updateField('includeJwtId', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-[var(--color-accent-primary)]"
                        />
                        <span className="text-white">包含</span>
                    </label>
                </FormField>
            </Section>

            {/* Token Lifetimes */}
            <Section title="權杖有效期間" icon={Clock} defaultOpen={false}>
                <FormField label="Identity Token 有效期間（秒）">
                    <input
                        type="number"
                        value={formData.identityTokenLifetime ?? 300}
                        onChange={(e) => updateField('identityTokenLifetime', parseInt(e.target.value))}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                    />
                </FormField>
                <FormField label="Access Token 有效期間（秒）">
                    <input
                        type="number"
                        value={formData.accessTokenLifetime ?? 3600}
                        onChange={(e) => updateField('accessTokenLifetime', parseInt(e.target.value))}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                    />
                </FormField>
                <FormField label="Authorization Code 有效期間（秒）">
                    <input
                        type="number"
                        value={formData.authorizationCodeLifetime ?? 300}
                        onChange={(e) => updateField('authorizationCodeLifetime', parseInt(e.target.value))}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                    />
                </FormField>
                <FormField label="Refresh Token 絕對有效期間（秒）">
                    <input
                        type="number"
                        value={formData.absoluteRefreshTokenLifetime ?? 2592000}
                        onChange={(e) => updateField('absoluteRefreshTokenLifetime', parseInt(e.target.value))}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                    />
                </FormField>
                <FormField label="Refresh Token 滑動有效期間（秒）">
                    <input
                        type="number"
                        value={formData.slidingRefreshTokenLifetime ?? 1296000}
                        onChange={(e) => updateField('slidingRefreshTokenLifetime', parseInt(e.target.value))}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                    />
                </FormField>
                <FormField label="Device Code 有效期間（秒）">
                    <input
                        type="number"
                        value={formData.deviceCodeLifetime ?? 300}
                        onChange={(e) => updateField('deviceCodeLifetime', parseInt(e.target.value))}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                    />
                </FormField>
            </Section>

            {/* Logout URIs */}
            <Section title="登出設定" icon={Link2} defaultOpen={false}>
                <FormField label="前端通道登出 URI">
                    <input
                        type="url"
                        value={formData.frontChannelLogoutUri || ''}
                        onChange={(e) => updateField('frontChannelLogoutUri', e.target.value)}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                        placeholder="https://example.com/signout"
                    />
                </FormField>
                <FormField label="前端通道需要 Session">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.frontChannelLogoutSessionRequired ?? true}
                            onChange={(e) => updateField('frontChannelLogoutSessionRequired', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-[var(--color-accent-primary)]"
                        />
                        <span className="text-white">需要</span>
                    </label>
                </FormField>
                <FormField label="後端通道登出 URI">
                    <input
                        type="url"
                        value={formData.backChannelLogoutUri || ''}
                        onChange={(e) => updateField('backChannelLogoutUri', e.target.value)}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                        placeholder="https://example.com/backchannel-signout"
                    />
                </FormField>
                <FormField label="後端通道需要 Session">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.backChannelLogoutSessionRequired ?? true}
                            onChange={(e) => updateField('backChannelLogoutSessionRequired', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-[var(--color-accent-primary)]"
                        />
                        <span className="text-white">需要</span>
                    </label>
                </FormField>
            </Section>
        </form>
    );
}
