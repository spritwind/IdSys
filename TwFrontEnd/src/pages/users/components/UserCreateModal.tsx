/**
 * Create User Modal
 * 新增使用者 Modal
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, UserPlus, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as userApi from '../../../services/userApi';
import type { CreateUserDto, RoleDto } from '../../../types/user';

interface Props {
    onClose: () => void;
    onCreated: () => void;
}

export default function UserCreateModal({ onClose, onCreated }: Props) {
    const [roles, setRoles] = useState<RoleDto[]>([]);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // 表單狀態
    const [formData, setFormData] = useState<CreateUserDto>({
        userName: '',
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        displayName: '',
        phoneNumber: '',
        isActive: true,
        emailConfirmed: false,
        roles: [],
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    // 載入角色
    useEffect(() => {
        async function loadRoles() {
            try {
                const rolesData = await userApi.getRoles();
                setRoles(rolesData);
            } catch (error) {
                console.error('Failed to load roles:', error);
            }
        }
        loadRoles();
    }, []);

    // 驗證表單
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.userName?.trim()) {
            newErrors.userName = '使用者名稱為必填';
        } else if (formData.userName.length < 3) {
            newErrors.userName = '使用者名稱至少需要 3 個字元';
        }

        if (!formData.email?.trim()) {
            newErrors.email = 'Email 為必填';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email 格式不正確';
        }

        if (!formData.password) {
            newErrors.password = '密碼為必填';
        } else if (formData.password.length < 6) {
            newErrors.password = '密碼至少需要 6 個字元';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = '密碼不一致';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 處理角色選擇
    const toggleRole = (roleId: string) => {
        const currentRoles = formData.roles || [];
        if (currentRoles.includes(roleId)) {
            setFormData({
                ...formData,
                roles: currentRoles.filter((r) => r !== roleId),
            });
        } else {
            setFormData({
                ...formData,
                roles: [...currentRoles, roleId],
            });
        }
    };

    // 儲存
    const handleCreate = async () => {
        if (!validate()) return;

        setSaving(true);
        try {
            await userApi.createUser(formData);
            toast.success('使用者已建立');
            onCreated();
        } catch (error: any) {
            const message = error.response?.data?.message || '建立失敗';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-800 border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <UserPlus className="w-5 h-5 text-amber-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">新增使用者</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* 使用者名稱 */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">使用者名稱 *</label>
                        <input
                            type="text"
                            value={formData.userName}
                            onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                            placeholder="輸入使用者名稱"
                            className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 ${
                                errors.userName ? 'border-red-500' : 'border-white/10'
                            }`}
                        />
                        {errors.userName && (
                            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errors.userName}
                            </p>
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Email *</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="user@example.com"
                            className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 ${
                                errors.email ? 'border-red-500' : 'border-white/10'
                            }`}
                        />
                        {errors.email && (
                            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errors.email}
                            </p>
                        )}
                    </div>

                    {/* 姓名 */}
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

                    {/* 顯示名稱 */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">顯示名稱</label>
                        <input
                            type="text"
                            value={formData.displayName || ''}
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                        />
                    </div>

                    {/* 密碼 */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">密碼 *</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="輸入密碼"
                                className={`w-full px-3 py-2 pr-10 bg-white/5 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 ${
                                    errors.password ? 'border-red-500' : 'border-white/10'
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errors.password}
                            </p>
                        )}
                    </div>

                    {/* 確認密碼 */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">確認密碼 *</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                placeholder="再次輸入密碼"
                                className={`w-full px-3 py-2 pr-10 bg-white/5 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 ${
                                    errors.confirmPassword ? 'border-red-500' : 'border-white/10'
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errors.confirmPassword}
                            </p>
                        )}
                    </div>

                    {/* 角色選擇 */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">指派角色</label>
                        <div className="flex flex-wrap gap-2">
                            {roles.map((role) => (
                                <button
                                    key={role.id}
                                    onClick={() => toggleRole(role.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                        formData.roles?.includes(role.id)
                                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                                            : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/30'
                                    }`}
                                >
                                    {formData.roles?.includes(role.id) && <Check className="w-3 h-3" />}
                                    {role.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 選項 */}
                    <div className="flex items-center gap-6 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
                            />
                            <span className="text-sm text-gray-300">立即啟用帳號</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.emailConfirmed}
                                onChange={(e) => setFormData({ ...formData, emailConfirmed: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
                            />
                            <span className="text-sm text-gray-300">略過 Email 驗證</span>
                        </label>
                    </div>
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
                        onClick={handleCreate}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        <UserPlus className="w-4 h-4" />
                        {saving ? '建立中...' : '建立使用者'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
