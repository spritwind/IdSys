/**
 * Theme Context
 * UC Capital Identity Admin
 *
 * Provides light/dark mode toggle with IndexedDB persistence.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getThemePreference, setThemePreference, LS_THEME_KEY } from '../utils/themeStorage';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyTheme(theme: Theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(LS_THEME_KEY, theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        // Fast sync read from localStorage (matches the inline script in index.html)
        const stored = localStorage.getItem(LS_THEME_KEY);
        return stored === 'light' ? 'light' : 'dark';
    });

    // On mount: reconcile with IndexedDB (source of truth)
    useEffect(() => {
        getThemePreference().then((idbTheme) => {
            if (idbTheme !== theme) {
                setTheme(idbTheme);
                applyTheme(idbTheme);
            }
        });
        // Only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep data-theme attribute in sync
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => {
            const next: Theme = prev === 'dark' ? 'light' : 'dark';
            setThemePreference(next);
            return next;
        });
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
