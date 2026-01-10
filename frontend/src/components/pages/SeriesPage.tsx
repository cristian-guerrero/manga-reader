/**
 * SeriesPage - Series browser
 */

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../../stores/navigationStore';
import { EventsOn, EventsOff } from '../../../wailsjs/runtime';
import { SeriesEntry } from '../../types';
import { SortControls } from '../common/SortControls';
import { GridItem } from '../common/GridItem';
import { GridContainer } from '../common/GridContainer';
import { SearchBar } from '../common/SearchBar';
import { LibraryCard } from '../common/LibraryCard';
import { useThumbnails } from '../../hooks/useThumbnails';
import { useTabStore } from '../../stores/tabStore';

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
    const { addTab } = useTabStore();
    const [series, setSeries] = useState<SeriesEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { thumbnails, loadThumbnails, initializeThumbnails } = useThumbnails(10);
    const [history, setHistory] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const isMountedRef = useRef(true);

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


    const loadHistory = useCallback(async () => {
        try {
            // @ts-ignore
            const data = await window.go?.main?.App?.GetHistory();
            if (data && isMountedRef.current) setHistory(data);
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }, []);

    const loadSeries = useCallback(async () => {
        if (!isMountedRef.current) return;

        try {
            // @ts-ignore
            const app = window.go?.main?.App;
            if (!app?.GetSeries) {
                // Bindings not available - this shouldn't happen in normal operation
                console.warn('[SeriesPage] Bindings not available yet');
                if (isMountedRef.current) {
                    setIsLoading(false);
                }
                return;
            }

            // Set loading state
            if (isMountedRef.current) {
                setIsLoading(true);
            }

            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout loading series')), 10000); // 10 second timeout
            });

            const seriesPromise = app.GetSeries();
            const data = await Promise.race([seriesPromise, timeoutPromise]) as any[];

            console.log(`[SeriesPage] Series received: ${data?.length || 0} items`);

            if (!isMountedRef.current) return;

            if (data && Array.isArray(data)) {
                setSeries(data);
                setIsLoading(false); // Show UI immediately with data

                // Load thumbnails asynchronously (hook handles existing thumbnailUrl)
                loadThumbnails(data, (entry) => entry.coverImage, (entry) => entry.id);
            } else {
                setSeries([]);
                setIsLoading(false);
            }
        } catch (error) {
            console.error('[SeriesPage] Failed to load series:', error);
            if (isMountedRef.current) {
                setSeries([]);
                setIsLoading(false);
            }
        }
    }, [loadThumbnails]);

    useEffect(() => {
        isMountedRef.current = true;
        let unsubscribeSeries: () => void;
        let unsubscribeHistory: () => void;
        let unsubscribeAppReady: () => void;

        // Try to load immediately - bindings should be available
        loadSeries();
        loadHistory();

        // Listen for app_ready event in case bindings weren't ready immediately
        unsubscribeAppReady = EventsOn('app_ready', () => {
            console.log('[SeriesPage] Received app_ready event');
            if (isMountedRef.current) {
                loadSeries();
                loadHistory();
            }
        });

        unsubscribeSeries = EventsOn('series_updated', () => {
            if (isMountedRef.current) loadSeries();
        });

        unsubscribeHistory = EventsOn('history_updated', () => {
            if (isMountedRef.current) loadHistory();
        });

        return () => {
            isMountedRef.current = false;
            if (unsubscribeSeries) unsubscribeSeries();
            if (unsubscribeHistory) unsubscribeHistory();
            if (unsubscribeAppReady) unsubscribeAppReady();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - only run once on mount


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
        // Maintain 'series' as active menu page when viewing series details
        navigate('series-details', { series: entry.path }, 'series');
    };

    const handleAuxClick = (e: React.MouseEvent, entry: SeriesEntry) => {
        if (e.button === 1) { // Middle click
            e.preventDefault();
            e.stopPropagation();
            addTab('series-details', { series: entry.path }, entry.name, {}, false);
        }
    };

    const handlePlaySeries = (entry: SeriesEntry, e: React.MouseEvent) => {
        e.stopPropagation();

        if (!entry.chapters || entry.chapters.length === 0) return;

        // Find if any chapter is in history
        const chapterPaths = entry.chapters.map(c => c.path);
        const lastRead = history
            .filter(h => chapterPaths.includes(h.folderPath))
            .sort((a, b) => new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime())[0];

        // Maintain 'series' as active menu page when viewing a chapter from series
        if (lastRead) {
            navigate('viewer', { folder: lastRead.folderPath }, 'series');
        } else {
            // Play first chapter
            navigate('viewer', { folder: entry.chapters[0].path }, 'series');
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

    // Debounced search query
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Memoized filter and sort
    const filteredSeries = useMemo(() => {
        return series.filter(item => {
            if (!debouncedSearchQuery.trim()) return true;
            const query = debouncedSearchQuery.toLowerCase();
            return item.name.toLowerCase().includes(query);
        });
    }, [series, debouncedSearchQuery]);

    const sortedSeries = useMemo(() => {
        return [...filteredSeries].sort((a, b) => {
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
    }, [filteredSeries, sortBy, sortOrder]);


    return (
        <div
            className="h-full overflow-auto p-6"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
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
                                { value: 'name', label: t('common.name') },
                                { value: 'date', label: t('common.date') }
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

                {/* Search Bar */}
                {series.length > 0 && (
                    <div className="mt-4">
                        <SearchBar
                            placeholder={t('series.searchPlaceholder') || 'Search series by name...'}
                            onSearch={setSearchQuery}
                            className="max-w-md"
                        />
                    </div>
                )}
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
                            <LibraryCard
                                id={item.id}
                                name={item.name}
                                thumbnail={thumbnails[item.id]}
                                isTemporary={item.isTemporary}
                                count={item.chapters?.length || 0}
                                countLabel={t('series.chapters')}
                                countIcon={<BookIcon />}
                                onOpen={() => handleOpenSeries(item)}
                                onAuxClick={(e) => handleAuxClick(e, item)}
                                onRemove={(e) => handleRemoveSeries(item, e)}
                                onPlay={(e) => handlePlaySeries(item, e)}
                                overlayContent={
                                    <>
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
                                    </>
                                }
                                fallbackIcon={<SeriesIcon />}
                                archiveLabel={t('common.archive') || 'Archive'}
                                removeLabel={t('series.removeSeries')}
                                playLabel={t('series.openSeries')}
                                variant="split"
                            />
                        </GridItem>
                    ))}
                </GridContainer>
            )}
        </div>
    );
}

export default SeriesPage;
