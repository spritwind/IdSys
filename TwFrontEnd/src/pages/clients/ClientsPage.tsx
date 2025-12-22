import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit2, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clientService } from '@/services/clientService';
import type { ClientApiDto } from '@/types/client';
import { GlassTable } from '@/components/common/GlassTable';
// import { toast } from 'sonner'; // Unused for now

export default function ClientsPage() {
    const navigate = useNavigate();
    const [clients, setClients] = useState<ClientApiDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const data = await clientService.getClients(searchTerm, page);
            setClients(data.clients);
            setTotalPages(Math.ceil(data.totalCount / data.pageSize));
        } catch (error) {
            console.error('Failed to fetch clients:', error);
            // 这里可以整合 Toast 通知
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchClients();
        }, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm, page]);

    const handleEdit = (id: number) => {
        navigate(`/clients/${id}`);
    };

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                >
                    <h1 className="text-3xl font-bold text-white tracking-tight">客戶端管理</h1>
                    <p className="text-[var(--color-text-secondary)] mt-2">
                        管理系統中的所有 OIDC 與 OAuth 客戶端應用程式。
                    </p>
                </motion.div>

                <motion.button
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/clients/new')}
                    className="btn-primary group"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    <span>新增客戶端</span>
                </motion.button>
            </div>

            {/* Actions Bar */}
            <div className="flex gap-4 p-1">
                <div className="relative flex-1 max-w-md group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-[var(--color-text-secondary)] group-focus-within:text-[var(--color-accent-primary)] transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="搜尋 Client ID 或名稱..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)] transition-all"
                    />
                </div>
            </div>

            {/* Data Table */}
            <GlassTable
                data={clients}
                isLoading={loading}
                pagination={{
                    currentPage: page,
                    totalPages: totalPages,
                    onPageChange: setPage
                }}
                onRowClick={(client) => handleEdit(client.id)}
                columns={[
                    {
                        header: 'Client ID',
                        accessor: 'clientId',
                        className: 'font-mono text-[var(--color-accent-gold)]'
                    },
                    { header: '名稱', accessor: 'clientName' },
                    {
                        header: '狀態',
                        accessor: (client) => (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${client.enabled
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.2)]'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                {client.enabled ? '啟用' : '停用'}
                            </span>
                        )
                    },
                    { header: '存取類型', accessor: 'protocolType' }, // Could map protocol type to readable string if needed
                    {
                        header: '',
                        accessor: (_client) => (
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                <button className="p-2 text-[var(--color-text-secondary)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors" title="編輯">
                                    <Edit2 size={16} />
                                </button>
                                <button className="p-2 text-[var(--color-text-secondary)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors" title="複製">
                                    <Copy size={16} />
                                </button>
                            </div>
                        )
                    }
                ]}
            />
        </div>
    );
}
