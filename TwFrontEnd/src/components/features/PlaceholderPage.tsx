import { motion } from 'framer-motion';
import { Construction, type LucideIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

interface PlaceholderPageProps {
    title: string;
    description: string;
    icon: LucideIcon;
}

export function PlaceholderPage({ title, description, icon: Icon }: PlaceholderPageProps) {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center"
        >
            <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
                className="p-6 rounded-2xl bg-[var(--color-accent-primary)]/10 border border-[var(--color-accent-primary)]/20 mb-6"
            >
                <Icon size={48} className="text-[var(--color-accent-primary)]" />
            </motion.div>

            <h1 className="text-3xl font-bold text-white mb-3">{title}</h1>
            <p className="text-[var(--color-text-secondary)] max-w-md mb-8">{description}</p>

            <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)] mb-8">
                <Construction size={18} />
                <span>此頁面正在開發中</span>
            </div>

            <Button variant="secondary" onClick={() => navigate(-1)}>
                返回上一頁
            </Button>
        </motion.div>
    );
}
