import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToast } from '../common/Toast';
import { EventsOn } from '../../../wailsjs/runtime/runtime';
import * as AppBackend from '../../../wailsjs/go/main/App';
import { downloader } from '../../../wailsjs/go/models';

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

    // State for series download
    const [seriesInfo, setSeriesInfo] = useState<downloader.SiteInfo | null>(null);
    const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
    const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);

    // Series Grouping Logic
    const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());

    const toggleSeries = (seriesName: string) => {
        const newSet = new Set(expandedSeries);
        if (newSet.has(seriesName)) {
            newSet.delete(seriesName);
        } else {
            newSet.add(seriesName);
        }
        setExpandedSeries(newSet);
    };

    const groupedHistory = useMemo(() => {
        const items: Array<{ type: 'single'; job: DownloadJob } | { type: 'series'; name: string; jobs: DownloadJob[] }> = [];
        const processedSeries = new Set<string>();

        history.forEach((job) => {
            const sName = job.seriesName;
            if (sName && sName !== 'Unknown Series' && sName !== 'Unknown') {
                if (processedSeries.has(sName)) return;
                processedSeries.add(sName);
                const seriesJobs = history.filter(j => j.seriesName === sName);
                items.push({ type: 'series', name: sName, jobs: seriesJobs });
            } else {
                items.push({ type: 'single', job });
            }
        });
        return items;
    }, [history]);

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



    const handleStartDownload = useCallback(async (inputUrl?: string) => {
        const urlToDownload = inputUrl || url;
        if (!urlToDownload) return;

        setIsLoading(true);
        try {
            // First check if it is a series or single chapter
            const info = await (AppBackend as any).FetchMangaInfo(urlToDownload);

            if (info.Type === 'series') {
                setSeriesInfo(info);
                // Start with empty selection so user must choose
                setSelectedChapters(new Set());
                setIsSeriesModalOpen(true);
                setUrl(''); // Clear input
            } else {
                // It's a single chapter, start download directly
                await AppBackend.StartDownload(urlToDownload);
                setUrl('');
                showToast(t('common.success'), 'success');
            }
        } catch (err: any) {
            // If FetchMangaInfo fails (e.g. unknown URL type or network error), 
            // fallback to StartDownload just in case, or show error.
            // But specific errors from backend will be shown.
            // If it failed to fetch info, likely it will fail to download too.
            // However, legacy support check: if 'this is a series URL' error comes, we handled it? 
            // No, the backend `FetchMangaInfo` returns error if algo not found. 
            // If `FetchMangaInfo` succeeds, we check Type.
            showToast(err.toString(), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [url, showToast, t]);

    // Clipboard monitoring logic
    useEffect(() => {
        if (!settings.clipboardAutoMonitor) return;

        let lastClipboard = '';
        const interval = setInterval(async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text && text !== lastClipboard && (text.includes('hitomi.la') || text.includes('manhwaweb.com') || text.includes('zonatmo.com') || text.includes('nhentai') || text.includes('mangadex'))) {
                    lastClipboard = text;

                    // Hitomi Series Detection: Don't auto-start, just paste.
                    const isHitomi = text.includes('hitomi.la');
                    const isHitomiSeries = isHitomi && (
                        text.includes('/artist/') ||
                        text.includes('/series/') ||
                        text.includes('/tag/') ||
                        text.includes('/character/') ||
                        text.includes('/group/') ||
                        text.includes('index-')
                    );

                    if (isHitomiSeries) {
                        setUrl(text);
                        showToast(t('download.pastedFromClipboard'), 'info');
                    } else {
                        showToast(t('download.pastedFromClipboard'), 'info');
                        handleStartDownload(text);
                    }
                }
            } catch (err) {
                // Clipboard access might be denied
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [settings.clipboardAutoMonitor, t, showToast, handleStartDownload]);

    const handleDownloadSeries = async () => {
        if (!seriesInfo) return;

        const chaptersToDownload = seriesInfo.Chapters.filter((c: any) => selectedChapters.has(c.ID));

        if (chaptersToDownload.length === 0) {
            showToast("No chapters selected", "error");
            return;
        }

        setIsLoading(true);
        setIsSeriesModalOpen(false);

        let started = 0;
        for (const chapter of chaptersToDownload) {
            try {
                // Add small delay to avoid overwhelming
                await AppBackend.StartDownload(chapter.URL);
                started++;
            } catch (err) {
                console.error(`Failed to start download for ${chapter.Name}:`, err);
            }
        }

        showToast(`Started ${started} downloads`, 'success');
        setIsLoading(false);
        setSeriesInfo(null);
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

    const toggleChapter = (id: string) => {
        const newSet = new Set(selectedChapters);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedChapters(newSet);
    };


    // Language Helper
    const getLanguageFlag = (langCode: string) => {
        const map: { [key: string]: string } = {
            'en': '🇬🇧',
            'es': '🇪🇸',
            'es-la': '🇲🇽',
            'ja': '🇯🇵',
            'ko': '🇰🇷',
            'zh': '🇨🇳',
            'fr': '🇫🇷',
            'it': '🇮🇹',
            'de': '🇩🇪',
            'pt': '🇵🇹',
            'pt-br': '🇧🇷',
            'ru': '🇷🇺',
            'tr': '🇹🇷',
            'id': '🇮🇩',
            'vi': '🇻🇳',
            'pl': '🇵🇱',
            'uk': '🇺🇦',
        };
        return map[langCode] || langCode || '🌐';
    };

    const [filterLanguage, setFilterLanguage] = useState<string>('all');

    const availableLanguages = useMemo(() => {
        if (!seriesInfo) return [];
        // Extract unique languages
        const langs = new Set(seriesInfo.Chapters.map((c: any) => c.Language).filter(Boolean));
        return Array.from(langs).sort();
    }, [seriesInfo]);

    const displayedChapters = useMemo(() => {
        if (!seriesInfo) return [];
        if (filterLanguage === 'all') return seriesInfo.Chapters;
        return seriesInfo.Chapters.filter((c: any) => c.Language === filterLanguage);
    }, [seriesInfo, filterLanguage]);

    const toggleAllChapters = () => {
        if (!seriesInfo) return;

        // check if all currently displayed are selected
        const allDisplayedSelected = displayedChapters.every((c: any) => selectedChapters.has(c.ID));

        const newSelected = new Set(selectedChapters);

        displayedChapters.forEach((c: any) => {
            if (allDisplayedSelected) {
                newSelected.delete(c.ID);
            } else {
                newSelected.add(c.ID);
            }
        });

        setSelectedChapters(newSelected);
    };

    // Helper to check if "Select All" checkmark should be active for the current view
    const isAllDisplayedSelected = displayedChapters.length > 0 && displayedChapters.every((c: any) => selectedChapters.has(c.ID));

    return (
        <div className="flex flex-col h-full animate-fade-in p-8 overflow-y-auto relative">
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
                    {groupedHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <p style={{ color: 'var(--color-text-secondary)' }}>{t('download.noDownloads')}</p>
                        </div>
                    ) : (
                        groupedHistory.map((item, index) => {
                            if (item.type === 'single') {
                                const job = item.job;
                                return (
                                    <div key={job.id} className="card p-4 flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                                                    {job.seriesName || 'Unknown Series'}
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
                                                    onClick={() => (AppBackend as any).OpenInFileManager(job.path)}
                                                >
                                                    {t('download.openFolder')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            } else {
                                // Series Group Rendering
                                const isExpanded = expandedSeries.has(item.name);
                                const jobs = item.jobs;
                                const finishedCount = jobs.filter(j => j.status === 'completed').length;
                                const runningCount = jobs.filter(j => j.status === 'running').length;

                                return (
                                    <div key={item.name + index} className="card p-0 overflow-hidden flex flex-col">
                                        <div
                                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                            onClick={() => toggleSeries(item.name)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`transition-transform duration-200 text-gray-400 ${isExpanded ? 'rotate-90' : ''}`}>
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="9 18 15 12 9 6" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                                                        {item.name}
                                                    </h3>
                                                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                                        {finishedCount} / {jobs.length} chapters completed
                                                        {runningCount > 0 && ` • ${runningCount} downloading`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Optional: Add clear all for series? */}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="border-t border-gray-700/50 bg-black/20">
                                                {jobs.map(job => (
                                                    <div key={job.id} className="p-4 border-b border-gray-700/30 last:border-0 flex flex-col gap-3 pl-12 relative">
                                                        {/* Connection line visual */}
                                                        <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-700/30" />
                                                        <div className="absolute left-6 top-8 w-4 h-px bg-gray-700/30" />

                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                                                                    {job.chapterName}
                                                                </p>
                                                                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                                                    {job.site}
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
                                                                    onClick={(e) => { e.stopPropagation(); handleRemoveJob(job.id); }}
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
                                                                    onClick={(e) => { e.stopPropagation(); (AppBackend as any).OpenInFileManager(job.path); }}
                                                                >
                                                                    {t('download.openFolder')}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                        })
                    )}
                </div>
            </section>

            {/* Series Selection Modal */}
            {isSeriesModalOpen && seriesInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-8">
                    <div className="card w-full max-w-2xl max-h-full flex flex-col p-0 overflow-hidden shadow-2xl" style={{ backgroundColor: 'var(--color-surface-elevated)' }}>
                        <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-secondary)' }}>
                            <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{seriesInfo.SeriesName}</h3>
                            <button onClick={() => setIsSeriesModalOpen(false)} style={{ color: 'var(--color-text-secondary)' }} className="hover:text-white transition-colors">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-4 flex gap-4 items-center justify-between border-b" style={{ backgroundColor: 'var(--color-surface-secondary)', borderColor: 'var(--color-border)' }}>
                            {/* Language Filter */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Language:</span>
                                <select
                                    className="text-sm rounded border px-2 py-1 outline-none"
                                    style={{
                                        backgroundColor: 'var(--color-surface-tertiary)',
                                        color: 'var(--color-text-primary)',
                                        borderColor: 'var(--color-border)'
                                    }}
                                    value={filterLanguage}
                                    onChange={(e) => setFilterLanguage(e.target.value)}
                                >
                                    <option value="all">All Languages 🌐</option>
                                    {availableLanguages.map(lang => (
                                        <option key={lang} value={lang}>
                                            {getLanguageFlag(lang as string)} {lang}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                    {displayedChapters.length} chapters
                                </div>
                                <button onClick={toggleAllChapters} className="text-sm font-medium hover:underline" style={{ color: 'var(--color-accent)' }}>
                                    {isAllDisplayedSelected ? "Deselect All" : "Select All"}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ backgroundColor: 'var(--color-surface-primary)' }}>
                            {displayedChapters.map((chapter: any) => (
                                <label key={chapter.ID} className="flex items-center gap-3 p-2 rounded cursor-pointer transition-colors group hover:bg-white/5">
                                    <input
                                        type="checkbox"
                                        checked={selectedChapters.has(chapter.ID)}
                                        onChange={() => toggleChapter(chapter.ID)}
                                        className="w-5 h-5 rounded border bg-transparent"
                                        style={{
                                            borderColor: 'var(--color-text-secondary)',
                                            accentColor: 'var(--color-accent)'
                                        }}
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl" title={chapter.Language}>
                                                {getLanguageFlag(chapter.Language)}
                                            </span>
                                            <div className="font-medium transition-colors" style={{ color: 'var(--color-text-primary)' }}>
                                                {chapter.Name}
                                            </div>
                                        </div>
                                        <div className="text-xs flex gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                                            <span>{chapter.Date ? new Date(chapter.Date).toLocaleDateString() : ''}</span>
                                            {chapter.ScanGroup && (
                                                <>
                                                    <span>•</span>
                                                    <span>{chapter.ScanGroup}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <a href={chapter.URL} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity p-1" style={{ color: 'var(--color-text-secondary)' }} onClick={(e) => e.stopPropagation()}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                            <polyline points="15 3 21 3 21 9" />
                                            <line x1="10" y1="14" x2="21" y2="3" />
                                        </svg>
                                    </a>
                                </label>
                            ))}
                        </div>

                        <div className="p-4 flex justify-end gap-3" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                            <button
                                onClick={() => setIsSeriesModalOpen(false)}
                                className="px-4 py-2 rounded transition hover:bg-white/10"
                                style={{ color: 'var(--color-text-primary)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDownloadSeries}
                                className="btn btn-primary px-6"
                                disabled={selectedChapters.size === 0}
                            >
                                Download Selected ({selectedChapters.size})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

