/**
 * Permission Management Page
 * UC Capital Identity Admin
 *
 * 權限控管主頁面 - 使用標籤頁切換不同功能
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Key, Layers, Users, Building2, BarChart3 } from 'lucide-react';
import clsx from 'clsx';
import { permissionApi } from '@/services/permissionApi';
import type { PermissionStatsDto } from '@/types/permission';
import { ScopesTab } from './components/ScopesTab';
import { ResourcesTab } from './components/ResourcesTab';
import { UserPermissionsTab } from './components/UserPermissionsTab';
import { GroupPermissionsTab } from './components/GroupPermissionsTab';

type TabType = 'scopes' | 'resources' | 'users' | 'groups';

interface TabConfig {
    id: TabType;
    label: string;
    icon: React.ElementType;
    description: string;
}

const tabs: TabConfig[] = [
    { id: 'scopes', label: '權限範圍', icon: Key, description: '管理可授權的操作範圍（如：讀取、寫入、刪除）' },
    { id: 'resources', label: '受保護資源', icon: Layers, description: '管理系統中需要保護的資源（如：頁面、API、功能）' },
    { id: 'users', label: '使用者授權', icon: Users, description: '授予使用者對特定資源的存取權限' },
    { id: 'groups', label: '群組授權', icon: Building2, description: '授予群組對特定資源的存取權限（成員自動繼承）' },
];

export default function PermissionPage() {
    const [activeTab, setActiveTab] = useState<TabType>('scopes');
    const [stats, setStats] = useState<PermissionStatsDto | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const data = await permissionApi.getPermissionStats();
            setStats(data);
        } catch (error) {
            console.error('Failed to load permission stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'scopes':
                return <ScopesTab onUpdate={loadStats} />;
            case 'resources':
                return <ResourcesTab onUpdate={loadStats} />;
            case 'users':
                return <UserPermissionsTab onUpdate={loadStats} />;
            case 'groups':
                return <GroupPermissionsTab onUpdate={loadStats} />;
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
                        <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                            <Shield className="w-6 h-6 text-indigo-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">權限控管</h1>
                    </div>
                    <p className="text-[var(--color-text-secondary)] mt-2">
                        管理系統的資源授權和存取控制（基於 RBAC 模型）
                    </p>
                </motion.div>

                {/* Stats Cards */}
                <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-4"
                >
                    {!loading && stats && (
                        <>
                            <StatCard
                                icon={Key}
                                label="範圍"
                                value={stats.totalScopes}
                                color="text-amber-400"
                            />
                            <StatCard
                                icon={Layers}
                                label="資源"
                                value={stats.totalResources}
                                color="text-cyan-400"
                            />
                            <StatCard
                                icon={BarChart3}
                                label="授權"
                                value={stats.totalUserPermissions + stats.totalGroupPermissions}
                                color="text-green-400"
                            />
                        </>
                    )}
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

// Stat Card Component
function StatCard({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: React.ElementType;
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div className="flex items-center gap-3 px-4 py-2 bg-[rgba(255,255,255,0.03)] rounded-xl border border-[rgba(255,255,255,0.08)]">
            <Icon size={18} className={color} />
            <div>
                <div className="text-lg font-bold text-white">{value}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">{label}</div>
            </div>
        </div>
    );
}
