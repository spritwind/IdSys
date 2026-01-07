/**
 * Identity Resource Edit Page
 * UC Capital Identity Admin
 *
 * 身份資源編輯頁面
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Save,
    Loader2,
    Users,
    Settings,
    ChevronDown,
    ChevronUp,
    X,
    AlertCircle,
} from 'lucide-react';
import { identityResourceService } from '@/services/identityResourceService';
import type { IdentityResourceApiDto } from '@/types/identityServer';
import { defaultIdentityResource } from '@/types/identityServer';

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
                    <div className="p-2 bg-violet-500/20 rounded-lg">
                        <Icon size={18} className="text-violet-400" />
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
                        className="inline-flex items-center gap-1 px-2 py-1 bg-violet-500/20 text-violet-400 text-sm rounded-lg"
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
                className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-violet-500 transition-colors text-sm"
            />
        </div>
    );
}

export default function IdentityResourceEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<IdentityResourceApiDto>>(defaultIdentityResource);

    useEffect(() => {
        if (!isNew && id) {
            loadResource(parseInt(id));
        }
    }, [id, isNew]);

    const loadResource = async (resourceId: number) => {
        try {
            setLoading(true);
            setError(null);
            const data = await identityResourceService.getIdentityResource(resourceId);
            setFormData(data);
        } catch (err) {
            console.error('Failed to load identity resource:', err);
            setError('無法載入身份資源資料');
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
                await identityResourceService.createIdentityResource(formData as Omit<IdentityResourceApiDto, 'id'>);
            } else {
                await identityResourceService.updateIdentityResource(formData as IdentityResourceApiDto);
            }

            navigate('/identity-server-settings');
        } catch (err) {
            console.error('Failed to save identity resource:', err);
            setError('儲存失敗，請稍後再試');
        } finally {
            setSaving(false);
        }
    };

    const updateField = <K extends keyof IdentityResourceApiDto>(field: K, value: IdentityResourceApiDto[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
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
                        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30">
                            <Users className="w-6 h-6 text-violet-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                {isNew ? '新增身份資源' : '編輯身份資源'}
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
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl text-white font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all disabled:opacity-50"
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
            <Section title="基本資訊" icon={Users}>
                <FormField label="資源名稱" required description="身份資源的唯一識別名稱（如 openid, profile, email）">
                    <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => updateField('name', e.target.value)}
                        disabled={!isNew}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
                        placeholder="profile"
                    />
                </FormField>
                <FormField label="顯示名稱" description="使用者介面中顯示的名稱">
                    <input
                        type="text"
                        value={formData.displayName || ''}
                        onChange={(e) => updateField('displayName', e.target.value)}
                        className="w-full h-10 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-violet-500 transition-colors"
                        placeholder="使用者個人資料"
                    />
                </FormField>
                <FormField label="描述" fullWidth>
                    <textarea
                        value={formData.description || ''}
                        onChange={(e) => updateField('description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-white focus:outline-none focus:border-violet-500 transition-colors resize-none"
                        placeholder="身份資源的描述..."
                    />
                </FormField>
                <FormField label="啟用狀態">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.enabled ?? true}
                            onChange={(e) => updateField('enabled', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                        />
                        <span className="text-white">啟用此身份資源</span>
                    </label>
                </FormField>
                <FormField label="顯示於探索文件">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.showInDiscoveryDocument ?? true}
                            onChange={(e) => updateField('showInDiscoveryDocument', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-violet-500 focus:ring-violet-500"
                        />
                        <span className="text-white">顯示</span>
                    </label>
                </FormField>
            </Section>

            {/* Consent Settings */}
            <Section title="同意畫面設定" icon={Settings}>
                <FormField label="必要資源" description="使用者無法取消勾選此資源">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.required ?? false}
                            onChange={(e) => updateField('required', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-violet-500 focus:ring-violet-500"
                        />
                        <span className="text-white">必要</span>
                    </label>
                </FormField>
                <FormField label="強調顯示" description="在同意畫面中特別強調此資源">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.emphasize ?? false}
                            onChange={(e) => updateField('emphasize', e.target.checked)}
                            className="w-5 h-5 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-violet-500 focus:ring-violet-500"
                        />
                        <span className="text-white">強調</span>
                    </label>
                </FormField>
            </Section>

            {/* Claims */}
            <Section title="使用者聲明" icon={Settings}>
                <FormField label="使用者聲明" fullWidth description="包含在 Identity Token 中的使用者聲明（輸入後按 Enter 新增）">
                    <TagInput
                        value={formData.userClaims || []}
                        onChange={(value) => updateField('userClaims', value)}
                        placeholder="name, family_name, given_name, email..."
                    />
                </FormField>
            </Section>
        </form>
    );
}
