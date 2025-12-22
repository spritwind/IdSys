import { forwardRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: ReactNode;
    iconPosition?: 'left' | 'right';
    className?: string;
    children?: ReactNode;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onClick?: () => void;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    icon: 'btn-icon',
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-sm px-4 py-2',
    md: 'text-sm px-6 py-2.5',
    lg: 'text-base px-8 py-3',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            loading = false,
            icon,
            iconPosition = 'left',
            className,
            children,
            disabled,
            type = 'button',
            onClick,
        },
        ref
    ) => {
        const isDisabled = disabled || loading;

        return (
            <motion.button
                ref={ref}
                type={type}
                whileHover={!isDisabled ? { scale: 1.02 } : undefined}
                whileTap={!isDisabled ? { scale: 0.98 } : undefined}
                className={clsx(
                    variantStyles[variant],
                    variant !== 'icon' && sizeStyles[size],
                    className
                )}
                disabled={isDisabled}
                onClick={onClick}
            >
                {loading && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {!loading && icon && iconPosition === 'left' && icon}
                {children}
                {!loading && icon && iconPosition === 'right' && icon}
            </motion.button>
        );
    }
);

Button.displayName = 'Button';
