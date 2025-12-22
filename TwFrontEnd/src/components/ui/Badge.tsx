import clsx from 'clsx';
import type { ReactNode } from 'react';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
    variant?: BadgeVariant;
    children: ReactNode;
    className?: string;
    dot?: boolean;
    icon?: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
    default: 'badge-default',
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    info: 'badge-info',
};

export function Badge({ variant = 'default', children, className, dot, icon }: BadgeProps) {
    return (
        <span className={clsx(variantStyles[variant], className)}>
            {dot && (
                <span className={clsx(
                    'w-1.5 h-1.5 rounded-full',
                    variant === 'success' && 'bg-green-400',
                    variant === 'error' && 'bg-red-400',
                    variant === 'warning' && 'bg-amber-400',
                    variant === 'info' && 'bg-blue-400',
                    variant === 'primary' && 'bg-indigo-400',
                    variant === 'default' && 'bg-gray-400',
                )} />
            )}
            {icon}
            {children}
        </span>
    );
}

// Status Badge - 狀態標籤
interface StatusBadgeProps {
    status: 'active' | 'inactive' | 'pending' | 'error';
    showDot?: boolean;
}

const statusConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    active: { variant: 'success', label: '啟用' },
    inactive: { variant: 'default', label: '停用' },
    pending: { variant: 'warning', label: '待處理' },
    error: { variant: 'error', label: '錯誤' },
};

export function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
    const config = statusConfig[status];
    return (
        <Badge variant={config.variant} dot={showDot}>
            {config.label}
        </Badge>
    );
}
