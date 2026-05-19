import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, LoadingSpinner, useToast } from '@shared/components';
import { DownloadAPI } from '@services/api/downloadAPI';

interface AlgorithmConfig {
    maxParallelChapters: number;
    maxParallelImages: number;
}

interface DownloadSettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DownloadSettingsDialog({ isOpen, onClose }: DownloadSettingsDialogProps) {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [config, setConfig] = useState<Record<string, AlgorithmConfig>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadConfig();
        }
    }, [isOpen]);

    const loadConfig = async () => {
        setIsLoading(true);
        try {
            const result = await DownloadAPI.getDownloadAlgorithmConfig();
            setConfig(result || {});
        } catch {
            showToast(t('errors.loadFailed'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await DownloadAPI.saveDownloadAlgorithmConfig(config);
            showToast(t('download.settings.saved'), 'success');
            onClose();
        } catch {
            showToast(t('errors.saveFailed'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const updateSiteConfig = (siteId: string, field: keyof AlgorithmConfig, value: number) => {
        setConfig(prev => ({
            ...prev,
            [siteId]: {
                ...prev[siteId],
                [field]: Math.max(1, value),
            },
        }));
    };

    const sortedSites = Object.keys(config).sort();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="card w-full max-w-2xl p-6 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--color-surface-elevated)' }}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {t('download.settings.title')}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : (
                    <div className="max-h-[55vh] overflow-y-auto pr-1">
                        <div className="grid grid-cols-[1fr_80px_80px] gap-x-4 gap-y-1 items-start mb-2 px-2 sticky top-0 py-2" style={{ backgroundColor: 'var(--color-surface-elevated)', color: 'var(--color-text-secondary)' }}>
                            <span className="text-xs font-semibold uppercase tracking-wider">{t('common.name')}</span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-center leading-tight whitespace-normal break-words">{t('download.settings.parallelChapters')}</span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-center leading-tight whitespace-normal break-words">{t('download.settings.parallelImages')}</span>
                        </div>

                        <div className="space-y-1 px-2">
                            {sortedSites.map(siteId => (
                                <div key={siteId} className="grid grid-cols-[1fr_80px_80px] gap-x-4 gap-y-1 items-center py-2 rounded px-2 hover:bg-white/5 transition-colors" style={{ color: 'var(--color-text-primary)' }}>
                                    <span className="text-sm truncate font-mono">{siteId}</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={config[siteId]?.maxParallelChapters ?? 1}
                                        onChange={(e) => updateSiteConfig(siteId, 'maxParallelChapters', parseInt(e.target.value) || 1)}
                                        className="input w-20 text-center text-sm"
                                    />
                                    <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={config[siteId]?.maxParallelImages ?? 1}
                                        onChange={(e) => updateSiteConfig(siteId, 'maxParallelImages', parseInt(e.target.value) || 1)}
                                        className="input w-20 text-center text-sm"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-8 flex justify-end gap-3">
                    <Button onClick={onClose} variant="ghost" className="px-6">
                        {t('download.settings.cancel')}
                    </Button>
                    <Button
                        onClick={handleSave}
                        variant="primary"
                        className="px-6"
                        isLoading={isSaving}
                        disabled={isLoading}
                    >
                        {t('download.settings.save')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
