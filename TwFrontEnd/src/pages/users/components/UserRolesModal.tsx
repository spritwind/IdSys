/**
 * User Roles Modal
 * 管理使用者角色 Modal
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Shield, Check, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import * as userApi from '../../../services/userApi';
import type { UserListDto, RoleDto } from '../../../types/user';

interface Props {
    user: UserListDto;
    onClose: () => void;
    onSave: () => void;
}

export default function UserRolesModal({ user, onClose, onSave }: Props) {
    const [allRoles, setAllRoles] = useState<RoleDto[]>([]);
    const [userRoles, setUserRoles] = useState<string[]>([]);
    const [originalRoles, setOriginalRoles] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // 載入資料
    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [roles, currentRoles] = await Promise.all([
                    userApi.getRoles(),
                    userApi.getUserRoles(user.id),
                ]);
                setAllRoles(roles);
                const roleIds = currentRoles.map((r) => r.roleId);
                setUserRoles(roleIds);
                setOriginalRoles(roleIds);
            } catch (error) {
                toast.error('載入角色資料失敗');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [user.id]);

    // 切換角色
    const toggleRole = (roleId: string) => {
        if (userRoles.includes(roleId)) {
            setUserRoles(userRoles.filter((r) => r !== roleId));
        } else {
            setUserRoles([...userRoles, roleId]);
        }
    };

    // 儲存
    const handleSave = async () => {
        setSaving(true);
        try {
            await userApi.setUserRoles(user.id, userRoles);
            toast.success('角色已更新');
            onSave();
        } catch (error: any) {
            toast.error(error.response?.data?.message || '儲存失敗');
        } finally {
            setSaving(false);
        }
    };

    // 是否有變更
    const hasChanges = JSON.stringify(userRoles.sort()) !== JSON.stringify(originalRoles.sort());

    // 新增/移除的角色
    const addedRoles = userRoles.filter((r) => !originalRoles.includes(r));
    const removedRoles = originalRoles.filter((r) => !userRoles.includes(r));

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-800 border border-white/10 rounded-xl w-full max-w-md"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Shield className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">管理角色</h2>
                            <p className="text-sm text-gray-400">{user.displayName || user.userName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {allRoles.map((role) => {
                                const isSelected = userRoles.includes(role.id);
                                const isAdded = addedRoles.includes(role.id);
                                const isRemoved = removedRoles.includes(role.id);

                                return (
                                    <button
                                        key={role.id}
                                        onClick={() => toggleRole(role.id)}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                            isSelected
                                                ? 'bg-blue-500/20 border-blue-500/50'
                                                : 'bg-white/5 border-white/10 hover:border-white/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-5 h-5 rounded flex items-center justify-center ${
                                                    isSelected ? 'bg-blue-500' : 'bg-white/10'
                                                }`}
                                            >
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className={isSelected ? 'text-white' : 'text-gray-400'}>
                                                {role.name}
                                            </span>
                                        </div>
                                        {isAdded && (
                                            <span className="flex items-center gap-1 text-xs text-emerald-400">
                                                <Plus className="w-3 h-3" />
                                                新增
                                            </span>
                                        )}
                                        {isRemoved && (
                                            <span className="flex items-center gap-1 text-xs text-red-400">
                                                <Minus className="w-3 h-3" />
                                                移除
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* 變更摘要 */}
                    {hasChanges && (
                        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <p className="text-sm text-amber-400">
                                {addedRoles.length > 0 && (
                                    <span className="block">+ {addedRoles.length} 個角色將被新增</span>
                                )}
                                {removedRoles.length > 0 && (
                                    <span className="block">- {removedRoles.length} 個角色將被移除</span>
                                )}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Shield className="w-4 h-4" />
                        {saving ? '儲存中...' : '儲存變更'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
