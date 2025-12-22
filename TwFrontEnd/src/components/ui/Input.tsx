import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, hint, leftIcon, rightIcon, className, type, id, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);
        const isPassword = type === 'password';
        const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={inputId} className="label">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        type={isPassword && showPassword ? 'text' : type}
                        className={clsx(
                            'input',
                            leftIcon && 'pl-11',
                            (rightIcon || isPassword) && 'pr-11',
                            error && 'input-error',
                            className
                        )}
                        {...props}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    )}
                    {rightIcon && !isPassword && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && (
                    <p className="mt-2 text-sm text-red-400 flex items-center gap-1.5">
                        <AlertCircle size={14} />
                        {error}
                    </p>
                )}
                {hint && !error && (
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        {hint}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
