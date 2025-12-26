/**
 * Sidebar Context
 * UC Capital Identity Admin
 *
 * 管理 Sidebar 收合狀態的 Context
 */

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface SidebarContextType {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = 'uc-admin-sidebar-collapsed';

export function SidebarProvider({ children }: { children: ReactNode }) {
    // 從 localStorage 讀取初始狀態
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === 'true';
    });

    // 持久化到 localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, String(isCollapsed));
    }, [isCollapsed]);

    const toggleSidebar = () => setIsCollapsed(prev => !prev);
    const setCollapsed = (collapsed: boolean) => setIsCollapsed(collapsed);

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, setCollapsed }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}
