import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { ToastProvider } from '../components/ui/Toast';
import { motion } from 'framer-motion';
import { SidebarProvider, useSidebar } from '../contexts/SidebarContext';

function MainContent() {
    const { isCollapsed } = useSidebar();

    return (
        <main
            className="pt-20 relative z-10 w-full min-h-screen transition-all duration-300"
            style={{ paddingLeft: isCollapsed ? '72px' : '256px' }}
        >
            <div className="p-8 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                    <Outlet />
                </motion.div>
            </div>
        </main>
    );
}

export function MainLayout() {
    return (
        <SidebarProvider>
            <ToastProvider>
                <div className="min-h-screen bg-[var(--color-bg-primary)] text-white font-sans selection:bg-[var(--color-accent-primary)] selection:text-white">
                    {/* Background Effects */}
                    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[150px] opacity-20 bg-[radial-gradient(circle,var(--color-accent-primary)_0%,transparent_70%)]" />
                        <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[150px] opacity-10 bg-[radial-gradient(circle,var(--color-accent-secondary)_0%,transparent_70%)]" />
                    </div>

                    <Sidebar />
                    <Header />
                    <MainContent />
                </div>
            </ToastProvider>
        </SidebarProvider>
    );
}
