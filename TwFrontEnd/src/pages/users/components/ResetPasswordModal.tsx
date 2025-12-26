/**
 * Reset Password Modal
 * 重設密碼 Modal
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Key, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as userApi from '../../../services/userApi';
import type { UserListDto } from '../../../types/user';

interface Props {
    user: UserListDto;
    onClose: () => void;
}

export default function ResetPasswordModal({ user, onClose }: Props) {
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.newPassword) {
            newErrors.newPassword = '密碼為必填';
        } else if (formData.newPassword.length < 6) {
            newErrors.newPassword = '密碼至少需要 6 個字元';
        }

        if (formData.newPassword !== formData.confirmPassword) {
            newErrors.confirmPassword = '密碼不一致';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleReset = async () => {
        if (!validate()) return;

        setSaving(true);
        try {
            await userApi.resetPassword({
                userId: user.id,
                newPassword: formData.newPassword,
                confirmPassword: formData.confirmPassword,
            });
            toast.success('密碼已重設');
            onClose();
        } catch (error: any) {
            const message = error.response?.data?.message || '重設密碼失敗';
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
                className="bg-gray-800 border border-white/10 rounded-xl w-full max-w-md"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <Key className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">重設密碼</h2>
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
                <div className="p-6 space-y-4">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <p className="text-sm text-amber-400">
                            此操作將直接重設使用者的密碼，使用者需使用新密碼登入。
                        </p>
                    </div>

                    {/* 新密碼 */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">新密碼 *</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={formData.newPassword}
                                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                placeholder="輸入新密碼"
                                className={`w-full px-3 py-2 pr-10 bg-white/5 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 ${
                                    errors.newPassword ? 'border-red-500' : 'border-white/10'
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
                        {errors.newPassword && (
                            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errors.newPassword}
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
                                placeholder="再次輸入新密碼"
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
                        onClick={handleReset}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Key className="w-4 h-4" />
                        {saving ? '重設中...' : '重設密碼'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
