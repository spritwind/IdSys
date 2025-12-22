import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import clsx from 'clsx';

interface SearchInputProps {
    value?: string;
    onChange?: (value: string) => void;
    onSearch?: (value: string) => void;
    placeholder?: string;
    debounceMs?: number;
    className?: string;
    autoFocus?: boolean;
}

export function SearchInput({
    value: controlledValue,
    onChange,
    onSearch,
    placeholder = '搜尋...',
    debounceMs = 300,
    className,
    autoFocus = false,
}: SearchInputProps) {
    const [internalValue, setInternalValue] = useState(controlledValue ?? '');

    // Sync with controlled value
    useEffect(() => {
        if (controlledValue !== undefined) {
            setInternalValue(controlledValue);
        }
    }, [controlledValue]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            onSearch?.(internalValue);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [internalValue, debounceMs, onSearch]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInternalValue(newValue);
        onChange?.(newValue);
    };

    const handleClear = () => {
        setInternalValue('');
        onChange?.('');
        onSearch?.('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            handleClear();
        }
    };

    return (
        <div className={clsx('relative', className)}>
            <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
                type="text"
                value={internalValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoFocus={autoFocus}
                className={clsx(
                    'w-full pl-11 pr-10 py-2.5 rounded-xl',
                    'bg-white/5 border border-white/10',
                    'text-white placeholder-[var(--color-text-muted)]',
                    'transition-all duration-300',
                    'focus:outline-none focus:border-[var(--color-accent-primary)] focus:ring-2 focus:ring-[var(--color-accent-primary)]/20'
                )}
            />
            {internalValue && (
                <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-colors"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
}
