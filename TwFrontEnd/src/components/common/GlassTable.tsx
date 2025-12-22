import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface Column<T> {
    header: string;
    accessor: keyof T | ((item: T) => ReactNode);
    className?: string;
}

interface GlassTableProps<T> {
    data: T[];
    columns: Column<T>[];
    isLoading?: boolean;
    onRowClick?: (item: T) => void;
    pagination?: {
        currentPage: number;
        totalPages: number;
        onPageChange: (page: number) => void;
    };
}

export function GlassTable<T extends { id: number | string }>({
    data,
    columns,
    isLoading,
    onRowClick,
    pagination
}: GlassTableProps<T>) {
    return (
        <div className="w-full">
            <div className="glass rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(10,10,15,0.3)] backdrop-blur-md">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
                                {columns.map((col, idx) => (
                                    <th
                                        key={idx}
                                        className={`px-6 py-4 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider ${col.className || ''}`}
                                    >
                                        {col.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
                            <AnimatePresence mode="wait">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={columns.length} className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4">
                                                <Loader2 className="w-8 h-8 text-[var(--color-accent-primary)] animate-spin" />
                                                <span className="text-[var(--color-text-secondary)] text-sm">載入資料中...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : data.length === 0 ? (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <td colSpan={columns.length} className="px-6 py-24 text-center text-[var(--color-text-secondary)]">
                                            尚無資料
                                        </td>
                                    </motion.tr>
                                ) : (
                                    data.map((item, idx) => (
                                        <motion.tr
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            onClick={() => onRowClick && onRowClick(item)}
                                            className={`
                                                group transition-colors duration-200 
                                                hover:bg-[rgba(255,255,255,0.03)] 
                                                ${onRowClick ? 'cursor-pointer' : ''}
                                            `}
                                        >
                                            {columns.map((col, colIdx) => (
                                                <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                                                    {typeof col.accessor === 'function'
                                                        ? col.accessor(item)
                                                        : (item[col.accessor] as ReactNode)}
                                                </td>
                                            ))}
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">
                            第 {pagination.currentPage} 頁，共 {pagination.totalPages} 頁
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 1}
                                className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                                disabled={pagination.currentPage === pagination.totalPages}
                                className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
