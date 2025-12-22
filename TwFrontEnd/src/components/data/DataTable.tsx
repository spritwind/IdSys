import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import clsx from 'clsx';

// Column Definition
export interface ColumnDef<T> {
    key: string;
    header: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    render?: (value: any, row: T, index: number) => ReactNode;
}

// Pagination State
export interface PaginationState {
    page: number;
    pageSize: number;
    total: number;
}

// DataTable Props
interface DataTableProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    loading?: boolean;
    pagination?: PaginationState;
    onPaginationChange?: (state: PaginationState) => void;
    onRowClick?: (row: T) => void;
    rowKey?: keyof T | ((row: T) => string);
    emptyMessage?: string;
    emptyIcon?: ReactNode;
}

export function DataTable<T extends Record<string, any>>({
    data,
    columns,
    loading = false,
    pagination,
    onPaginationChange,
    onRowClick,
    rowKey = 'id',
    emptyMessage = '暫無資料',
    emptyIcon,
}: DataTableProps<T>) {
    const getRowKey = (row: T, index: number): string => {
        if (typeof rowKey === 'function') {
            return rowKey(row);
        }
        return String(row[rowKey] ?? index);
    };

    const getValue = (row: T, key: string): any => {
        return key.split('.').reduce((obj, k) => obj?.[k], row);
    };

    // Loading skeleton
    if (loading) {
        return (
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key} style={{ width: col.width }}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}>
                                {columns.map((col) => (
                                    <td key={col.key}>
                                        <div className="skeleton h-4 w-3/4" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    // Empty state
    if (data.length === 0) {
        return (
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key} style={{ width: col.width }}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                </table>
                <div className="empty-state">
                    {emptyIcon && <div className="empty-state-icon">{emptyIcon}</div>}
                    <p className="empty-state-title">{emptyMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="table-container overflow-x-auto">
                <table className="table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    style={{ width: col.width }}
                                    className={clsx(
                                        col.align === 'center' && 'text-center',
                                        col.align === 'right' && 'text-right'
                                    )}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => (
                            <motion.tr
                                key={getRowKey(row, rowIndex)}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: rowIndex * 0.03 }}
                                onClick={() => onRowClick?.(row)}
                                className={clsx(
                                    onRowClick && 'cursor-pointer'
                                )}
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={clsx(
                                            col.align === 'center' && 'text-center',
                                            col.align === 'right' && 'text-right'
                                        )}
                                    >
                                        {col.render
                                            ? col.render(getValue(row, col.key), row, rowIndex)
                                            : getValue(row, col.key)}
                                    </td>
                                ))}
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && onPaginationChange && (
                <Pagination
                    pagination={pagination}
                    onChange={onPaginationChange}
                />
            )}
        </div>
    );
}

// Pagination Component
interface PaginationProps {
    pagination: PaginationState;
    onChange: (state: PaginationState) => void;
}

function Pagination({ pagination, onChange }: PaginationProps) {
    const { page, pageSize, total } = pagination;
    const totalPages = Math.ceil(total / pageSize);

    const goToPage = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            onChange({ ...pagination, page: newPage });
        }
    };

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);

    // Generate page numbers to show
    const getPageNumbers = () => {
        const pages: (number | 'ellipsis')[] = [];
        const showPages = 5;

        if (totalPages <= showPages) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        pages.push(1);

        const start = Math.max(2, page - 1);
        const end = Math.min(totalPages - 1, page + 1);

        if (start > 2) pages.push('ellipsis');
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < totalPages - 1) pages.push('ellipsis');

        pages.push(totalPages);
        return pages;
    };

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--color-text-secondary)]">
                顯示 {start} - {end}，共 {total} 筆
            </p>

            <div className="pagination">
                <button
                    onClick={() => goToPage(1)}
                    disabled={page === 1}
                    className="pagination-btn"
                    title="第一頁"
                >
                    <ChevronsLeft size={16} />
                </button>
                <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1}
                    className="pagination-btn"
                    title="上一頁"
                >
                    <ChevronLeft size={16} />
                </button>

                {getPageNumbers().map((p, i) =>
                    p === 'ellipsis' ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-[var(--color-text-muted)]">
                            ...
                        </span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => goToPage(p)}
                            className={clsx('pagination-btn min-w-[36px]', page === p && 'active')}
                        >
                            {p}
                        </button>
                    )
                )}

                <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page === totalPages}
                    className="pagination-btn"
                    title="下一頁"
                >
                    <ChevronRight size={16} />
                </button>
                <button
                    onClick={() => goToPage(totalPages)}
                    disabled={page === totalPages}
                    className="pagination-btn"
                    title="最後一頁"
                >
                    <ChevronsRight size={16} />
                </button>
            </div>
        </div>
    );
}
