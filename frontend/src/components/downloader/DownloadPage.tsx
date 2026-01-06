import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToast } from '../common/Toast';
import { EventsOn } from '../../../wailsjs/runtime/runtime';
import * as AppBackend from '../../../wailsjs/go/main/App';

interface DownloadJob {
    id: string;
    url: string;
    site: string;
    seriesName: string;
    chapterName: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    totalPages: number;
    error?: string;
    createdAt: string;
    path: string;
}

export const DownloadPage: React.FC = () => {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const settings = useSettingsStore();
    const { updateSettings } = settings;
    const [url, setUrl] = useState('');
    const [history, setHistory] = useState<DownloadJob[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadHistory = useCallback(async () => {
        try {
            const jobs = await AppBackend.GetDownloadHistory();
            setHistory(jobs as any);
        } catch (err) {
            console.error('Failed to load download history:', err);
        }
    }, []);

    useEffect(() => {
        loadHistory();

        // Listen for updates from backend
        const unoff = EventsOn('download_updated', () => {
            loadHistory();
        });

        return () => unoff();
    }, [loadHistory]);

    // Clipboard monitoring logic
    useEffect(() => {
        if (!settings.clipboardAutoMonitor) return;

        let lastClipboard = '';
        const interval = setInterval(async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text && text !== lastClipboard && (text.includes('hitomi.la') || text.includes('manhwaweb.com') || text.includes('zonatmo.com'))) {
                    lastClipboard = text;
                    setUrl(text);
                    showToast(t('download.pastedFromClipboard'), 'info');
                    // Auto start download can be aggressive, maybe just set the URL
                }
            } catch (err) {
                // Clipboard access might be denied
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [settings.clipboardAutoMonitor, t, showToast]);

    const handleStartDownload = async (inputUrl?: string) => {
        const urlToDownload = inputUrl || url;
        if (!urlToDownload) return;

        setIsLoading(true);
        try {
            await AppBackend.StartDownload(urlToDownload);
            setUrl('');
            showToast(t('common.success'), 'success');
        } catch (err: any) {
            showToast(err.toString(), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearHistory = async () => {
        await AppBackend.ClearDownloadHistory();
        loadHistory();
    };

    const handleRemoveJob = async (id: string) => {
        await AppBackend.RemoveDownloadJob(id);
        loadHistory();
    };

    const handleSelectPath = async () => {
        try {
            const path = await AppBackend.SelectFolder();
            if (path) {
                updateSettings({ downloadPath: path });
            }
        } catch (err) {
            console.error('Failed to select path:', err);
        }
    };

    return (
        <div className="flex flex-col h-full animate-fade-in p-8 overflow-y-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    {t('download.title')}
                </h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                    {t('home.subtitle')}
                </p>
            </header>

            {/* Input Section */}
            <section className="card p-6 mb-8 flex flex-col gap-4">
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder={t('download.urlPlaceholder')}
                        className="input flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleStartDownload()}
                    />
                    <button
                        onClick={() => handleStartDownload()}
                        disabled={isLoading || !url}
                        className="btn btn-primary px-8"
                    >
                        {isLoading ? t('common.processing') : t('download.startDownload')}
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.clipboardAutoMonitor}
                            onChange={(e) => updateSettings({ clipboardAutoMonitor: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {t('download.autoMonitor')}
                        </span>
                    </label>

                    <div className="h-4 w-px bg-gray-700 mx-2" />

                    <div className="flex items-center gap-2 flex-1 overflow-hidden">
                        <span className="text-sm shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                            {t('folders.title')}:
                        </span>
                        <span className="text-sm truncate font-mono" style={{ color: 'var(--color-text-primary)' }}>
                            {settings.downloadPath || t('download.defaultPath')}
                        </span>
                        <button
                            onClick={handleSelectPath}
                            className="text-sm font-medium hover:underline ml-auto shrink-0"
                            style={{ color: 'var(--color-accent)' }}
                        >
                            {t('common.edit')}
                        </button>
                    </div>
                </div>
            </section>

            {/* History Section */}
            <section className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {t('download.downloadHistory')}
                    </h2>
                    {history.length > 0 && (
                        <button
                            onClick={handleClearHistory}
                            className="text-sm font-medium hover:text-red-400 transition-colors"
                            style={{ color: 'var(--color-text-secondary)' }}
                        >
                            {t('download.clearHistory')}
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <p style={{ color: 'var(--color-text-secondary)' }}>{t('download.noDownloads')}</p>
                        </div>
                    ) : (
                        history.map((job) => (
                            <div key={job.id} className="card p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                                            {job.seriesName}
                                        </h3>
                                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                            {job.site} • {job.chapterName}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                            job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                job.status === 'running' ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                                                    'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {t(`download.status${job.status.charAt(0).toUpperCase() + job.status.slice(1)}`)}
                                        </span>
                                        <button
                                            onClick={() => handleRemoveJob(job.id)}
                                            className="p-1 hover:bg-white/10 rounded transition-colors"
                                            style={{ color: 'var(--color-text-secondary)' }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M18 6L6 18M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {job.status === 'running' && (
                                    <div className="w-full flex flex-col gap-1">
                                        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                                            <span>{Math.round((job.progress / job.totalPages) * 100)}%</span>
                                            <span>{job.progress} / {job.totalPages}</span>
                                        </div>
                                        <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                                                style={{ width: `${(job.progress / job.totalPages) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {job.error && (
                                    <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded">
                                        {job.error}
                                    </p>
                                )}

                                {job.status === 'completed' && job.path && (
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            className="text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                                            style={{
                                                backgroundColor: 'var(--color-accent)',
                                                color: 'white'
                                            }}
                                            onClick={() => AppBackend.OpenInFileManager(job.path)}
                                        >
                                            {t('download.openFolder')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
};
