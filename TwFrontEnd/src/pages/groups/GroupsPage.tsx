/**
 * 群組管理頁面
 * UC Capital Identity Admin
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Search, RefreshCw, Filter, ChevronLeft, ChevronRight,
    Plus, MoreVertical, Pencil, Trash2, UserPlus, UserMinus, X,
    FolderTree, Crown, User, Star, Briefcase, Hash,
    Lock, Save, Loader2, AlertCircle, ChevronDown, CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    getGroups, getGroupStats, deleteGroup, getGroupMembers,
    removeGroupMember, createGroup, updateGroup, batchAddGroupMembers,
    GROUP_TYPE_LABELS,
    type GroupDto, type GroupStatsDto, type GroupMemberDetailDto,
    type CreateGroupDto, type UpdateGroupDto,
} from '../../services/groupApi';
import { getUsers, getRoles } from '../../services/userApi';
import type { UserListDto, RoleDto } from '../../types/user';
import * as permissionV2Api from '../../services/permissionV2Api';
import type {
    PermissionResourceDto,
    PermissionDto,
    PermissionScopeDto,
} from '../../types/permissionV2';
import { SUBJECT_TYPES } from '../../types/permissionV2';

// Group type icon mapping
const GROUP_TYPE_ICONS: Record<string, typeof Users> = {
    Organization: FolderTree,
    Leader: Crown,
    DeputyLeader: Crown,
    Personal: User,
    Special: Star,
    Project: Briefcase,
    General: Hash,
};

// Group type badge color
const GROUP_TYPE_COLORS: Record<string, string> = {
    Organization: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Leader: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    DeputyLeader: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Personal: 'bg-green-500/20 text-green-400 border-green-500/30',
    Special: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    Project: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    General: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function GroupsPage() {
    const [groups, setGroups] = useState<GroupDto[]>([]);
    const [stats, setStats] = useState<GroupStatsDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 100;

    // Modal states
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);
    const [editGroup, setEditGroup] = useState<GroupDto | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [membersGroup, setMembersGroup] = useState<GroupDto | null>(null);
    const [permissionsGroup, setPermissionsGroup] = useState<GroupDto | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [groupsData, statsData] = await Promise.all([
                getGroups(filterType || undefined),
                getGroupStats(),
            ]);
            setGroups(groupsData);
            setStats(statsData);
        } catch (error) {
            console.error('Failed to load groups:', error);
            toast.error('載入群組資料失敗');
        } finally {
            setLoading(false);
        }
    }, [filterType]);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        const timer = setTimeout(() => setCurrentPage(1), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Close action menu on click outside
    useEffect(() => {
        if (!actionMenuId) return;
        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-action-menu]')) return;
            setActionMenuId(null);
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [actionMenuId]);

    // Filtered & paginated
    const filtered = useMemo(() => {
        if (!searchTerm) return groups;
        const term = searchTerm.toLowerCase();
        return groups.filter(g =>
            g.name.toLowerCase().includes(term) ||
            g.code?.toLowerCase().includes(term) ||
            g.description?.toLowerCase().includes(term)
        );
    }, [groups, searchTerm]);

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleDelete = async (group: GroupDto) => {
        if (!confirm(`確定要停用群組「${group.name}」嗎？`)) return;
        try {
            const result = await deleteGroup(group.id);
            if (result.success) {
                toast.success('群組已停用');
                loadData();
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error('停用群組失敗');
        }
        setActionMenuId(null);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-400 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">群組管理</h1>
                        <p className="text-sm text-gray-400">管理群組、成員與群組權限</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-400 text-white rounded-lg shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    新增群組
                </button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: '群組總數', value: stats.totalGroups, color: 'from-indigo-500 to-blue-500' },
                        { label: '組織群組', value: stats.countByType?.Organization ?? 0, color: 'from-blue-500 to-cyan-500' },
                        { label: '組長群組', value: (stats.countByType?.Leader ?? 0) + (stats.countByType?.DeputyLeader ?? 0), color: 'from-amber-500 to-orange-500' },
                        { label: '總成員數', value: stats.totalMembers, color: 'from-emerald-500 to-green-500' },
                    ].map((s, i) => (
                        <motion.div
                            key={s.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
                        >
                            <div className="text-sm text-gray-400">{s.label}</div>
                            <div className={`text-2xl font-bold mt-1 bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>
                                {s.value}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Search & Filter */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="搜尋群組名稱、代碼..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-indigo-500/50 focus:ring-2 ring-indigo-500/20 outline-none"
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded-lg border transition-colors ${showFilters ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                >
                    <Filter className="w-4 h-4" />
                </button>
                <button onClick={loadData} className="p-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:bg-white/10 transition-colors">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex items-center gap-3 pb-2">
                            <label className="text-sm text-gray-400">群組類型：</label>
                            <select
                                value={filterType}
                                onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
                                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-indigo-500/50 outline-none"
                            >
                                <option value="">全部</option>
                                {Object.entries(GROUP_TYPE_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Table */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10 text-left">
                            <th className="px-4 py-3 text-gray-400 font-medium">群組名稱</th>
                            <th className="px-4 py-3 text-gray-400 font-medium">代碼</th>
                            <th className="px-4 py-3 text-gray-400 font-medium">類型</th>
                            <th className="px-4 py-3 text-gray-400 font-medium text-center">成員數</th>
                            <th className="px-4 py-3 text-gray-400 font-medium">描述</th>
                            <th className="px-4 py-3 text-gray-400 font-medium w-12"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">載入中...</td></tr>
                        ) : paged.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">無資料</td></tr>
                        ) : paged.map(group => {
                            const Icon = GROUP_TYPE_ICONS[group.groupType] || Hash;
                            const typeColor = GROUP_TYPE_COLORS[group.groupType] || GROUP_TYPE_COLORS.General;
                            return (
                                <tr key={group.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                                            <span className="text-white font-medium">{group.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{group.code}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 text-xs rounded-full border ${typeColor}`}>
                                            {GROUP_TYPE_LABELS[group.groupType] || group.groupType}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-300">{group.memberCount}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[200px]">{group.description}</td>
                                    <td className="px-4 py-3 relative" data-action-menu>
                                        <button
                                            onClick={() => setActionMenuId(actionMenuId === group.id ? null : group.id)}
                                            className="p-1 hover:bg-white/10 rounded transition-colors"
                                        >
                                            <MoreVertical className="w-4 h-4 text-gray-400" />
                                        </button>
                                        <AnimatePresence>
                                            {actionMenuId === group.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="absolute right-4 top-10 z-50 w-40 bg-gray-800 border border-white/10 rounded-lg shadow-xl overflow-hidden"
                                                >
                                                    <button onClick={() => { setEditGroup(group); setActionMenuId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-white/10">
                                                        <Pencil className="w-3.5 h-3.5" /> 編輯
                                                    </button>
                                                    <button onClick={() => { setMembersGroup(group); setActionMenuId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-white/10">
                                                        <UserPlus className="w-3.5 h-3.5" /> 管理成員
                                                    </button>
                                                    <button onClick={() => { setPermissionsGroup(group); setActionMenuId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-white/10">
                                                        <Lock className="w-3.5 h-3.5" /> 管理權限
                                                    </button>
                                                    <button onClick={() => handleDelete(group)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
                                                        <Trash2 className="w-3.5 h-3.5" /> 停用
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>共 {filtered.length} 筆，第 {currentPage} / {totalPages} 頁</span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                            const page = start + i;
                            if (page > totalPages) return null;
                            return (
                                <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded text-sm ${page === currentPage ? 'bg-indigo-500 text-white' : 'hover:bg-white/10'}`}>
                                    {page}
                                </button>
                            );
                        })}
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            <AnimatePresence>
                {showCreateModal && (
                    <GroupFormModal
                        onClose={() => setShowCreateModal(false)}
                        onSave={() => { setShowCreateModal(false); loadData(); }}
                    />
                )}
                {editGroup && (
                    <GroupFormModal
                        group={editGroup}
                        onClose={() => setEditGroup(null)}
                        onSave={() => { setEditGroup(null); loadData(); }}
                    />
                )}
                {membersGroup && (
                    <GroupMembersModal
                        group={membersGroup}
                        onClose={() => setMembersGroup(null)}
                    />
                )}
                {permissionsGroup && (
                    <GroupPermissionsModal
                        group={permissionsGroup}
                        onClose={() => setPermissionsGroup(null)}
                        onSave={() => { setPermissionsGroup(null); loadData(); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ==========================================
// Group Form Modal (Create / Edit)
// ==========================================
function GroupFormModal({ group, onClose, onSave }: {
    group?: GroupDto;
    onClose: () => void;
    onSave: () => void;
}) {
    const isEdit = !!group;
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        code: group?.code ?? '',
        name: group?.name ?? '',
        description: group?.description ?? '',
        groupType: group?.groupType ?? 'General',
        ownerUserId: group?.ownerUserId ?? '',
        isEnabled: group?.isEnabled ?? true,
    });

    const handleSubmit = async () => {
        if (!form.name.trim()) { toast.error('群組名稱不可為空'); return; }
        setSaving(true);
        try {
            if (isEdit) {
                const dto: UpdateGroupDto = {
                    code: form.code,
                    name: form.name,
                    description: form.description,
                    groupType: form.groupType,
                    ownerUserId: form.ownerUserId || undefined,
                    isEnabled: form.isEnabled,
                };
                await updateGroup(group!.id, dto);
                toast.success('群組已更新');
            } else {
                const dto: CreateGroupDto = {
                    code: form.code,
                    name: form.name,
                    description: form.description,
                    groupType: form.groupType,
                    ownerUserId: form.ownerUserId || undefined,
                };
                await createGroup(dto);
                toast.success('群組已建立');
            }
            onSave();
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || '操作失敗';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-800 border border-white/10 rounded-xl w-full max-w-md mx-4 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">{isEdit ? '編輯群組' : '新增群組'}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X className="w-5 h-5 text-gray-400" /></button>
                </div>

                {/* Form */}
                <div className="px-6 py-4 space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">群組名稱 *</label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500/50 outline-none" placeholder="輸入群組名稱" />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">群組代碼</label>
                        <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500/50 outline-none font-mono text-sm" placeholder="例: Leader_100" />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">群組類型</label>
                        <select value={form.groupType} onChange={e => setForm(f => ({ ...f, groupType: e.target.value }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-indigo-500/50 outline-none">
                            {Object.entries(GROUP_TYPE_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">描述</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500/50 outline-none resize-none" placeholder="群組描述" />
                    </div>
                    {isEdit && (
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="isEnabled" checked={form.isEnabled} onChange={e => setForm(f => ({ ...f, isEnabled: e.target.checked }))} className="rounded bg-white/5 border-white/20" />
                            <label htmlFor="isEnabled" className="text-sm text-gray-400">啟用</label>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                    <button onClick={onClose} className="px-4 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:bg-white/10 transition-colors">取消</button>
                    <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-400 text-white rounded-lg shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-50">
                        {saving ? '處理中...' : isEdit ? '更新' : '建立'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ==========================================
// Group Members Modal
// ==========================================
function GroupMembersModal({ group, onClose }: {
    group: GroupDto;
    onClose: () => void;
}) {
    const [activeTab, setActiveTab] = useState<'members' | 'add'>('members');
    const [members, setMembers] = useState<GroupMemberDetailDto[]>([]);
    const [loading, setLoading] = useState(true);

    // Add Members tab state
    const [users, setUsers] = useState<UserListDto[]>([]);
    const [roles, setRoles] = useState<RoleDto[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [userPage, setUserPage] = useState(1);
    const [userTotalPages, setUserTotalPages] = useState(1);
    const [userTotalCount, setUserTotalCount] = useState(0);
    const [usersLoading, setUsersLoading] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [bulkAdding, setBulkAdding] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ completed: 0, total: 0 });
    const userPageSize = 100;

    const memberUserIds = useMemo(() => new Set(members.map(m => m.userId)), [members]);

    const loadMembers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getGroupMembers(group.id);
            setMembers(data);
        } catch {
            toast.error('載入成員失敗');
        } finally {
            setLoading(false);
        }
    }, [group.id]);

    useEffect(() => { loadMembers(); }, [loadMembers]);

    // Load roles once
    useEffect(() => {
        getRoles().then(setRoles).catch(() => {});
    }, []);

    // Load users when tab is active or search/filter/page changes
    const loadUsers = useCallback(async () => {
        setUsersLoading(true);
        try {
            const result = await getUsers({
                search: userSearch || undefined,
                roleId: roleFilter || undefined,
                page: userPage,
                pageSize: userPageSize,
            });
            setUsers(result.items);
            setUserTotalPages(result.totalPages || 1);
            setUserTotalCount(result.totalCount);
        } catch {
            toast.error('載入使用者列表失敗');
        } finally {
            setUsersLoading(false);
        }
    }, [userSearch, roleFilter, userPage]);

    useEffect(() => {
        if (activeTab === 'add') loadUsers();
    }, [activeTab, loadUsers]);

    // Debounce search
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleSearchChange = (value: string) => {
        setUserSearch(value);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => setUserPage(1), 300);
    };

    const handleRemove = async (userId: string) => {
        try {
            await removeGroupMember(group.id, userId);
            toast.success('成員已移除');
            loadMembers();
        } catch {
            toast.error('移除失敗');
        }
    };

    // Selection helpers
    const selectableOnPage = useMemo(
        () => users.filter(u => !memberUserIds.has(u.id)),
        [users, memberUserIds],
    );

    const allPageSelected = selectableOnPage.length > 0 && selectableOnPage.every(u => selectedUserIds.has(u.id));

    const toggleSelectAll = () => {
        setSelectedUserIds(prev => {
            const next = new Set(prev);
            if (allPageSelected) {
                selectableOnPage.forEach(u => next.delete(u.id));
            } else {
                selectableOnPage.forEach(u => next.add(u.id));
            }
            return next;
        });
    };

    const toggleUser = (userId: string) => {
        setSelectedUserIds(prev => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const handleBulkAdd = async () => {
        const ids = Array.from(selectedUserIds);
        if (ids.length === 0) return;
        setBulkAdding(true);
        setBulkProgress({ completed: 0, total: ids.length });
        try {
            const result = await batchAddGroupMembers(
                group.id,
                ids,
                undefined,
                (completed, total) => setBulkProgress({ completed, total }),
            );
            if (result.failed.length === 0) {
                toast.success(`已成功加入 ${result.succeeded} 位成員`);
            } else {
                toast.warning(`成功 ${result.succeeded} 位，失敗 ${result.failed.length} 位`);
            }
            setSelectedUserIds(new Set());
            await Promise.all([loadMembers(), loadUsers()]);
        } catch {
            toast.error('批次加入失敗');
        } finally {
            setBulkAdding(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-800 border border-white/10 rounded-xl w-full max-w-4xl mx-4 shadow-2xl max-h-[85vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <Users className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">成員管理</h2>
                            <p className="text-sm text-gray-400">{group.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X className="w-5 h-5 text-gray-400" /></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 shrink-0">
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                            activeTab === 'members'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-gray-400 hover:text-gray-300'
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        目前成員
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/10 rounded-full">{members.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('add')}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                            activeTab === 'add'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-gray-400 hover:text-gray-300'
                        }`}
                    >
                        <UserPlus className="w-4 h-4" />
                        加入成員
                        {selectedUserIds.size > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-500/30 text-indigo-300 rounded-full">{selectedUserIds.size}</span>
                        )}
                    </button>
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'members' ? (
                        /* ====== Current Members Tab ====== */
                        <div className="px-6 py-3">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                                </div>
                            ) : members.length === 0 ? (
                                <p className="text-center text-gray-500 py-12">尚無成員</p>
                            ) : (
                                <div className="space-y-2">
                                    {members.map(member => (
                                        <div key={member.id} className="flex items-center justify-between px-3 py-2.5 bg-white/5 rounded-lg hover:bg-white/[0.07] transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                    {(member.displayName || member.userName || member.userId).charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm text-white">{member.displayName || member.userName || member.userId}</div>
                                                    <div className="text-xs text-gray-500">{member.email || member.userId}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">{member.memberRole}</span>
                                                <button onClick={() => handleRemove(member.userId)} className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 transition-colors">
                                                    <UserMinus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ====== Add Members Tab ====== */
                        <div className="flex flex-col h-full">
                            {/* Search & Filter bar */}
                            <div className="flex items-center gap-3 px-6 py-3 border-b border-white/10 shrink-0">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="搜尋使用者名稱、Email..."
                                        value={userSearch}
                                        onChange={e => handleSearchChange(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-400 focus:border-indigo-500/50 focus:ring-2 ring-indigo-500/20 outline-none"
                                    />
                                </div>
                                {roles.length > 0 && (
                                    <select
                                        value={roleFilter}
                                        onChange={e => { setRoleFilter(e.target.value); setUserPage(1); }}
                                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-indigo-500/50 outline-none min-w-[140px]"
                                    >
                                        <option value="">全部角色</option>
                                        {roles.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Select All checkbox */}
                            <div className="flex items-center justify-between px-6 py-2 border-b border-white/5 shrink-0">
                                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={allPageSelected}
                                        onChange={toggleSelectAll}
                                        disabled={selectableOnPage.length === 0}
                                        className="rounded bg-white/5 border-white/20 text-indigo-500 focus:ring-indigo-500/30"
                                    />
                                    全選本頁
                                </label>
                                {selectedUserIds.size > 0 && (
                                    <span className="text-xs text-indigo-400">已選 {selectedUserIds.size} 位</span>
                                )}
                            </div>

                            {/* User list */}
                            <div className="flex-1 overflow-y-auto px-6 py-2">
                                {usersLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                                    </div>
                                ) : users.length === 0 ? (
                                    <p className="text-center text-gray-500 py-12">無符合條件的使用者</p>
                                ) : (
                                    <div className="space-y-1">
                                        {users.map(user => {
                                            const isMember = memberUserIds.has(user.id);
                                            const isSelected = selectedUserIds.has(user.id);
                                            return (
                                                <div
                                                    key={user.id}
                                                    onClick={() => !isMember && toggleUser(user.id)}
                                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                                        isMember
                                                            ? 'opacity-60 cursor-default'
                                                            : isSelected
                                                                ? 'bg-indigo-500/10 border border-indigo-500/20 cursor-pointer'
                                                                : 'bg-white/[0.02] hover:bg-white/5 cursor-pointer'
                                                    }`}
                                                >
                                                    {/* Checkbox or member indicator */}
                                                    <div className="shrink-0">
                                                        {isMember ? (
                                                            <CheckCircle className="w-5 h-5 text-green-400" />
                                                        ) : (
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleUser(user.id)}
                                                                onClick={e => e.stopPropagation()}
                                                                className="rounded bg-white/5 border-white/20 text-indigo-500 focus:ring-indigo-500/30"
                                                            />
                                                        )}
                                                    </div>
                                                    {/* Avatar */}
                                                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                        {(user.displayName || user.userName || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    {/* Name + email */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm text-white truncate">
                                                            {user.displayName || user.userName}
                                                        </div>
                                                        <div className="text-xs text-gray-500 truncate">{user.email || user.id}</div>
                                                    </div>
                                                    {/* Role badges */}
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {isMember && (
                                                            <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">已加入</span>
                                                        )}
                                                        {user.roles?.slice(0, 2).map(role => (
                                                            <span key={role} className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">{role}</span>
                                                        ))}
                                                        {(user.roles?.length ?? 0) > 2 && (
                                                            <span className="text-xs text-gray-500">+{user.roles!.length - 2}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {userTotalPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-2 border-t border-white/5 shrink-0 text-sm text-gray-400">
                                    <span>共 {userTotalCount} 位</span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setUserPage(p => Math.max(1, p - 1))}
                                            disabled={userPage === 1}
                                            className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="px-2">{userPage} / {userTotalPages}</span>
                                        <button
                                            onClick={() => setUserPage(p => Math.min(userTotalPages, p + 1))}
                                            disabled={userPage === userTotalPages}
                                            className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Bulk add progress bar */}
                            {bulkAdding && (
                                <div className="px-6 py-2 border-t border-white/10 shrink-0">
                                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                                        <span>加入中...</span>
                                        <span>{bulkProgress.completed} / {bulkProgress.total}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-200"
                                            style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.completed / bulkProgress.total) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 shrink-0">
                    <span className="text-sm text-gray-500">共 {members.length} 位成員</span>
                    <div className="flex items-center gap-2">
                        {activeTab === 'add' && selectedUserIds.size > 0 && (
                            <button
                                onClick={handleBulkAdd}
                                disabled={bulkAdding}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-400 text-white rounded-lg shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 text-sm"
                            >
                                {bulkAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                {bulkAdding ? '加入中...' : `加入 ${selectedUserIds.size} 位成員`}
                            </button>
                        )}
                        <button onClick={onClose} className="px-4 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:bg-white/10 transition-colors text-sm">關閉</button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ==========================================
// Group Permissions Modal
// ==========================================

// 資源項目 (用於編輯群組權限)
function PermResourceItem({
    resource,
    selectedScopes,
    allScopes,
    onToggleScope,
    depth = 0,
}: {
    resource: PermissionResourceDto;
    selectedScopes: Record<string, string[]>;
    allScopes: PermissionScopeDto[];
    onToggleScope: (resourceId: string, scope: string) => void;
    depth?: number;
}) {
    const [expanded, setExpanded] = useState(depth < 2);
    const hasChildren = resource.children && resource.children.length > 0;
    const resourceScopes = selectedScopes[resource.id] || [];

    return (
        <div className="border-b border-white/5 last:border-0">
            <div
                className="flex items-center gap-2 py-2 hover:bg-white/5 transition-colors"
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
                {hasChildren ? (
                    <button onClick={() => setExpanded(!expanded)} className="p-0.5 hover:bg-white/10 rounded">
                        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </button>
                ) : (
                    <div className="w-5" />
                )}
                <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{resource.name}</div>
                    <div className="text-xs text-gray-500 truncate">{resource.code}</div>
                </div>
                <div className="flex items-center gap-1">
                    {allScopes.map((scope) => {
                        const isSelected = resourceScopes.includes(scope.code);
                        return (
                            <button
                                key={scope.code}
                                onClick={() => onToggleScope(resource.id, scope.code)}
                                title={scope.name}
                                className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-colors ${
                                    isSelected
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                            >
                                {scope.code.toUpperCase()}
                            </button>
                        );
                    })}
                </div>
            </div>
            {hasChildren && expanded && (
                <div>
                    {resource.children!.map((child) => (
                        <PermResourceItem
                            key={child.id}
                            resource={child}
                            selectedScopes={selectedScopes}
                            allScopes={allScopes}
                            onToggleScope={onToggleScope}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function GroupPermissionsModal({ group, onClose, onSave }: {
    group: GroupDto;
    onClose: () => void;
    onSave: () => void;
}) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [clientFilter, setClientFilter] = useState('');

    const [resources, setResources] = useState<PermissionResourceDto[]>([]);
    const [scopes, setScopes] = useState<PermissionScopeDto[]>([]);
    const [directPermissions, setDirectPermissions] = useState<PermissionDto[]>([]);

    const [selectedScopes, setSelectedScopes] = useState<Record<string, string[]>>({});
    const [originalScopes, setOriginalScopes] = useState<Record<string, string[]>>({});
    const savedRef = useRef(false);

    const clientOptions = useMemo(() => {
        const clients = new Map<string, string>();
        const extract = (items: PermissionResourceDto[]) => {
            for (const item of items) {
                if (item.clientId && !clients.has(item.clientId)) {
                    clients.set(item.clientId, item.clientName || item.clientId);
                }
                if (item.children) extract(item.children);
            }
        };
        extract(resources);
        return Array.from(clients.entries()).map(([id, name]) => ({ id, name }));
    }, [resources]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [resourcesData, scopesData, permData] = await Promise.all([
                permissionV2Api.getResources(),
                permissionV2Api.getScopes(),
                permissionV2Api.getGroupPermissions(group.id),
            ]);

            setResources(resourcesData);
            setScopes(scopesData);
            setDirectPermissions(permData);

            const scopeMap: Record<string, string[]> = {};
            permData.forEach((p) => {
                let scopeList: string[] = [];
                if (p.scopes.startsWith('@')) {
                    scopeList = p.scopes.split('@').filter(Boolean);
                } else if (p.scopeList) {
                    scopeList = p.scopeList;
                }
                scopeMap[p.resourceId] = scopeList;
            });

            setSelectedScopes(scopeMap);
            setOriginalScopes(JSON.parse(JSON.stringify(scopeMap)));
        } catch (error) {
            console.error('Failed to load permission data:', error);
            toast.error('載入權限資料失敗');
        } finally {
            setLoading(false);
        }
    }, [group.id]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleToggleScope = (resourceId: string, scope: string) => {
        setSelectedScopes((prev) => {
            const current = prev[resourceId] || [];
            const newScopes = current.includes(scope)
                ? current.filter((s) => s !== scope)
                : [...current, scope];

            if (newScopes.length === 0) {
                const { [resourceId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [resourceId]: newScopes };
        });
    };

    const filteredResources = useMemo(() => {
        let result = resources;
        if (clientFilter) {
            const filterByClient = (items: PermissionResourceDto[]): PermissionResourceDto[] => {
                return items
                    .map((item) => ({ ...item, children: item.children ? filterByClient(item.children) : [] }))
                    .filter((item) => item.clientId === clientFilter || (item.children && item.children.length > 0));
            };
            result = filterByClient(result);
        }
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            const filterBySearch = (items: PermissionResourceDto[]): PermissionResourceDto[] => {
                return items
                    .map((item) => ({ ...item, children: item.children ? filterBySearch(item.children) : [] }))
                    .filter((item) => item.name.toLowerCase().includes(search) || item.code.toLowerCase().includes(search) || (item.children && item.children.length > 0));
            };
            result = filterBySearch(result);
        }
        return result;
    }, [resources, searchTerm, clientFilter]);

    const hasChanges = useMemo(() => {
        const currentKeys = Object.keys(selectedScopes);
        const originalKeys = Object.keys(originalScopes);
        if (currentKeys.length !== originalKeys.length) return true;
        for (const key of currentKeys) {
            if (!originalScopes[key]) return true;
            const current = [...(selectedScopes[key] || [])].sort();
            const original = [...(originalScopes[key] || [])].sort();
            if (current.join(',') !== original.join(',')) return true;
        }
        return false;
    }, [selectedScopes, originalScopes]);

    const handleClose = () => {
        if (savedRef.current) {
            onSave();
        } else {
            onClose();
        }
    };

    const handleSave = async () => {
        if (!hasChanges) return;
        setSaving(true);
        try {
            const toRevoke: string[] = [];
            const toGrant: { resourceId: string; scopes: string[] }[] = [];

            const allResourceIds = new Set([
                ...Object.keys(selectedScopes),
                ...Object.keys(originalScopes),
            ]);

            for (const resourceId of allResourceIds) {
                const current = selectedScopes[resourceId] || [];
                const original = originalScopes[resourceId] || [];

                if (current.length === 0 && original.length > 0) {
                    const permission = directPermissions.find((p) => p.resourceId === resourceId);
                    if (permission) toRevoke.push(permission.id);
                } else if (current.length > 0) {
                    const currentSorted = [...current].sort().join(',');
                    const originalSorted = [...original].sort().join(',');
                    if (currentSorted !== originalSorted) {
                        // Scope 變更：先撤銷舊權限再授予新權限，避免重複記錄
                        if (original.length > 0) {
                            const permission = directPermissions.find((p) => p.resourceId === resourceId);
                            if (permission) toRevoke.push(permission.id);
                        }
                        toGrant.push({ resourceId, scopes: current });
                    }
                }
            }

            if (toRevoke.length > 0) {
                await permissionV2Api.batchRevokePermissions(toRevoke);
            }
            if (toGrant.length > 0) {
                await permissionV2Api.batchGrantPermissions({
                    subjectType: SUBJECT_TYPES.GROUP,
                    subjectId: group.id,
                    subjectName: group.name,
                    resourceScopes: toGrant,
                    inheritToChildren: false,
                });
            }

            toast.success('群組權限已儲存');
            savedRef.current = true;
            await loadData();
        } catch (error: any) {
            const errData = error.response?.data;
            const errMsg = errData?.message || errData?.Message || error.message || '儲存失敗';
            const errDetail = errData?.data?.detail || '';
            toast.error(errDetail ? `${errMsg} (${errDetail})` : errMsg);
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
                className="bg-gray-800 border border-white/10 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <Lock className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">群組權限管理</h2>
                            <p className="text-sm text-gray-400 flex items-center gap-2">
                                <Users className="w-3 h-3" />
                                {group.name}
                                <span className="text-xs text-gray-500">({GROUP_TYPE_LABELS[group.groupType] || group.groupType})</span>
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Search & Filter */}
                <div className="px-6 py-3 border-b border-white/10">
                    <div className="flex gap-3">
                        {clientOptions.length > 1 && (
                            <select
                                value={clientFilter}
                                onChange={(e) => setClientFilter(e.target.value)}
                                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500/50 min-w-[160px]"
                            >
                                <option value="" className="bg-gray-800">全部 Client</option>
                                {clientOptions.map((c) => (
                                    <option key={c.id} value={c.id} className="bg-gray-800">{c.name}</option>
                                ))}
                            </select>
                        )}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="搜尋資源..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500/50"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                        <span>權限範圍:</span>
                        {scopes.map((scope) => (
                            <span key={scope.code} className="flex items-center gap-1">
                                <span className="w-5 h-5 flex items-center justify-center bg-white/10 rounded text-gray-300 font-medium">
                                    {scope.code.toUpperCase()}
                                </span>
                                <span>{scope.name}</span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                        </div>
                    ) : filteredResources.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <AlertCircle className="w-12 h-12 mb-2 opacity-50" />
                            <p>{searchTerm ? '沒有找到符合的資源' : '沒有可用的資源'}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filteredResources.map((resource) => (
                                <PermResourceItem
                                    key={resource.id}
                                    resource={resource}
                                    selectedScopes={selectedScopes}
                                    allScopes={scopes}
                                    onToggleScope={handleToggleScope}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Change indicator */}
                {hasChanges && (
                    <div className="px-6 py-3 bg-amber-500/10 border-t border-amber-500/30">
                        <p className="text-sm text-amber-300">有未儲存的變更</p>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                    <button onClick={handleClose} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">取消</button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? '儲存中...' : '儲存變更'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
