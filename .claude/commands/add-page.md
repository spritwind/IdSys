# Add Page Component

Create a new Page component for the TwFrontEnd project following the established pattern.

## User Input

The user will provide:
- **Feature name** (e.g., "Clients", "ApiResources", "Organizations")
- **Entity type** (the DTO to display in the table)
- **Columns** (optional — infer from entity type if not specified)
- **Filters** (optional — infer from entity type if not specified)

## Template

Generate a file at `src/pages/{feature}/{FeatureName}Page.tsx` with:

### 1. State Management
```tsx
// Data
const [items, setItems] = useState<EntityDto[]>([]);
const [loading, setLoading] = useState(true);
const [totalCount, setTotalCount] = useState(0);
const [currentPage, setCurrentPage] = useState(1);
const [pageSize] = useState(20);

// Search / Filter
const [searchTerm, setSearchTerm] = useState('');
const [filterField, setFilterField] = useState<string>('');

// Modal
const [selectedEntity, setSelectedEntity] = useState<EntityDto | null>(null);
const [showEditModal, setShowEditModal] = useState(false);

// Batch selection
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

### 2. Data Loading with useCallback
```tsx
const loadData = useCallback(async () => {
    setLoading(true);
    try {
        const result = await entityApi.getEntities({
            search: searchTerm || undefined,
            filterField: filterField || undefined,
            page: currentPage,
            pageSize,
        });
        setItems(result.items);
        setTotalCount(result.totalCount);
    } catch {
        toast.error('載入資料失敗');
    } finally {
        setLoading(false);
    }
}, [searchTerm, filterField, currentPage, pageSize]);

useEffect(() => {
    loadData();
}, [loadData]);
```

### 3. Search Debounce
```tsx
useEffect(() => {
    const timer = setTimeout(() => {
        setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
}, [searchTerm]);
```

### 4. Stat Card Component
```tsx
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
                    <p className="text-2xl font-semibold text-white">
                        {(value ?? 0).toLocaleString()}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
```

### 5. Page JSX Structure
```tsx
return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold text-white">Page Title</h1>
                <p className="text-gray-400 mt-1">Page description</p>
            </div>
            <button className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-400 text-white font-medium rounded-lg hover:shadow-xl shadow-indigo-500/25 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                新增
            </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Icon1} label="Label" value={count} color="bg-indigo-500/20" />
            {/* More stat cards */}
        </div>

        {/* Search / Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="搜尋..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500/50 focus:ring-2 ring-indigo-500/20"
                />
            </div>
            <select
                value={filterField}
                onChange={(e) => setFilterField(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500/50"
            >
                <option value="">全部</option>
                {/* Filter options */}
            </select>
        </div>

        {/* Data Table */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-white/10">
                        <th className="w-10 px-4 py-3">
                            <input type="checkbox" onChange={handleToggleSelectAll} />
                        </th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Column</th>
                        {/* More columns */}
                        <th className="w-16"></th> {/* Actions */}
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan={99} className="text-center py-12">
                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                        </td></tr>
                    ) : items.length === 0 ? (
                        <tr><td colSpan={99} className="text-center py-12 text-gray-400">
                            無資料
                        </td></tr>
                    ) : (
                        items.map((item) => (
                            <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3">
                                    <input type="checkbox" checked={selectedIds.has(item.id)} />
                                </td>
                                <td className="px-4 py-3 text-white">{item.name}</td>
                                {/* More cells */}
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => openActionMenu(item)}>
                                        <MoreVertical className="w-4 h-4 text-gray-400" />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                    <p className="text-sm text-gray-400">
                        共 {totalCount} 筆，第 {currentPage} / {totalPages} 頁
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        {/* Page number buttons */}
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Modal Integration */}
        {showEditModal && selectedEntity && (
            <EditModal
                entity={selectedEntity}
                onClose={() => { setShowEditModal(false); setSelectedEntity(null); }}
                onSave={() => { setShowEditModal(false); setSelectedEntity(null); loadData(); }}
            />
        )}
    </div>
);
```

### 6. Required Imports
```tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, MoreVertical, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
```

## Also Generate

- **Route entry**: Add route in the router config (typically `src/App.tsx` or routes file)
- **API Service**: If `src/services/{feature}Api.ts` doesn't exist, create it using the add-api-service pattern
- **Types**: If `src/types/{feature}.ts` doesn't exist, create it with required DTOs

## Checklist
- [ ] Page component with loading, search, filter, pagination state
- [ ] `useCallback` for data loading, `useEffect` to trigger
- [ ] Search debounce with 300ms `setTimeout`
- [ ] Stat cards with motion.div entrance animation
- [ ] Search bar with Search icon + filter dropdown
- [ ] Data table with checkbox selection, hover states, action menu
- [ ] Loading spinner and empty state rows
- [ ] Pagination with page info + prev/next buttons
- [ ] Modal integration with onClose/onSave callbacks
- [ ] All UI text in Traditional Chinese (zh-TW)
- [ ] Tailwind dark theme: bg-white/5, border-white/10, text-white/gray-400
