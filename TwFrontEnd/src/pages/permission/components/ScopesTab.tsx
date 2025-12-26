/**
 * Scopes Tab Component
 * UC Capital Identity Admin
 *
 * 權限範圍顯示標籤頁 (使用新架構 v2 API)
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Key, RefreshCw, Info } from 'lucide-react';
import * as permissionV2Api from '@/services/permissionV2Api';
import type { PermissionScopeDto } from '@/types/permissionV2';
import { SCOPE_NAMES } from '@/types/permissionV2';

interface ScopesTabProps {
    onUpdate?: () => void;
}

export function ScopesTab({ onUpdate: _onUpdate }: ScopesTabProps) {
    const [scopes, setScopes] = useState<PermissionScopeDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadScopes();
    }, []);

    const loadScopes = async () => {
        try {
            setLoading(true);
            const data = await permissionV2Api.getScopes();
            setScopes(data);
        } catch (error) {
            console.error('Failed to load scopes:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredScopes = scopes.filter(scope =>
        scope.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scope.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scope.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                    <p className="text-sm text-blue-300">
                        權限範圍定義了可對資源執行的操作類型。這些範圍在系統設定中預先定義，
                        可在授予權限時選擇適用的範圍。
                    </p>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-[var(--color-text-secondary)] group-focus-within:text-[var(--color-accent-primary)] transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="搜尋權限範圍..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-12 pl-10 pr-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)] transition-all"
                    />
                </div>

                {/* Refresh Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={loadScopes}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl text-[var(--color-text-secondary)] hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all disabled:opacity-50"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    <span>重新整理</span>
                </motion.button>
            </div>

            {/* Scopes Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 text-[var(--color-accent-primary)] animate-spin" />
                </div>
            ) : filteredScopes.length === 0 ? (
                <div className="text-center py-12">
                    <Key className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-secondary)] opacity-50" />
                    <p className="text-[var(--color-text-secondary)]">
                        {searchTerm ? '沒有找到符合的權限範圍' : '尚未定義任何權限範圍'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredScopes.map((scope, index) => (
                        <motion.div
                            key={scope.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl hover:border-amber-500/30 transition-colors group"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-amber-500/20 rounded-lg">
                                    <Key size={20} className="text-amber-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-lg font-bold text-amber-400 uppercase">
                                            {scope.code}
                                        </span>
                                    </div>
                                    <p className="text-white font-medium mt-1">
                                        {scope.name || SCOPE_NAMES[scope.code] || scope.code}
                                    </p>
                                    {scope.description && (
                                        <p className="text-sm text-[var(--color-text-secondary)] mt-2 line-clamp-2">
                                            {scope.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
