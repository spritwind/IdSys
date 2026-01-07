/**
 * Users Management Page
 * UC Capital Identity Admin
 *
 * 使用者管理頁面 - 含組織架構分群顯示
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Search,
    Plus,
    Filter,
    RefreshCw,
    UserCheck,
    UserX,
    Lock,
    Mail,
    MoreVertical,
    Edit,
    Trash2,
    Key,
    Shield,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    X,
    Check,
    Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import * as userApi from '../../services/userApi';
import { organizationApi } from '../../services/organizationApi';
import type { UserListDto, RoleDto, UserSearchParams, UserStatsDto } from '../../types/user';
import type { OrganizationTreeNode, OrganizationMember } from '../../types/organization';
import UserDetailModal from './components/UserDetailModal';
import UserCreateModal from './components/UserCreateModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import UserRolesModal from './components/UserRolesModal';
import UserPermissionsModal from './components/UserPermissionsModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';

// 統計卡片組件
function StatCard({ icon: Icon, label, value, color }: {
    icon: React.ElementType;
    label: string;
    value: number | undefined;
    color: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${color}`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="text-sm text-gray-400">{label}</p>
                    <p className="text-2xl font-semibold text-white">{(value ?? 0).toLocaleString()}</p>
                </div>
            </div>
        </motion.div>
    );
}

// 狀態徽章
function StatusBadge({ isActive, locked }: { isActive: boolean; locked: boolean }) {
    if (locked) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                <Lock className="w-3 h-3" />
                鎖定
            </span>
        );
    }
    if (isActive) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Check className="w-3 h-3" />
                啟用
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
            <X className="w-3 h-3" />
            停用
        </span>
    );
}

// 角色徽章
function RoleBadge({ role }: { role: string }) {
    const isAdmin = role.toLowerCase().includes('admin');
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            isAdmin
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
        }`}>
            {role}
        </span>
    );
}

export default function UsersPage() {
    // 狀態
    const [users, setUsers] = useState<UserListDto[]>([]);
    const [roles, setRoles] = useState<RoleDto[]>([]);
    const [stats, setStats] = useState<UserStatsDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);

    // 組織架構
    const [organizations, setOrganizations] = useState<OrganizationTreeNode[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<OrganizationTreeNode | null>(null);

    // 搜尋與篩選
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [showFilters, setShowFilters] = useState(false);

    // Modal 狀態
    const [selectedUser, setSelectedUser] = useState<UserListDto | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [showRolesModal, setShowRolesModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [actionMenuUser, setActionMenuUser] = useState<string | null>(null);

    // 載入組織架構（只載入一次）
    useEffect(() => {
        const loadOrganizations = async () => {
            try {
                const orgsData = await organizationApi.getOrganizationTree();
                setOrganizations(orgsData);
            } catch (error) {
                console.error('Failed to load organizations:', error);
            }
        };
        loadOrganizations();
    }, []);

    // 將組織成員轉換為使用者列表格式
    const convertMemberToUserList = (member: OrganizationMember): UserListDto => ({
        id: member.userId,
        userName: member.userName,
        email: member.email || '',
        displayName: member.displayName || member.userName,
        isActive: true, // 組織成員預設為啟用
        emailConfirmed: true,
        createdAt: member.joinedAt || new Date().toISOString(),
        roles: [], // 需要另外查詢使用者角色
    });

    // 載入資料
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // 載入角色列表
            const rolesResult = await userApi.getRoles();
            setRoles(rolesResult);

            // 載入統計（首次載入時）
            if (!stats) {
                const statsResult = await userApi.getUserStats();
                setStats(statsResult);
            }

            // 根據是否選擇組織決定載入方式
            if (selectedOrg) {
                // 使用組織成員 API
                const members = await organizationApi.getMembers(selectedOrg.id);

                // 轉換為 UserListDto 格式
                let userList = members.map(convertMemberToUserList);

                // 前端篩選（搜尋、角色、狀態）
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    userList = userList.filter(u =>
                        u.userName.toLowerCase().includes(term) ||
                        (u.email?.toLowerCase().includes(term)) ||
                        (u.displayName?.toLowerCase().includes(term))
                    );
                }

                if (filterRole) {
                    userList = userList.filter(u => u.roles.some(r => r === filterRole));
                }

                // 分頁
                const startIdx = (currentPage - 1) * pageSize;
                const paginatedUsers = userList.slice(startIdx, startIdx + pageSize);

                setUsers(paginatedUsers);
                setTotalCount(userList.length);
            } else {
                // 無組織選擇時，使用一般使用者 API
                const params: UserSearchParams = {
                    search: searchTerm || undefined,
                    roleId: filterRole || undefined,
                    isActive: filterStatus === 'active' ? true : filterStatus === 'inactive' ? false : undefined,
                    page: currentPage,
                    pageSize,
                };

                const usersResult = await userApi.getUsers(params);
                setUsers(usersResult.items);
                setTotalCount(usersResult.totalCount);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            toast.error('載入使用者資料失敗');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, filterRole, filterStatus, selectedOrg, currentPage, pageSize, stats]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // 選擇組織
    const handleSelectOrg = (org: OrganizationTreeNode | null) => {
        setSelectedOrg(org);
        setCurrentPage(1);
    };

    // 搜尋防抖
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // 操作處理
    const handleViewUser = (user: UserListDto) => {
        setSelectedUser(user);
        setShowDetailModal(true);
        setActionMenuUser(null);
    };

    const handleResetPassword = (user: UserListDto) => {
        setSelectedUser(user);
        setShowResetPasswordModal(true);
        setActionMenuUser(null);
    };

    const handleManageRoles = (user: UserListDto) => {
        setSelectedUser(user);
        setShowRolesModal(true);
        setActionMenuUser(null);
    };

    const handleManagePermissions = (user: UserListDto) => {
        setSelectedUser(user);
        setShowPermissionsModal(true);
        setActionMenuUser(null);
    };

    const handleDeleteUser = (user: UserListDto) => {
        setSelectedUser(user);
        setShowDeleteModal(true);
        setActionMenuUser(null);
    };

    const handleToggleActive = async (user: UserListDto) => {
        try {
            if (user.isActive) {
                await userApi.deactivateUser(user.id);
                toast.success(`已停用 ${user.displayName || user.userName}`);
            } else {
                await userApi.activateUser(user.id);
                toast.success(`已啟用 ${user.displayName || user.userName}`);
            }
            loadData();
        } catch (error) {
            toast.error('操作失敗');
        }
        setActionMenuUser(null);
    };

    const handleUnlock = async (user: UserListDto) => {
        try {
            await userApi.unlockUser(user.id);
            toast.success(`已解鎖 ${user.displayName || user.userName}`);
            loadData();
        } catch (error) {
            toast.error('解鎖失敗');
        }
        setActionMenuUser(null);
    };

    const confirmDelete = async () => {
        if (!selectedUser) return;
        try {
            await userApi.deleteUser(selectedUser.id);
            toast.success(`已刪除 ${selectedUser.displayName || selectedUser.userName}`);
            setShowDeleteModal(false);
            setSelectedUser(null);
            loadData();
        } catch (error) {
            toast.error('刪除失敗');
        }
    };

    // 分頁
    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="space-y-6">
            {/* 頁面標題 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Users className="w-7 h-7 text-amber-400" />
                        使用者管理
                    </h1>
                    <p className="text-gray-400 mt-1">管理系統使用者、角色與權限</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    新增使用者
                </button>
            </div>

            {/* 統計卡片 */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Users} label="總使用者" value={stats.totalUsers} color="bg-blue-500" />
                    <StatCard icon={UserCheck} label="啟用中" value={stats.activeUsers} color="bg-emerald-500" />
                    <StatCard icon={UserX} label="已停用" value={stats.inactiveUsers} color="bg-gray-500" />
                    <StatCard icon={Lock} label="已鎖定" value={stats.lockedUsers} color="bg-red-500" />
                </div>
            )}

            {/* 搜尋與篩選 */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* 組織選擇 */}
                    <div className="relative min-w-[200px]">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={selectedOrg?.id || ''}
                            onChange={(e) => {
                                const orgId = e.target.value;
                                if (!orgId) {
                                    handleSelectOrg(null);
                                } else {
                                    // 在組織樹中尋找對應的節點
                                    const findOrg = (nodes: OrganizationTreeNode[]): OrganizationTreeNode | null => {
                                        for (const node of nodes) {
                                            if (node.id === orgId) return node;
                                            if (node.children?.length) {
                                                const found = findOrg(node.children);
                                                if (found) return found;
                                            }
                                        }
                                        return null;
                                    };
                                    const org = findOrg(organizations);
                                    if (org) handleSelectOrg(org);
                                }
                            }}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
                        >
                            <option value="" className="bg-gray-800">全部組織</option>
                            {(() => {
                                // 扁平化組織樹並加入縮排
                                const flattenOrgs = (nodes: OrganizationTreeNode[], depth = 0): { id: string; name: string; depth: number }[] => {
                                    const result: { id: string; name: string; depth: number }[] = [];
                                    for (const node of nodes) {
                                        result.push({ id: node.id, name: node.name, depth });
                                        if (node.children?.length) {
                                            result.push(...flattenOrgs(node.children, depth + 1));
                                        }
                                    }
                                    return result;
                                };
                                return flattenOrgs(organizations).map((org) => (
                                    <option key={org.id} value={org.id} className="bg-gray-800">
                                        {'　'.repeat(org.depth)}{org.name}
                                    </option>
                                ));
                            })()}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>

                    {/* 搜尋框 */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜尋使用者名稱、Email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50"
                        />
                    </div>

                    {/* 篩選按鈕 */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                            showFilters
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        篩選
                    </button>

                    {/* 重新整理 */}
                    <button
                        onClick={() => loadData()}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        重新整理
                    </button>
                </div>

                {/* 篩選選項 */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
                                {/* 角色篩選 */}
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">角色</label>
                                    <select
                                        value={filterRole}
                                        onChange={(e) => {
                                            setFilterRole(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                                    >
                                        <option value="">全部角色</option>
                                        {roles.map((role) => (
                                            <option key={role.id} value={role.id}>
                                                {role.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 狀態篩選 */}
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">狀態</label>
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => {
                                            setFilterStatus(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                                    >
                                        <option value="">全部狀態</option>
                                        <option value="active">啟用中</option>
                                        <option value="inactive">已停用</option>
                                    </select>
                                </div>

                                {/* 清除篩選 */}
                                <div className="flex items-end">
                                    <button
                                        onClick={() => {
                                            setFilterRole('');
                                            setFilterStatus('');
                                            setSearchTerm('');
                                            setCurrentPage(1);
                                        }}
                                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        清除篩選
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 使用者列表 */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">使用者</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Email</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">角色</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">狀態</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">建立時間</th>
                                <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        載入中...
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        沒有找到使用者
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-medium">
                                                    {(user.displayName || user.userName).charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">
                                                        {user.displayName || user.userName}
                                                    </p>
                                                    <p className="text-sm text-gray-400">{user.userName}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-300">{user.email || '-'}</span>
                                                {user.emailConfirmed && (
                                                    <span title="已驗證">
                                                        <Mail className="w-4 h-4 text-emerald-400" />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {user.roles.length > 0 ? (
                                                    user.roles.slice(0, 2).map((role) => (
                                                        <RoleBadge key={role} role={role} />
                                                    ))
                                                ) : (
                                                    <span className="text-gray-500 text-sm">無角色</span>
                                                )}
                                                {user.roles.length > 2 && (
                                                    <span className="text-xs text-gray-400">
                                                        +{user.roles.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge
                                                isActive={user.isActive}
                                                locked={!!user.lockoutEnd && new Date(user.lockoutEnd) > new Date()}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">
                                            {new Date(user.createdAt).toLocaleDateString('zh-TW')}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="relative">
                                                <button
                                                    onClick={() => setActionMenuUser(actionMenuUser === user.id ? null : user.id)}
                                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                >
                                                    <MoreVertical className="w-4 h-4 text-gray-400" />
                                                </button>

                                                {/* 操作選單 */}
                                                <AnimatePresence>
                                                    {actionMenuUser === user.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                            className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-white/10 rounded-lg shadow-xl z-10 overflow-hidden"
                                                        >
                                                            <button
                                                                onClick={() => handleViewUser(user)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                                檢視/編輯
                                                            </button>
                                                            <button
                                                                onClick={() => handleManageRoles(user)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                                                            >
                                                                <Shield className="w-4 h-4" />
                                                                管理角色
                                                            </button>
                                                            <button
                                                                onClick={() => handleManagePermissions(user)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                                                            >
                                                                <Lock className="w-4 h-4" />
                                                                管理權限
                                                            </button>
                                                            <button
                                                                onClick={() => handleResetPassword(user)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                                                            >
                                                                <Key className="w-4 h-4" />
                                                                重設密碼
                                                            </button>
                                                            <div className="border-t border-white/10" />
                                                            <button
                                                                onClick={() => handleToggleActive(user)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                                                            >
                                                                {user.isActive ? (
                                                                    <>
                                                                        <UserX className="w-4 h-4" />
                                                                        停用帳號
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <UserCheck className="w-4 h-4" />
                                                                        啟用帳號
                                                                    </>
                                                                )}
                                                            </button>
                                                            {user.lockoutEnd && new Date(user.lockoutEnd) > new Date() && (
                                                                <button
                                                                    onClick={() => handleUnlock(user)}
                                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-amber-400 hover:bg-white/10 transition-colors"
                                                                >
                                                                    <Lock className="w-4 h-4" />
                                                                    解除鎖定
                                                                </button>
                                                            )}
                                                            <div className="border-t border-white/10" />
                                                            <button
                                                                onClick={() => handleDeleteUser(user)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                刪除使用者
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 分頁 */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                        <p className="text-sm text-gray-400">
                            共 {totalCount} 筆，第 {currentPage} / {totalPages} 頁
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4 text-gray-400" />
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const page = currentPage <= 3
                                    ? i + 1
                                    : currentPage >= totalPages - 2
                                        ? totalPages - 4 + i
                                        : currentPage - 2 + i;
                                if (page < 1 || page > totalPages) return null;
                                return (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                                            page === currentPage
                                                ? 'bg-amber-500 text-gray-900'
                                                : 'hover:bg-white/10 text-gray-400'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 點擊外部關閉選單 */}
            {actionMenuUser && (
                <div className="fixed inset-0 z-0" onClick={() => setActionMenuUser(null)} />
            )}

            {/* Modals */}
            {showDetailModal && selectedUser && (
                <UserDetailModal
                    userId={selectedUser.id}
                    onClose={() => {
                        setShowDetailModal(false);
                        setSelectedUser(null);
                    }}
                    onSave={() => {
                        setShowDetailModal(false);
                        setSelectedUser(null);
                        loadData();
                    }}
                />
            )}

            {showCreateModal && (
                <UserCreateModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        setShowCreateModal(false);
                        loadData();
                    }}
                />
            )}

            {showResetPasswordModal && selectedUser && (
                <ResetPasswordModal
                    user={selectedUser}
                    onClose={() => {
                        setShowResetPasswordModal(false);
                        setSelectedUser(null);
                    }}
                />
            )}

            {showRolesModal && selectedUser && (
                <UserRolesModal
                    user={selectedUser}
                    onClose={() => {
                        setShowRolesModal(false);
                        setSelectedUser(null);
                    }}
                    onSave={() => {
                        setShowRolesModal(false);
                        setSelectedUser(null);
                        loadData();
                    }}
                />
            )}

            {showPermissionsModal && selectedUser && (
                <UserPermissionsModal
                    user={selectedUser}
                    onClose={() => {
                        setShowPermissionsModal(false);
                        setSelectedUser(null);
                    }}
                    onSave={() => {
                        setShowPermissionsModal(false);
                        setSelectedUser(null);
                        loadData();
                    }}
                />
            )}

            {showDeleteModal && selectedUser && (
                <DeleteConfirmModal
                    title="刪除使用者"
                    message={`確定要刪除使用者「${selectedUser.displayName || selectedUser.userName}」嗎？此操作無法復原。`}
                    onConfirm={confirmDelete}
                    onCancel={() => {
                        setShowDeleteModal(false);
                        setSelectedUser(null);
                    }}
                />
            )}
        </div>
    );
}
