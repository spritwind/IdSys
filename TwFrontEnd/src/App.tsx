/**
 * UC Capital Identity Admin
 * Main Application Entry Point
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import Overview from './pages/dashboard/Overview';
import OrganizationPage from './pages/organization/OrganizationPage';
import PermissionPage from './pages/permission/PermissionPage';
import { LoginPage, CallbackPage } from './pages/auth';
import { PlaceholderPage } from './components/features/PlaceholderPage';
import { DebugPanel } from './components/debug/DebugPanel';
import ClientsPage from './pages/clients/ClientsPage';
import ClientDetail from './pages/clients/ClientDetail';
import UsersPage from './pages/users/UsersPage';
import RolesPage from './pages/roles/RolesPage';
import {
    IdentityServerSettingsPage,
    ClientEditPage,
    ApiResourceEditPage,
    ApiScopeEditPage,
    IdentityResourceEditPage,
} from './pages/identity-server';
import TokenManagementPage from './pages/token-management/TokenManagementPage';
import GroupsPage from './pages/groups/GroupsPage';
import './index.css';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import {
    Globe,
    Layers,
    Lock,
    Shield,
    Key,
    KeyRound,
    FileText,
    AlertCircle,
} from 'lucide-react';

/* Landing Page Component */
function LandingPage() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[var(--color-bg-primary)]">
            {/* Dynamic Background Elements */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] z-0"
                style={{
                    background:
                        'radial-gradient(circle, var(--color-accent-primary) 0%, transparent 70%)',
                }}
            />
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 2,
                }}
                className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] z-0"
                style={{
                    background:
                        'radial-gradient(circle, var(--color-accent-secondary) 0%, transparent 70%)',
                }}
            />

            {/* Main Card */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="glass p-12 rounded-3xl flex flex-col items-center gap-8 max-w-[600px] mx-4 z-10 relative"
            >
                {/* Logo */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="w-28 h-28 flex-shrink-0 logo-gold-streamer-lg"
                >
                    <div className="w-full h-full rounded-2xl overflow-hidden flex items-center justify-center border border-white/10">
                        <img
                            src={`${import.meta.env.BASE_URL}images/logo_gold.png`}
                            alt="UC Capital Logo"
                            className="w-24 h-24 object-contain"
                        />
                    </div>
                </motion.div>

                {/* Brand Name */}
                <div className="text-center">
                    <h1 className="text-5xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                        優式資本
                    </h1>
                    <p className="text-lg tracking-[0.3em] text-[var(--color-text-muted)] mt-2 font-light">
                        UC CAPITAL
                    </p>
                </div>

                {/* Description */}
                <p className="text-center text-[var(--color-text-secondary)] text-lg leading-relaxed max-w-md">
                    企業級身份識別與存取管理平台
                    <br />
                    <span className="text-sm text-[var(--color-text-muted)] mt-2 block">
                        Identity Server 管理後台
                    </span>
                </p>

                {/* CTA Button */}
                <div className="flex gap-4 mt-2">
                    <motion.a
                        href={`${import.meta.env.BASE_URL}dashboard`}
                        className="btn-primary cursor-pointer group no-underline text-base px-8 py-3"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span>進入管理後台</span>
                        <ArrowRight
                            size={18}
                            className="group-hover:translate-x-1 transition-all"
                        />
                    </motion.a>
                </div>

                {/* Version Info */}
                <p className="text-xs text-[var(--color-text-muted)] mt-4">
                    Powered by 優式資訊帳務
                </p>
            </motion.div>
        </div>
    );
}

/* Placeholder Page Wrappers */
/* ClientsPage removed - using real component */

const ApiResourcesPage = () => (
    <PlaceholderPage
        title="API 資源"
        description="定義和管理受保護的 API 資源，設定存取範圍和權限。"
        icon={Layers}
    />
);

const ApiScopesPage = () => (
    <PlaceholderPage
        title="API 範圍"
        description="管理 API 存取範圍，定義細緻的權限控制策略。"
        icon={Lock}
    />
);

const IdentityResourcesPage = () => (
    <PlaceholderPage
        title="身份資源"
        description="管理使用者身份相關的聲明(Claims)，如個人資料、電子郵件等。"
        icon={Shield}
    />
);

/* UsersPage and RolesPage are now real components imported above */

const IdentityProvidersPage = () => (
    <PlaceholderPage
        title="外部身份提供者"
        description="設定外部 OAuth/OIDC 身份提供者，如 Google、Microsoft、Facebook 等。"
        icon={Globe}
    />
);

const GrantsPage = () => (
    <PlaceholderPage
        title="持久化授權"
        description="檢視和管理已發放的授權，包括存取權杖和刷新權杖。"
        icon={KeyRound}
    />
);

const KeysPage = () => (
    <PlaceholderPage
        title="加密金鑰"
        description="管理 JWT 簽章金鑰，檢視金鑰資訊和執行金鑰輪換。"
        icon={Key}
    />
);

const AuditLogsPage = () => (
    <PlaceholderPage
        title="稽核日誌"
        description="檢視系統操作記錄，追蹤管理員和使用者的活動歷史。"
        icon={FileText}
    />
);

const ErrorLogsPage = () => (
    <PlaceholderPage
        title="錯誤日誌"
        description="檢視系統錯誤記錄，包括例外狀況和堆疊追蹤資訊。"
        icon={AlertCircle}
    />
);

/**
 * Protected Layout - 包含 MainLayout 且需要認證
 */
function ProtectedLayout() {
    return (
        <ProtectedRoute>
            <MainLayout />
        </ProtectedRoute>
    );
}

function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
                {/* Debug Panel - 只在開發模式顯示 */}
                <DebugPanel />
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />

                    {/* Authentication Routes */}
                    <Route path="/auth/login" element={<LoginPage />} />
                    <Route path="/auth/callback" element={<CallbackPage />} />
                    <Route path="/auth/silent-renew" element={<CallbackPage />} />

                    {/* Protected Application Routes */}
                    <Route element={<ProtectedLayout />}>
                        {/* Dashboard */}
                        <Route path="/dashboard" element={<Overview />} />

                        {/* IdentityServer Configuration */}
                        <Route path="/identity-server-settings" element={<IdentityServerSettingsPage />} />
                        <Route path="/identity-server/clients/new" element={<ClientEditPage />} />
                        <Route path="/identity-server/clients/:id/edit" element={<ClientEditPage />} />
                        <Route path="/identity-server/api-resources/new" element={<ApiResourceEditPage />} />
                        <Route path="/identity-server/api-resources/:id/edit" element={<ApiResourceEditPage />} />
                        <Route path="/identity-server/api-scopes/new" element={<ApiScopeEditPage />} />
                        <Route path="/identity-server/api-scopes/:id/edit" element={<ApiScopeEditPage />} />
                        <Route path="/identity-server/identity-resources/new" element={<IdentityResourceEditPage />} />
                        <Route path="/identity-server/identity-resources/:id/edit" element={<IdentityResourceEditPage />} />

                        {/* Legacy routes for backward compatibility */}
                        <Route path="/clients" element={<ClientsPage />} />
                        <Route path="/clients/new" element={<ClientDetail />} />
                        <Route path="/clients/:id" element={<ClientDetail />} />
                        <Route path="/api-resources" element={<ApiResourcesPage />} />
                        <Route path="/api-resources/:id" element={<ApiResourcesPage />} />
                        <Route path="/api-scopes" element={<ApiScopesPage />} />
                        <Route path="/api-scopes/:id" element={<ApiScopesPage />} />
                        <Route path="/identity-resources" element={<IdentityResourcesPage />} />
                        <Route path="/identity-resources/:id" element={<IdentityResourcesPage />} />

                        {/* Identity Management */}
                        <Route path="/users" element={<UsersPage />} />
                        <Route path="/users/:id" element={<UsersPage />} />
                        <Route path="/roles" element={<RolesPage />} />
                        <Route path="/roles/:id" element={<RolesPage />} />

                        {/* Security */}
                        <Route path="/identity-providers" element={<IdentityProvidersPage />} />
                        <Route path="/identity-providers/:id" element={<IdentityProvidersPage />} />
                        <Route path="/grants" element={<GrantsPage />} />
                        <Route path="/grants/:id" element={<GrantsPage />} />
                        <Route path="/keys" element={<KeysPage />} />
                        <Route path="/token-management" element={<TokenManagementPage />} />

                        {/* Logs */}
                        <Route path="/logs/audit" element={<AuditLogsPage />} />
                        <Route path="/logs/errors" element={<ErrorLogsPage />} />

                        {/* Organization */}
                        <Route path="/organization" element={<OrganizationPage />} />

                        {/* Groups */}
                        <Route path="/groups" element={<GroupsPage />} />

                        {/* Permission Management */}
                        <Route path="/permissions" element={<PermissionPage />} />
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;
