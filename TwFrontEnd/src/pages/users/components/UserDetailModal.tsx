/**
 * User Detail/Edit Modal
 * 使用者詳情/編輯 Modal
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, User, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as userApi from '../../../services/userApi';
import type { UserDto, UpdateUserDto, UserClaimDto } from '../../../types/user';

interface Props {
    userId: string;
    onClose: () => void;
    onSave: () => void;
}

export default function UserDetailModal({ userId, onClose, onSave }: Props) {
    const [user, setUser] = useState<UserDto | null>(null);
    const [claims, setClaims] = useState<UserClaimDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'claims' | 'security'>('info');

    // 表單狀態
    const [formData, setFormData] = useState<Partial<UpdateUserDto>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    // 載入使用者資料
    useEffect(() => {
        async function loadUser() {
            setLoading(true);
            try {
                const [userData, claimsData] = await Promise.all([
                    userApi.getUserById(userId),
                    userApi.getUserClaims(userId),
                ]);
                setUser(userData);
                setClaims(claimsData);
                setFormData({
                    id: userData.id,
                    userName: userData.userName,
                    email: userData.email || '',
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    displayName: userData.displayName || '',
                    phoneNumber: userData.phoneNumber || '',
                    isActive: userData.isActive,
                    emailConfirmed: userData.emailConfirmed,
                    lockoutEnabled: userData.lockoutEnabled,
                    twoFactorEnabled: userData.twoFactorEnabled,
                });
            } catch (error) {
                toast.error('載入使用者資料失敗');
                onClose();
            } finally {
                setLoading(false);
            }
        }
        loadUser();
    }, [userId, onClose]);

    // 驗證表單
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.userName?.trim()) {
            newErrors.userName = '使用者名稱為必填';
        }
        if (!formData.email?.trim()) {
            newErrors.email = 'Email 為必填';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email 格式不正確';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 儲存
    const handleSave = async () => {
        if (!validate()) return;

        setSaving(true);
        try {
            await userApi.updateUser(userId, formData as UpdateUserDto);
            toast.success('使用者資料已更新');
            onSave();
        } catch (error: any) {
            toast.error(error.response?.data?.message || '儲存失敗');
        } finally {
            setSaving(false);
        }
    };

    // 刪除 Claim
    const handleDeleteClaim = async (claimId: number) => {
        try {
            await userApi.deleteUserClaim(userId, claimId);
            setClaims(claims.filter((c) => c.id !== claimId));
            toast.success('已刪除宣告');
        } catch (error) {
            toast.error('刪除失敗');
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-gray-800 rounded-xl p-8">
                    <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-800 border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xl font-bold">
                            {(user?.displayName || user?.userName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">
                                {user?.displayName || user?.userName}
                            </h2>
                            <p className="text-sm text-gray-400">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    {[
                        { id: 'info', label: '基本資料', icon: User },
                        { id: 'claims', label: '宣告', icon: Shield },
                        { id: 'security', label: '安全性', icon: AlertCircle },
                    ].map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id as any)}
                            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                                activeTab === id
                                    ? 'text-amber-400 border-b-2 border-amber-400 -mb-px'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'info' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">使用者名稱 *</label>
                                    <input
                                        type="text"
                                        value={formData.userName || ''}
                                        onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                                        className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white focus:outline-none focus:border-amber-500/50 ${
                                            errors.userName ? 'border-red-500' : 'border-white/10'
                                        }`}
                                    />
                                    {errors.userName && (
                                        <p className="text-red-400 text-xs mt-1">{errors.userName}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        value={formData.email || ''}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white focus:outline-none focus:border-amber-500/50 ${
                                            errors.email ? 'border-red-500' : 'border-white/10'
                                        }`}
                                    />
                                    {errors.email && (
                                        <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">名字</label>
                                    <input
                                        type="text"
                                        value={formData.firstName || ''}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">姓氏</label>
                                    <input
                                        type="text"
                                        value={formData.lastName || ''}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">顯示名稱</label>
                                <input
                                    type="text"
                                    value={formData.displayName || ''}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">電話</label>
                                <input
                                    type="tel"
                                    value={formData.phoneNumber || ''}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                                />
                            </div>

                            <div className="flex items-center gap-6 pt-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
                                    />
                                    <span className="text-sm text-gray-300">帳號啟用</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.emailConfirmed}
                                        onChange={(e) => setFormData({ ...formData, emailConfirmed: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
                                    />
                                    <span className="text-sm text-gray-300">Email 已驗證</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'claims' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400">使用者的宣告 (Claims)</p>
                            {claims.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">沒有宣告</p>
                            ) : (
                                <div className="space-y-2">
                                    {claims.map((claim) => (
                                        <div
                                            key={claim.id}
                                            className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                                        >
                                            <div>
                                                <p className="text-sm text-amber-400 font-mono">{claim.claimType}</p>
                                                <p className="text-sm text-gray-300">{claim.claimValue}</p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteClaim(claim.id)}
                                                className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.lockoutEnabled}
                                        onChange={(e) => setFormData({ ...formData, lockoutEnabled: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
                                    />
                                    <span className="text-sm text-gray-300">啟用鎖定機制</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.twoFactorEnabled}
                                        onChange={(e) => setFormData({ ...formData, twoFactorEnabled: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
                                    />
                                    <span className="text-sm text-gray-300">雙因素驗證</span>
                                </label>
                            </div>

                            {user && (
                                <div className="mt-6 p-4 bg-white/5 rounded-lg space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-400">登入失敗次數</span>
                                        <span className="text-sm text-white">{user.accessFailedCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-400">鎖定結束時間</span>
                                        <span className="text-sm text-white">
                                            {user.lockoutEnd
                                                ? new Date(user.lockoutEnd).toLocaleString('zh-TW')
                                                : '未鎖定'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-400">建立時間</span>
                                        <span className="text-sm text-white">
                                            {new Date(user.createdAt).toLocaleString('zh-TW')}
                                        </span>
                                    </div>
                                    {user.updatedAt && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">更新時間</span>
                                            <span className="text-sm text-white">
                                                {new Date(user.updatedAt).toLocaleString('zh-TW')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
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
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? '儲存中...' : '儲存變更'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
