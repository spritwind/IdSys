/**
 * API Resource Edit Page
 * UC Capital Identity Admin
 *
 * API 資源編輯頁面
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Save,
    Loader2,
    Database,
    Settings,
    ChevronDown,
    ChevronUp,
    X,
    AlertCircle,
} from 'lucide-react';
import { apiResourceService } from '@/services/apiResourceService';
import type { ApiResourceApiDto } from '@/types/identityServer';
import { defaultApiResource } from '@/types/identityServer';

interface SectionProps {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

function Section({ title, icon: Icon, children, defaultOpen = true }: SectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Icon size={18} className="text-emerald-400" />
                    </div>
                    <span className="text-white font-medium">{title}</span>
                </div>
                {isOpen ? (
                    <ChevronUp size={18} className="text-[var(--color-text-secondary)]" />
                ) : (
                    <ChevronDown size={18} className="text-[var(--color-text-secondary)]" />
                )}
            </button>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 pt-0 border-t border-[rgba(255,255,255,0.05)]"
                >
                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {children}
                    </div>
                </motion.div>
            )}
        </div>
    );
}

interface FormFieldProps {
    label: string;
    description?: string;
    required?: boolean;
    fullWidth?: boolean;
    children: React.ReactNode;
}

function FormField({ label, description, required, fullWidth, children }: FormFieldProps) {
    return (
        <div className={`space-y-1.5 ${fullWidth ? 'md:col-span-2' : ''}`}>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>
            {children}
            {description && (
                <p className="text-xs text-[var(--color-text-secondary)] opacity-70">{description}</p>
            )}
        </div>
    );
}

interface TagInputProps {
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
}

function TagInput({ value, onChange, placeholder }: TagInputProps) {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const trimmed = inputValue.trim();
            if (trimmed && !value.includes(trimmed)) {
                onChange([...value, trimmed]);
            }
            setInputValue('');
        }
    };

    const removeTag = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {value.map((tag, index) => (
                    <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-sm rounded-lg"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(index)}
                            className="hover:text-red-400 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </span>
                ))}
            </div>
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-emerald-500 transition-colors text-sm"
            />
        </div>
    );
}

export default function ApiResourceEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<ApiResourceApiDto>>(defaultApiResource);

    useEffect(() => {
        if (!isNew && id) {
            loadResource(parseInt(id));
        }
    }, [id, isNew]);

    const loadResource = async (resourceId: number) => {
        try {
            setLoading(true);
            setError(null);
            const data = await apiResourceService.getApiResource(resourceId);
            setFormData(data);
        } catch (err) {
            console.error('Failed to load API resource:', err);
            setError('無法載入 API 資源資料');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name) {
            setError('請填寫必要欄位');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            if (isNew) {
                await apiResourceService.createApiResource(formData as Omit<ApiResourceApiDto, 'id'>);
            } else {
                await apiResourceService.updateApiResource(formData as ApiResourceApiDto);
            }

            navigate('/identity-server-settings');
        } catch (err) {
            console.error('Failed to save API resource:', err);
            setError('儲存失敗，請稍後再試');
        } finally {
            setSaving(false);
        }
    };

    const updateField = <K extends keyof ApiResourceApiDto>(field: K, value: ApiResourceApiDto[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/identity-server-settings')}
                        className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-[var(--color-text-secondary)] hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </motion.button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                            <Database className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                {isNew ? '新增 API 資源' : '編輯 API 資源'}
                            </h1>
                            {!isNew && formData.name && (
                                <p className="text-sm text-[var(--color-text-secondary)]">{formData.name}</p>
                            )}
                        </div>
                    </div>
                </div>
                <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl text-white font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50"
                >
                    {saving ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Save size={18} />
                    )}
                    <span>{saving ? '儲存中...' : '儲存'}</span>
                </motion.button>
            </div>

            {/* Error Message */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400"
                >
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </motion.div>
            )}

            {/* Basic Information */}
            <Section title="基本資訊" icon={Database}>
                <FormField label="資源名稱" required description="API 資源的唯一識別名稱">
                    <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => updateField('name', e.target.value)}
                        disabled={!isNew}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                        placeholder="my-api"
                    />
                </FormField>
                <FormField label="顯示名稱" description="使用者介面中顯示的名稱">
                    <input
                        type="text"
                        value={formData.displayName || ''}
                        onChange={(e) => updateField('displayName', e.target.value)}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="My API"
                    />
                </FormField>
                <FormField label="描述" fullWidth>
                    <textarea
                        value={formData.description || ''}
                        onChange={(e) => updateField('description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                        placeholder="API 資源的描述..."
                    />
                </FormField>
                <FormField label="啟用狀態">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.enabled ?? true}
                            onChange={(e) => updateField('enabled', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                        />
                        <span className="text-white">啟用此 API 資源</span>
                    </label>
                </FormField>
                <FormField label="顯示於探索文件">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.showInDiscoveryDocument ?? true}
                            onChange={(e) => updateField('showInDiscoveryDocument', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-white">顯示</span>
                    </label>
                </FormField>
            </Section>

            {/* Scopes and Claims */}
            <Section title="範圍與聲明" icon={Settings}>
                <FormField label="關聯範圍" fullWidth description="此 API 資源包含的範圍（輸入後按 Enter 新增）">
                    <TagInput
                        value={formData.scopes || []}
                        onChange={(value) => updateField('scopes', value)}
                        placeholder="api.read, api.write..."
                    />
                </FormField>
                <FormField label="使用者聲明" fullWidth description="包含在 Access Token 中的使用者聲明">
                    <TagInput
                        value={formData.userClaims || []}
                        onChange={(value) => updateField('userClaims', value)}
                        placeholder="name, email, role..."
                    />
                </FormField>
                <FormField label="允許的簽名演算法" fullWidth description="限制 Access Token 可使用的簽名演算法">
                    <TagInput
                        value={formData.allowedAccessTokenSigningAlgorithms || []}
                        onChange={(value) => updateField('allowedAccessTokenSigningAlgorithms', value)}
                        placeholder="RS256, ES256..."
                    />
                </FormField>
            </Section>

            {/* Advanced Settings */}
            <Section title="進階設定" icon={Settings} defaultOpen={false}>
                <FormField label="需要資源指標">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.requireResourceIndicator ?? false}
                            onChange={(e) => updateField('requireResourceIndicator', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-white">需要 resource 參數</span>
                    </label>
                </FormField>
            </Section>
        </form>
    );
}
