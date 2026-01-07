/**
 * SeriesPage - Series browser
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../../stores/navigationStore';
import { EventsOn, EventsOff } from '../../../wailsjs/runtime';
import { SeriesEntry } from '../../types';
import { Tooltip } from '../common/Tooltip';
import { SortControls } from '../common/SortControls';
import { GridItem } from '../common/GridItem';
import { GridContainer } from '../common/GridContainer';

// Icons
const SeriesIcon = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6" y2="6.01" />
        <line x1="6" y1="18" x2="6" y2="18.01" />
    </svg>
);

const PlusIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const TrashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

const BookIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
);

const PlayIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
);


export function SeriesPage() {
    const { t } = useTranslation();
    const { navigate } = useNavigationStore();
    const [series, setSeries] = useState<SeriesEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
    const [history, setHistory] = useState<any[]>([]);

    // Sorting state with persistence
    const [sortBy, setSortBy] = useState<'name' | 'date'>(() => {
        return (localStorage.getItem('series_sortBy') as 'name' | 'date') || 'name';
    });
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
        return (localStorage.getItem('series_sortOrder') as 'asc' | 'desc') || 'asc';
    });

    // Save sort preference
    useEffect(() => {
        localStorage.setItem('series_sortBy', sortBy);
        localStorage.setItem('series_sortOrder', sortOrder);
    }, [sortBy, sortOrder]);

    useEffect(() => {
        let isMounted = true;
        let unsubscribe: () => void;

        const init = async () => {
            await ensureWailsReady();
            if (!isMounted) return;

            loadSeries();
            loadHistory();

            unsubscribe = EventsOn('series_updated', () => {
                if (isMounted) loadSeries();
            });

            const historyUnsubscribe = EventsOn('history_updated', () => {
                if (isMounted) loadHistory();
            });

            return () => {
                if (historyUnsubscribe) historyUnsubscribe();
            };
        };

        init();

        return () => {
            isMounted = false;
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const ensureWailsReady = async (maxAttempts = 20) => {
        for (let i = 0; i < maxAttempts; i++) {
            // @ts-ignore
            if (window.go?.main?.App?.GetSeries) return true;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.warn('Wails bindings not ready after timeout');
        return false;
    };

    const loadHistory = async () => {
        try {
            // @ts-ignore
            const data = await window.go?.main?.App?.GetHistory();
            if (data) setHistory(data);
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    };

    const loadSeries = async (retryCount = 0) => {
        setIsLoading(true);
        console.log(`[SeriesPage] Loading series (attempt ${retryCount + 1})...`);
        try {
            // @ts-ignore
            const app = window.go?.main?.App;
            if (!app) {
                console.log('[SeriesPage] Wails bindings not found');
                if (retryCount < 3) {
                    setTimeout(() => loadSeries(retryCount + 1), 500);
                    return;
                }
                throw new Error('Bindings not available');
            }

            const data = await app.GetSeries();
            console.log(`[SeriesPage] Series received: ${data?.length || 0} items`);
            if (data && Array.isArray(data)) {
                setSeries(data);

                // Load thumbnails
                for (const entry of data) {
                    if (entry.coverImage) {
                        loadThumbnail(entry.id, entry.coverImage);
                    }
                }
            }
        } catch (error) {
            console.error('[SeriesPage] Failed to load series:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadThumbnail = async (id: string, path: string) => {
        try {
            // @ts-ignore
            const thumb = await window.go?.main?.App?.GetThumbnail(path);
            if (thumb) {
                setThumbnails((prev) => ({ ...prev, [id]: thumb }));
            }
        } catch (error) {
            console.error('Failed to load thumbnail:', error);
        }
    };

    const handleSelectFolder = async () => {
        try {
            // @ts-ignore
            const folderPath = await window.go?.main?.App?.SelectFolder();
            if (folderPath) {
                // @ts-ignore
                await window.go?.main?.App?.AddFolder(folderPath);
                // The event 'series_updated' will trigger reloading if it was a series
                // If it was a folder, it will be added to library
            }
        } catch (error) {
            console.error('Failed to select folder:', error);
        }
    };

    const handleOpenSeries = (entry: SeriesEntry) => {
        navigate('series-details', { series: entry.path });
    };

    const handlePlaySeries = (entry: SeriesEntry, e: React.MouseEvent) => {
        e.stopPropagation();

        if (!entry.chapters || entry.chapters.length === 0) return;

        // Find if any chapter is in history
        const chapterPaths = entry.chapters.map(c => c.path);
        const lastRead = history
            .filter(h => chapterPaths.includes(h.folderPath))
            .sort((a, b) => new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime())[0];

        if (lastRead) {
            navigate('viewer', { folder: lastRead.folderPath });
        } else {
            // Play first chapter
            navigate('viewer', { folder: entry.chapters[0].path });
        }
    };

    const handleRemoveSeries = async (entry: SeriesEntry, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            // @ts-ignore
            await window.go?.main?.App?.RemoveSeries(entry.path);
            setSeries((prev) => prev.filter((s) => s.path !== entry.path));
        } catch (error) {
            console.error('Failed to remove series:', error);
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm(t('series.confirmClear'))) return;
        try {
            // @ts-ignore
            await window.go?.main?.App?.ClearSeries();
            setSeries([]);
        } catch (error) {
            console.error('Failed to clear series:', error);
        }
    };

    // Sort series
    const sortedSeries = [...series].sort((a, b) => {
        let res = 0;
        if (sortBy === 'name') {
            res = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        } else {
            // Date sort
            const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
            const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
            res = dateA - dateB;
        }
        return sortOrder === 'asc' ? res : -res;
    });


    return (
        <div
            className="h-full overflow-auto p-6"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h1
                        className="text-2xl font-bold"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {t('series.title')}
                    </h1>

                    {/* Sort Controls */}
                    <SortControls
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSortByChange={(value) => setSortBy(value as 'name' | 'date')}
                        onSortOrderChange={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        options={[
                            { value: 'name', label: 'Name' },
                            { value: 'date', label: 'Date' }
                        ]}
                        show={series.length > 0}
                    />
                </div>

                <div className="flex items-center gap-2">
                    {series.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="btn-ghost text-red-500 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-transform hover:scale-105 active:scale-95"
                        >
                            <TrashIcon />
                            {t('series.clearAll')}
                        </button>
                    )}
                    <button
                        onClick={handleSelectFolder}
                        className="btn-primary flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                    >
                        <PlusIcon />
                        {t('series.addSeries')}
                    </button>
                </div>
            </div>

            {/* Series grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div
                        className="w-12 h-12 border-4 rounded-full animate-spin"
                        style={{
                            borderColor: 'var(--color-accent)',
                            borderTopColor: 'transparent',
                        }}
                    />
                </div>
            ) : series.length === 0 ? (
                <div
                    className="flex flex-col items-center justify-center py-20 rounded-2xl animate-scale-in"
                    style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        border: '2px dashed var(--color-border)',
                    }}
                >
                    <div
                        className="mb-4 animate-bounce"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        <SeriesIcon />
                    </div>
                    <p
                        className="text-lg font-medium mb-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {t('series.noSeries')}
                    </p>
                    <button
                        onClick={handleSelectFolder}
                        className="btn-secondary transition-transform hover:scale-105 active:scale-95"
                    >
                        {t('folders.selectFolder')}
                    </button>
                </div>
            ) : (
                <GridContainer>
                    {sortedSeries.map((item) => (
                        <GridItem key={item.path}>
                            <div
                                onClick={() => handleOpenSeries(item)}
                                className="group/card relative rounded-xl overflow-hidden cursor-pointer hover-lift shadow-sm transition-all hover:border-accent animate-slide-up"
                                style={{
                                    backgroundColor: 'var(--color-surface-secondary)',
                                    border: '1px solid var(--color-border)',
                                }}
                            >
                            {/* Cover image */}
                            <div
                                className="aspect-[3/4] relative overflow-hidden"
                                style={{ backgroundColor: 'var(--color-surface-tertiary)' }}
                            >
                                {thumbnails[item.id] ? (
                                    <img
                                        src={thumbnails[item.id]}
                                        alt={item.name}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <div
                                            className="animate-pulse"
                                            style={{ color: 'var(--color-text-muted)' }}
                                        >
                                            <SeriesIcon />
                                        </div>
                                    </div>
                                )}

                                {/* Archive Badge */}
                                {item.isTemporary && (
                                    <div
                                        className="absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider z-10 shadow-lg border border-white/10"
                                        style={{
                                            backgroundColor: 'rgba(56, 189, 248, 0.9)', // Sky 400
                                            color: 'white',
                                            backdropFilter: 'blur(4px)'
                                        }}
                                    >
                                        {t('common.archive') || 'Archive'}
                                    </div>
                                )}

                                {/* Overlay on hover - Play Button */}
                                <div
                                    className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4 bg-black/40 pointer-events-none"
                                >
                                    <button
                                        onClick={(e) => handlePlaySeries(item, e)}
                                        className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl backdrop-blur-md transition-all hover:scale-110 hover:bg-accent-hover active:scale-90 pointer-events-auto"
                                        style={{ backgroundColor: 'var(--color-accent)' }}
                                    >
                                        <PlayIcon />
                                    </button>

                                    <div className="absolute bottom-4 text-white font-medium text-sm">
                                        {t('series.openSeries')}
                                    </div>
                                </div>

                                {/* Remove button */}
                                <div className="absolute top-2 right-2 z-20 opacity-0 group-hover/card:opacity-100 transition-all">
                                    <Tooltip content={t('series.removeSeries')} placement="left">
                                        <button
                                            onClick={(e) => handleRemoveSeries(item, e)}
                                            className="p-2 rounded-full hover:scale-110 active:scale-90"
                                            style={{
                                                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                                color: 'white',
                                            }}
                                            aria-label={t('series.removeSeries')}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-4">
                                <h3
                                    className="font-semibold truncate mb-1"
                                    style={{ color: 'var(--color-text-primary)' }}
                                >
                                    {item.name}
                                </h3>
                                <div
                                    className="flex items-center gap-1 text-sm"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >
                                    <BookIcon />
                                    <span>
                                        {t('series.chapterCount', { count: item.chapters?.length || 0 })}
                                    </span>
                                </div>
                            </div>
                            </div>
                        </GridItem>
                    ))}
                </GridContainer>
            )
            }
        </div >
    );
}

export default SeriesPage;
