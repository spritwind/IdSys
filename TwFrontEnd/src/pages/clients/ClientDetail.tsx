import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Copy, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

// Tab Definitions
const TABS = [
    { id: 'basics', label: '基本資訊' },
    { id: 'settings', label: '系統設定' },
    { id: 'authentication', label: '認證' },
    { id: 'token', label: 'Token' },
    { id: 'resources', label: '資源與權限' },
];

export default function ClientDetail() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isNew = id === 'new';
    const [activeTab, setActiveTab] = useState('basics');

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/clients')}
                        className="p-2 -ml-2 text-[var(--color-text-secondary)] hover:text-white rounded-full hover:bg-white/5 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            {isNew ? '建立新的客戶端' : '編輯客戶端'}
                        </h1>
                        <p className="text-sm text-[var(--color-text-secondary)] font-mono mt-1">
                            {isNew ? 'New Client' : `Client ID: ${id}`} // 這裡的ID應為clientId字串，後續需從API獲取
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isNew && (
                        <>
                            <button className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
                                <Copy size={16} />
                                <span>複製</span>
                            </button>
                            <button className="btn-danger text-sm px-4 py-2 flex items-center gap-2">
                                <Trash2 size={16} />
                                <span>刪除</span>
                            </button>
                        </>
                    )}
                    <button className="btn-primary text-sm px-6 py-2 flex items-center gap-2 shadow-[0_0_20px_rgba(var(--color-accent-primary-rgb),0.3)]">
                        <Save size={18} />
                        <span>儲存變更</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-white/10 flex gap-8">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            relative py-4 text-sm font-medium transition-colors
                            ${activeTab === tab.id ? 'text-white' : 'text-[var(--color-text-secondary)] hover:text-white/80'}
                        `}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTabIndicator"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent-primary)] shadow-[0_-2px_8px_rgba(99,102,241,0.5)]"
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="glass p-8 rounded-2xl min-h-[500px]">
                <div className="max-w-3xl">
                    {/* Placeholder content for now */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--color-text-secondary)]">Client ID</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-[var(--color-accent-primary)] focus:outline-none transition-colors"
                                    placeholder="e.g. ro.client"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--color-text-secondary)]">Client Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-[var(--color-accent-primary)] focus:outline-none transition-colors"
                                    placeholder="e.g. Read Only Client"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Description</label>
                            <textarea
                                className="w-full h-32 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-[var(--color-accent-primary)] focus:outline-none transition-colors resize-none"
                                placeholder="輸入客戶端描述說明..."
                            ></textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
