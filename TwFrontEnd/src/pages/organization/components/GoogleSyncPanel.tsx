/**
 * Google Workspace 同步面板
 * UC Capital Identity Admin
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Cloud,
    ChevronDown,
    ChevronUp,
    Activity,
    Eye,
    Building2,
    Users,
    PlayCircle,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import {
    googleSyncApi,
    type GoogleSyncPreviewDto,
    type GoogleSyncResultDto,
    type GoogleSyncHealthDto,
} from '../../../services/googleSyncApi';

interface SyncActionButtonProps {
    icon: typeof Activity;
    label: string;
    description: string;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'default' | 'primary' | 'warning';
}

function SyncActionButton({
    icon: Icon,
    label,
    description,
    onClick,
    loading,
    disabled,
    variant = 'default',
}: SyncActionButtonProps) {
    const variantStyles = {
        default: 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20',
        primary: 'bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20 hover:border-indigo-500/50',
        warning: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50',
    };

    const iconStyles = {
        default: 'text-cyan-400',
        primary: 'text-indigo-400',
        warning: 'text-amber-400',
    };

    return (
        <button
            onClick={onClick}
            disabled={loading || disabled}
            className={clsx(
                'flex items-start gap-3 p-4 rounded-xl border transition-all text-left w-full',
                variantStyles[variant],
                (loading || disabled) && 'opacity-50 cursor-not-allowed'
            )}
        >
            <div className={clsx('p-2 rounded-lg bg-white/5', iconStyles[variant])}>
                {loading ? (
                    <Loader2 size={20} className="animate-spin" />
                ) : (
                    <Icon size={20} />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-white">{label}</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{description}</p>
            </div>
        </button>
    );
}

export function GoogleSyncPanel({ onSyncComplete }: { onSyncComplete?: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState<string | null>(null);
    const [healthStatus, setHealthStatus] = useState<GoogleSyncHealthDto | null>(null);
    const [previewData, setPreviewData] = useState<GoogleSyncPreviewDto | null>(null);
    const [lastResult, setLastResult] = useState<GoogleSyncResultDto | null>(null);

    // 健康檢查
    const handleHealthCheck = async () => {
        setLoading('health');
        try {
            const result = await googleSyncApi.healthCheck();
            setHealthStatus(result);
            if (result.status === 'healthy') {
                toast.success('Google API 連線正常', { description: result.message });
            } else {
                toast.error('Google API 連線異常', { description: result.error });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : '連線失敗';
            toast.error('健康檢查失敗', { description: message });
        } finally {
            setLoading(null);
        }
    };

    // 預覽同步
    const handlePreview = async () => {
        setLoading('preview');
        try {
            const result = await googleSyncApi.preview();
            setPreviewData(result);
            toast.success('預覽完成', {
                description: `發現 ${result.organizationsFromGoogle} 個組織、${result.membersFromGoogle} 個人員`,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : '預覽失敗';
            toast.error('預覽失敗', { description: message });
        } finally {
            setLoading(null);
        }
    };

    // 同步組織架構
    const handleSyncOrganizations = async () => {
        setLoading('organizations');
        try {
            const result = await googleSyncApi.syncOrganizations();
            setLastResult(result);
            if (result.success) {
                toast.success('組織架構同步完成', {
                    description: `新增 ${result.organizationsCreated}、更新 ${result.organizationsUpdated}、停用 ${result.organizationsDisabled}`,
                });
                onSyncComplete?.();
            } else {
                toast.error('同步失敗', { description: result.message });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : '同步失敗';
            toast.error('組織架構同步失敗', { description: message });
        } finally {
            setLoading(null);
        }
    };

    // 同步人員對應
    const handleSyncMembers = async () => {
        setLoading('members');
        try {
            const result = await googleSyncApi.syncMembers();
            setLastResult(result);
            if (result.success) {
                toast.success('人員對應同步完成', {
                    description: `同步 ${result.membersSynced} 人、失敗 ${result.membersFailed} 人`,
                });
                onSyncComplete?.();
            } else {
                toast.error('同步失敗', { description: result.message });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : '同步失敗';
            toast.error('人員對應同步失敗', { description: message });
        } finally {
            setLoading(null);
        }
    };

    // 完整同步
    const handleFullSync = async () => {
        setLoading('full');
        try {
            const result = await googleSyncApi.fullSync({
                syncOrganizations: true,
                syncMembers: true,
                dryRun: false,
            });
            setLastResult(result);
            if (result.success) {
                toast.success('完整同步完成', {
                    description: `組織: +${result.organizationsCreated}/~${result.organizationsUpdated}、人員: ${result.membersSynced}`,
                });
                onSyncComplete?.();
            } else {
                toast.error('同步失敗', { description: result.message });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : '同步失敗';
            toast.error('完整同步失敗', { description: message });
        } finally {
            setLoading(null);
        }
    };

    const isLoading = loading !== null;

    return (
        <div className="glass rounded-xl border border-white/5 overflow-hidden">
            {/* 標題列 */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                        <Cloud size={20} className="text-blue-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-semibold text-white">Google Workspace 同步</h3>
                        <p className="text-sm text-[var(--color-text-muted)]">
                            從 Google Workspace 同步組織架構與人員
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {healthStatus && (
                        <div
                            className={clsx(
                                'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
                                healthStatus.status === 'healthy'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-red-500/10 text-red-400'
                            )}
                        >
                            {healthStatus.status === 'healthy' ? (
                                <CheckCircle2 size={12} />
                            ) : (
                                <XCircle size={12} />
                            )}
                            {healthStatus.status === 'healthy' ? '已連線' : '未連線'}
                        </div>
                    )}
                    {expanded ? (
                        <ChevronUp size={20} className="text-[var(--color-text-muted)]" />
                    ) : (
                        <ChevronDown size={20} className="text-[var(--color-text-muted)]" />
                    )}
                </div>
            </button>

            {/* 展開內容 */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 pt-0 space-y-4">
                            {/* 操作按鈕 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <SyncActionButton
                                    icon={Activity}
                                    label="健康檢查"
                                    description="測試 Google API 連線狀態"
                                    onClick={handleHealthCheck}
                                    loading={loading === 'health'}
                                    disabled={isLoading}
                                />
                                <SyncActionButton
                                    icon={Eye}
                                    label="預覽同步"
                                    description="查看將同步的內容（不寫入）"
                                    onClick={handlePreview}
                                    loading={loading === 'preview'}
                                    disabled={isLoading}
                                />
                                <SyncActionButton
                                    icon={Building2}
                                    label="同步組織架構"
                                    description="僅同步組織單位結構"
                                    onClick={handleSyncOrganizations}
                                    loading={loading === 'organizations'}
                                    disabled={isLoading}
                                    variant="primary"
                                />
                                <SyncActionButton
                                    icon={Users}
                                    label="同步人員對應"
                                    description="僅同步人員與組織對應"
                                    onClick={handleSyncMembers}
                                    loading={loading === 'members'}
                                    disabled={isLoading}
                                    variant="primary"
                                />
                                <SyncActionButton
                                    icon={PlayCircle}
                                    label="完整同步"
                                    description="同步組織架構 + 人員對應"
                                    onClick={handleFullSync}
                                    loading={loading === 'full'}
                                    disabled={isLoading}
                                    variant="warning"
                                />
                            </div>

                            {/* 預覽結果 */}
                            {previewData && (
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                                        <Eye size={16} className="text-cyan-400" />
                                        預覽結果
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <p className="text-[var(--color-text-muted)]">Google 組織</p>
                                            <p className="text-xl font-bold text-white">{previewData.organizationsFromGoogle}</p>
                                        </div>
                                        <div>
                                            <p className="text-[var(--color-text-muted)]">Google 人員</p>
                                            <p className="text-xl font-bold text-white">{previewData.membersFromGoogle}</p>
                                        </div>
                                        <div>
                                            <p className="text-[var(--color-text-muted)]">現有組織</p>
                                            <p className="text-xl font-bold text-white">{previewData.existingOrganizations}</p>
                                        </div>
                                        <div>
                                            <p className="text-[var(--color-text-muted)]">現有人員</p>
                                            <p className="text-xl font-bold text-white">{previewData.existingMembers}</p>
                                        </div>
                                    </div>

                                    {/* 組織架構路徑 */}
                                    {previewData.organizationPaths.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-sm text-[var(--color-text-muted)] mb-2 flex items-center gap-2">
                                                <Building2 size={14} />
                                                組織架構路徑 ({previewData.organizationPaths.length} 個)
                                            </p>
                                            <div className="max-h-64 overflow-auto rounded-lg bg-black/20 p-3 space-y-1">
                                                {previewData.organizationPaths.map((path, i) => {
                                                    const depth = path.split('/').filter(Boolean).length;
                                                    const name = path.split('/').filter(Boolean).pop() || '/';
                                                    return (
                                                        <div
                                                            key={i}
                                                            className="flex items-center text-sm font-mono"
                                                            style={{ paddingLeft: `${(depth - 1) * 16}px` }}
                                                        >
                                                            <span className="text-cyan-400/60 mr-2">
                                                                {depth === 1 ? '📁' : '├─'}
                                                            </span>
                                                            <span className="text-white/80">{name}</span>
                                                            <span className="text-white/30 ml-2 text-xs">{path}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {previewData.warnings.length > 0 && (
                                        <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                            <p className="text-sm text-amber-400 flex items-center gap-2">
                                                <AlertTriangle size={14} />
                                                {previewData.warnings.length} 個警告
                                            </p>
                                            <ul className="mt-2 text-xs text-amber-300/70 space-y-1 max-h-24 overflow-auto">
                                                {previewData.warnings.slice(0, 5).map((w, i) => (
                                                    <li key={i}>• {w}</li>
                                                ))}
                                                {previewData.warnings.length > 5 && (
                                                    <li>... 還有 {previewData.warnings.length - 5} 個警告</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 同步結果 */}
                            {lastResult && (
                                <div
                                    className={clsx(
                                        'p-4 rounded-xl border',
                                        lastResult.success
                                            ? 'bg-emerald-500/10 border-emerald-500/20'
                                            : 'bg-red-500/10 border-red-500/20'
                                    )}
                                >
                                    <h4
                                        className={clsx(
                                            'font-medium mb-3 flex items-center gap-2',
                                            lastResult.success ? 'text-emerald-400' : 'text-red-400'
                                        )}
                                    >
                                        {lastResult.success ? (
                                            <CheckCircle2 size={16} />
                                        ) : (
                                            <XCircle size={16} />
                                        )}
                                        {lastResult.success ? '同步成功' : '同步失敗'}
                                    </h4>
                                    <p className="text-sm text-white/80 mb-3">{lastResult.message}</p>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                        <div>
                                            <p className="text-[var(--color-text-muted)]">新增組織</p>
                                            <p className="text-lg font-bold text-emerald-400">+{lastResult.organizationsCreated}</p>
                                        </div>
                                        <div>
                                            <p className="text-[var(--color-text-muted)]">更新組織</p>
                                            <p className="text-lg font-bold text-blue-400">~{lastResult.organizationsUpdated}</p>
                                        </div>
                                        <div>
                                            <p className="text-[var(--color-text-muted)]">同步人員</p>
                                            <p className="text-lg font-bold text-white">{lastResult.membersSynced}</p>
                                        </div>
                                        <div>
                                            <p className="text-[var(--color-text-muted)]">失敗人員</p>
                                            <p className={`text-lg font-bold ${lastResult.membersFailed > 0 ? 'text-red-400' : 'text-white/50'}`}>
                                                {lastResult.membersFailed}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[var(--color-text-muted)]">耗時</p>
                                            <p className="text-lg font-bold text-white">{lastResult.durationMs}ms</p>
                                        </div>
                                    </div>

                                    {/* 顯示失敗的 Email 清單 */}
                                    {lastResult.failedEmails && lastResult.failedEmails.length > 0 && (
                                        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                            <p className="text-sm text-red-400 flex items-center gap-2 mb-2">
                                                <XCircle size={14} />
                                                {lastResult.failedEmails.length} 位人員同步失敗
                                                <span className="text-red-300/60 text-xs">（Email 在 Users 表中不存在或未啟用）</span>
                                            </p>
                                            <div className="max-h-32 overflow-auto rounded bg-black/20 p-2">
                                                <ul className="text-xs text-red-300/80 space-y-1 font-mono">
                                                    {lastResult.failedEmails.map((email, i) => (
                                                        <li key={i}>• {email}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default GoogleSyncPanel;
