/**
 * Roles Management Page
 * UC Capital Identity Admin
 *
 * 角色管理頁面
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    Plus,
    Edit,
    Trash2,
    Users,
    Search,
    RefreshCw,
    MoreVertical,
    X,
    Save,
    AlertCircle,
    Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import * as userApi from '../../services/userApi';
import type { RoleDto, CreateRoleDto, UpdateRoleDto, UserListDto } from '../../types/user';
import RolePermissionsModal from './components/RolePermissionsModal';

// 角色編輯 Modal
function RoleEditModal({
    role,
    onClose,
    onSave,
}: {
    role: RoleDto | null;
    onClose: () => void;
    onSave: () => void;
}) {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<CreateRoleDto | UpdateRoleDto>({
        id: role?.id || '',
        name: role?.name || '',
        description: role?.description || '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isEdit = !!role;

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.name?.trim()) {
            newErrors.name = '角色名稱為必填';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;

        setSaving(true);
        try {
            if (isEdit) {
                await userApi.updateRole(role.id, formData as UpdateRoleDto);
                toast.success('角色已更新');
            } else {
                await userApi.createRole(formData as CreateRoleDto);
                toast.success('角色已建立');
            }
            onSave();
        } catch (error: any) {
            toast.error(error.response?.data?.message || '儲存失敗');
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
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Shield className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">
                            {isEdit ? '編輯角色' : '新增角色'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">角色名稱 *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="輸入角色名稱"
                            className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 ${
                                errors.name ? 'border-red-500' : 'border-white/10'
                            }`}
                        />
                        {errors.name && (
                            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errors.name}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">描述</label>
                        <textarea
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="角色描述（選填）"
                            rows={3}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none"
                        />
                    </div>
                </div>

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
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? '儲存中...' : '儲存'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// 角色使用者 Modal
function RoleUsersModal({
    role,
    onClose,
}: {
    role: RoleDto;
    onClose: () => void;
}) {
    const [users, setUsers] = useState<UserListDto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadUsers() {
            setLoading(true);
            try {
                const usersData = await userApi.getRoleUsers(role.id);
                setUsers(usersData);
            } catch (error) {
                toast.error('載入使用者失敗');
            } finally {
                setLoading(false);
            }
        }
        loadUsers();
    }, [role.id]);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-800 border border-white/10 rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">角色成員</h2>
                            <p className="text-sm text-gray-400">{role.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            沒有使用者擁有此角色
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                                        {(user.displayName || user.userName).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">
                                            {user.displayName || user.userName}
                                        </p>
                                        <p className="text-sm text-gray-400">{user.email}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end px-6 py-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                        關閉
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// 刪除確認 Modal
function DeleteRoleModal({
    role,
    onClose,
    onConfirm,
}: {
    role: RoleDto;
    onClose: () => void;
    onConfirm: () => void;
}) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await userApi.deleteRole(role.id);
            toast.success('角色已刪除');
            onConfirm();
        } catch (error: any) {
            toast.error(error.response?.data?.message || '刪除失敗');
        } finally {
            setDeleting(false);
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
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">刪除角色</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-gray-300">
                        確定要刪除角色「<span className="text-white font-medium">{role.name}</span>」嗎？
                    </p>
                    {role.userCount && role.userCount > 0 && (
                        <p className="text-amber-400 text-sm mt-2">
                            ⚠️ 有 {role.userCount} 位使用者擁有此角色，刪除後將自動移除。
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Trash2 className="w-4 h-4" />
                        {deleting ? '刪除中...' : '確認刪除'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default function RolesPage() {
    const [roles, setRoles] = useState<RoleDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal 狀態
    const [showEditModal, setShowEditModal] = useState(false);
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [selectedRole, setSelectedRole] = useState<RoleDto | null>(null);
    const [actionMenuRole, setActionMenuRole] = useState<string | null>(null);

    // 載入資料 - 加強防禦性檢查
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const rolesData = await userApi.getRoles();
            // 確保 API 回傳的是陣列
            setRoles(Array.isArray(rolesData) ? rolesData : []);
        } catch (error) {
            toast.error('載入角色失敗');
            setRoles([]); // 發生錯誤時設為空陣列
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // 篩選角色 - 確保 roles 是陣列
    const filteredRoles = Array.isArray(roles) ? roles.filter(
        (role) =>
            role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            role.description?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    // 操作
    const handleCreate = () => {
        setSelectedRole(null);
        setShowEditModal(true);
    };

    const handleEdit = (role: RoleDto) => {
        setSelectedRole(role);
        setShowEditModal(true);
        setActionMenuRole(null);
    };

    const handleViewUsers = (role: RoleDto) => {
        setSelectedRole(role);
        setShowUsersModal(true);
        setActionMenuRole(null);
    };

    const handleDelete = (role: RoleDto) => {
        setSelectedRole(role);
        setShowDeleteModal(true);
        setActionMenuRole(null);
    };

    const handleManagePermissions = (role: RoleDto) => {
        setSelectedRole(role);
        setShowPermissionsModal(true);
        setActionMenuRole(null);
    };

    return (
        <div className="space-y-6">
            {/* 頁面標題 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Shield className="w-7 h-7 text-blue-400" />
                        角色管理
                    </h1>
                    <p className="text-gray-400 mt-1">管理系統角色與權限分組</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    新增角色
                </button>
            </div>

            {/* 搜尋 */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜尋角色名稱..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
                        />
                    </div>
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        重新整理
                    </button>
                </div>
            </div>

            {/* 角色列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full flex items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                    </div>
                ) : filteredRoles.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-400">
                        <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        {searchTerm ? '沒有找到符合的角色' : '尚未建立任何角色'}
                    </div>
                ) : (
                    filteredRoles.map((role) => (
                        <motion.div
                            key={role.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:border-blue-500/30 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/20 rounded-lg">
                                        <Shield className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium">{role.name}</h3>
                                        {role.userCount !== undefined && (
                                            <p className="text-sm text-gray-400 flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {role.userCount} 位使用者
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="relative">
                                    <button
                                        onClick={() =>
                                            setActionMenuRole(actionMenuRole === role.id ? null : role.id)
                                        }
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <MoreVertical className="w-4 h-4 text-gray-400" />
                                    </button>

                                    <AnimatePresence>
                                        {actionMenuRole === role.id && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-white/10 rounded-lg shadow-xl z-10 overflow-hidden"
                                            >
                                                <button
                                                    onClick={() => handleEdit(role)}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/10"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                    編輯
                                                </button>
                                                <button
                                                    onClick={() => handleViewUsers(role)}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/10"
                                                >
                                                    <Users className="w-4 h-4" />
                                                    查看成員
                                                </button>
                                                <button
                                                    onClick={() => handleManagePermissions(role)}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/10"
                                                >
                                                    <Lock className="w-4 h-4" />
                                                    管理權限
                                                </button>
                                                <div className="border-t border-white/10" />
                                                <button
                                                    onClick={() => handleDelete(role)}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    刪除
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {role.description && (
                                <p className="text-sm text-gray-400 line-clamp-2">{role.description}</p>
                            )}
                        </motion.div>
                    ))
                )}
            </div>

            {/* 點擊外部關閉選單 */}
            {actionMenuRole && (
                <div className="fixed inset-0 z-0" onClick={() => setActionMenuRole(null)} />
            )}

            {/* Modals */}
            <AnimatePresence>
                {showEditModal && (
                    <RoleEditModal
                        role={selectedRole}
                        onClose={() => {
                            setShowEditModal(false);
                            setSelectedRole(null);
                        }}
                        onSave={() => {
                            setShowEditModal(false);
                            setSelectedRole(null);
                            loadData();
                        }}
                    />
                )}

                {showUsersModal && selectedRole && (
                    <RoleUsersModal
                        role={selectedRole}
                        onClose={() => {
                            setShowUsersModal(false);
                            setSelectedRole(null);
                        }}
                    />
                )}

                {showDeleteModal && selectedRole && (
                    <DeleteRoleModal
                        role={selectedRole}
                        onClose={() => {
                            setShowDeleteModal(false);
                            setSelectedRole(null);
                        }}
                        onConfirm={() => {
                            setShowDeleteModal(false);
                            setSelectedRole(null);
                            loadData();
                        }}
                    />
                )}

                {showPermissionsModal && selectedRole && (
                    <RolePermissionsModal
                        role={selectedRole}
                        onClose={() => {
                            setShowPermissionsModal(false);
                            setSelectedRole(null);
                        }}
                        onSave={() => {
                            setShowPermissionsModal(false);
                            setSelectedRole(null);
                            loadData();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
