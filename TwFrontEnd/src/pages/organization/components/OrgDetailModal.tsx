/**
 * 組織詳情 Modal
 * UC Capital Identity Admin
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, User, Hash, MapPin, FileText, Calendar, Layers } from 'lucide-react';
import type { OrganizationTreeNode, OrganizationGroup } from '../../../types/organization';
import { isCeoNode } from '../../../types/organization';

interface OrgDetailModalProps {
    open: boolean;
    onClose: () => void;
    node: OrganizationTreeNode | OrganizationGroup | null;
}

// 資訊項目組件
function InfoItem({
    icon: Icon,
    label,
    value,
    highlight = false,
}: {
    icon: typeof Building2;
    label: string;
    value: string | number | null | undefined;
    highlight?: boolean;
}) {
    if (!value && value !== 0) return null;

    return (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="p-2 rounded-lg bg-white/5">
                <Icon size={16} className="text-[var(--color-text-muted)]" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--color-text-muted)] mb-0.5">{label}</p>
                <p
                    className={
                        highlight
                            ? 'text-sm font-semibold text-[var(--color-accent-gold)]'
                            : 'text-sm text-white'
                    }
                >
                    {value}
                </p>
            </div>
        </div>
    );
}

export function OrgDetailModal({ open, onClose, node }: OrgDetailModalProps) {
    if (!node) return null;

    const isCeo = 'children' in node ? isCeoNode(node as OrganizationTreeNode) : false;
    const displayName = node.deptZhName || node.name;
    const hasPath = 'path' in node && node.path;

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-[var(--color-bg-secondary)] border border-white/10 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header with gradient */}
                            <div
                                className={`relative px-6 py-8 ${
                                    isCeo
                                        ? 'bg-gradient-to-br from-amber-600/30 via-yellow-600/20 to-orange-600/30'
                                        : 'bg-gradient-to-br from-cyan-600/30 via-blue-600/20 to-indigo-600/30'
                                }`}
                            >
                                {/* Decorative elements */}
                                <div className="absolute inset-0 overflow-hidden">
                                    <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-white/5 blur-3xl" />
                                    <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
                                </div>

                                {/* Close button */}
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <X size={20} />
                                </button>

                                {/* Title */}
                                <div className="relative">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div
                                            className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                                                isCeo
                                                    ? 'bg-gradient-to-br from-amber-500 to-yellow-600'
                                                    : 'bg-gradient-to-br from-cyan-500 to-blue-600'
                                            }`}
                                        >
                                            <Building2 size={24} className="text-white" />
                                        </div>
                                        <div>
                                            {node.deptCode && (
                                                <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
                                                    {node.deptCode}
                                                </span>
                                            )}
                                            <h2 className="text-xl font-bold text-white">
                                                {displayName}
                                            </h2>
                                        </div>
                                    </div>
                                    {node.deptEName && (
                                        <p className="text-sm text-white/60 ml-15">
                                            {node.deptEName}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-3">
                                <InfoItem
                                    icon={User}
                                    label="部門主管"
                                    value={node.manager}
                                    highlight
                                />

                                <InfoItem
                                    icon={Hash}
                                    label="部門代碼"
                                    value={node.deptCode}
                                />

                                {hasPath && (
                                    <InfoItem
                                        icon={MapPin}
                                        label="組織路徑"
                                        value={(node as OrganizationGroup).path}
                                    />
                                )}

                                <InfoItem
                                    icon={Layers}
                                    label="層級深度"
                                    value={`第 ${node.depth + 1} 層`}
                                />

                                {'children' in node && node.children && (
                                    <InfoItem
                                        icon={Building2}
                                        label="下屬部門"
                                        value={`${node.children.length} 個子部門`}
                                    />
                                )}

                                <InfoItem
                                    icon={FileText}
                                    label="部門描述"
                                    value={node.description}
                                />

                                {'insDate' in node && (
                                    <InfoItem
                                        icon={Calendar}
                                        label="建立時間"
                                        value={new Date(
                                            (node as OrganizationGroup).insDate
                                        ).toLocaleDateString('zh-TW')}
                                    />
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02]">
                                <div className="flex justify-end">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                                    >
                                        關閉
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}

export default OrgDetailModal;
