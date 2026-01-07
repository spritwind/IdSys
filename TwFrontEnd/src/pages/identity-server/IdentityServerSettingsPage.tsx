/**
 * Identity Server Settings Page
 * UC Capital Identity Admin
 *
 * IdentityServer 設定管理頁面 - 包含客戶端、API資源、API範圍、身份資源
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings2, AppWindow, Database, Key, Users } from 'lucide-react';
import clsx from 'clsx';
import { ClientsTab } from './components/ClientsTab';
import { ApiResourcesTab } from './components/ApiResourcesTab';
import { ApiScopesTab } from './components/ApiScopesTab';
import { IdentityResourcesTab } from './components/IdentityResourcesTab';

type TabType = 'clients' | 'api-resources' | 'api-scopes' | 'identity-resources';

interface TabConfig {
    id: TabType;
    label: string;
    icon: React.ElementType;
    description: string;
}

const tabs: TabConfig[] = [
    {
        id: 'clients',
        label: '客戶端',
        icon: AppWindow,
        description: '管理 OAuth 2.0 / OpenID Connect 客戶端應用程式'
    },
    {
        id: 'api-resources',
        label: 'API 資源',
        icon: Database,
        description: '定義受保護的 API 資源和其允許的範圍'
    },
    {
        id: 'api-scopes',
        label: 'API 範圍',
        icon: Key,
        description: '定義 API 存取權限的範圍（Scopes）'
    },
    {
        id: 'identity-resources',
        label: '身份資源',
        icon: Users,
        description: '定義使用者身份資訊的資源（如 openid、profile、email）'
    },
];

export default function IdentityServerSettingsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('clients');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'clients':
                return <ClientsTab />;
            case 'api-resources':
                return <ApiResourcesTab />;
            case 'api-scopes':
                return <ApiScopesTab />;
            case 'identity-resources':
                return <IdentityResourcesTab />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                            <Settings2 className="w-6 h-6 text-cyan-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">IdentityServer 設定</h1>
                    </div>
                    <p className="text-[var(--color-text-secondary)] mt-2">
                        管理 OAuth 2.0 / OpenID Connect 的客戶端與資源配置
                    </p>
                </motion.div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex flex-wrap gap-2 p-1 bg-[rgba(255,255,255,0.02)] rounded-xl border border-[rgba(255,255,255,0.05)]">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                                isActive
                                    ? 'bg-[var(--color-accent-primary)] text-white shadow-lg shadow-indigo-500/25'
                                    : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
                            )}
                        >
                            <Icon size={18} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab Description */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-[var(--color-text-secondary)] px-1"
            >
                {tabs.find(t => t.id === activeTab)?.description}
            </motion.div>

            {/* Tab Content */}
            <motion.div
                key={activeTab + '-content'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {renderTabContent()}
            </motion.div>
        </div>
    );
}
