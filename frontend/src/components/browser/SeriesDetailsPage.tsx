/**
 * SeriesDetailsPage - Display chapters of a specific series
 */

import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../../stores/navigationStore';
import { ChapterInfo, SeriesEntry } from '../../types';
import { Tooltip } from '../common/Tooltip';

// Icons
const ChevronLeftIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const ImageIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
    </svg>
);

const SortAscIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M6 12h12M9 18h6" />
    </svg>
);

const SortDescIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 18h18M6 12h12M9 6h6" />
    </svg>
);

interface SeriesDetailsPageProps {
    seriesPath: string;
}

// Helper functions for sort preferences per series
const getSeriesSortPreferences = (seriesPath: string) => {
    try {
        const stored = localStorage.getItem('seriesDetails_sortPreferences');
        if (stored) {
            const prefs = JSON.parse(stored);
            return prefs[seriesPath] || { sortBy: 'name', sortOrder: 'asc' };
        }
    } catch (e) {
        console.error('Failed to load sort preferences', e);
    }
    return { sortBy: 'name', sortOrder: 'asc' };
};

const saveSeriesSortPreferences = (seriesPath: string, sortBy: 'name' | 'pages', sortOrder: 'asc' | 'desc') => {
    try {
        const stored = localStorage.getItem('seriesDetails_sortPreferences');
        const prefs = stored ? JSON.parse(stored) : {};
        prefs[seriesPath] = { sortBy, sortOrder };
        localStorage.setItem('seriesDetails_sortPreferences', JSON.stringify(prefs));
    } catch (e) {
        console.error('Failed to save sort preferences', e);
    }
};

export function SeriesDetailsPage({ seriesPath }: SeriesDetailsPageProps) {
    const { t } = useTranslation();
    const { navigate, goBack } = useNavigationStore();
    const [series, setSeries] = useState<SeriesEntry | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

    // Sorting state - initialized with series preferences
    const [sortBy, setSortBy] = useState<'name' | 'pages'>(() => {
        const prefs = getSeriesSortPreferences(seriesPath);
        // Migrate old 'date' to 'pages' if exists
        return prefs.sortBy === 'date' ? 'pages' : (prefs.sortBy === 'pages' ? 'pages' : 'name');
    });
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
        return getSeriesSortPreferences(seriesPath).sortOrder;
    });

    // Track if preferences have been loaded for current series
    const preferencesLoadedRef = useRef(false);

    // Load sort preferences when series changes
    useEffect(() => {
        const prefs = getSeriesSortPreferences(seriesPath);
        setSortBy(prefs.sortBy);
        setSortOrder(prefs.sortOrder);
        preferencesLoadedRef.current = true;
    }, [seriesPath]);

    // Save sort preference when it changes (but only after initial load)
    useEffect(() => {
        if (preferencesLoadedRef.current) {
            saveSeriesSortPreferences(seriesPath, sortBy, sortOrder);
        }
    }, [sortBy, sortOrder, seriesPath]);

    useEffect(() => {
        loadSeriesDetails();
    }, [seriesPath]);

    const loadSeriesDetails = async () => {
        setIsLoading(true);
        try {
            // @ts-ignore
            const data = await window.go?.main?.App?.GetSeries();
            if (data && Array.isArray(data)) {
                const found = data.find((s: SeriesEntry) => s.path === seriesPath);
                if (found) {
                    setSeries(found);
                    // Initialize thumbnails from the chapter metadata
                    const initialThumbs: Record<string, string> = {};
                    for (const chapter of found.chapters) {
                        if (chapter.thumbnailUrl) {
                            initialThumbs[chapter.path] = chapter.thumbnailUrl;
                        }
                    }
                    setThumbnails(initialThumbs);
                }
            }
        } catch (error) {
            console.error('Failed to load series details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadChapterThumbnail = async (path: string) => {
        try {
            // @ts-ignore
            const images = await window.go?.main?.App?.GetImages(path);
            if (images && images.length > 0) {
                // @ts-ignore
                const thumb = await window.go?.main?.App?.GetThumbnail(images[0].path);
                if (thumb) {
                    setThumbnails((prev) => ({ ...prev, [path]: thumb }));
                }
            }
        } catch (error) {
            console.error('Failed to load chapter thumbnail:', error);
        }
    };

    const handleOpenChapter = (path: string) => {
        navigate('viewer', { folder: path });
    };

    // Sort chapters
    const sortedChapters = series ? [...series.chapters].sort((a, b) => {
        let res = 0;
        if (sortBy === 'name') {
            res = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        } else {
            // Sort by page count (imageCount)
            res = a.imageCount - b.imageCount;
        }
        return sortOrder === 'asc' ? res : -res;
    }) : [];


    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div
                    className="w-12 h-12 border-4 rounded-full animate-spin"
                    style={{
                        borderColor: 'var(--color-accent)',
                        borderTopColor: 'transparent',
                    }}
                />
            </div>
        );
    }

    if (!series) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <p className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                    Series not found
                </p>
                <button onClick={goBack} className="btn-primary">
                    {t('common.back')}
                </button>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto p-6" style={{ backgroundColor: 'var(--color-surface-primary)' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={goBack}
                        className="p-2 rounded-lg transition-all hover:bg-white/5 hover:scale-110 active:scale-90"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        <ChevronLeftIcon />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            {series.name}
                        </h1>
                        <p className="text-sm opacity-60" style={{ color: 'var(--color-text-muted)' }}>
                            {series.path}
                        </p>
                    </div>
                </div>

                {/* Sort Controls */}
                {series.chapters && series.chapters.length > 0 && (
                    <div className="flex items-center bg-surface-tertiary rounded-lg p-1 border border-white/5">
                            <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'name' | 'pages')}
                            className="bg-transparent text-sm border-none focus:ring-0 cursor-pointer pl-2 pr-8 text-text-secondary hover:text-text-primary"
                            style={{ outline: 'none' }}
                        >
                            <option value="name">Name</option>
                            <option value="pages">Pages</option>
                        </select>
                        <div className="w-px h-4 bg-white/10 mx-1" />
                        <Tooltip content={sortOrder === 'asc' ? t('common.ascending') : t('common.descending')} placement="bottom">
                            <button
                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="p-1.5 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                            >
                                {sortOrder === 'asc' ? <SortAscIcon /> : <SortDescIcon />}
                            </button>
                        </Tooltip>
                    </div>
                )}
            </div>

            {/* Chapters Grid */}
            <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-fade-in"
            >
                {sortedChapters.map((chapter: ChapterInfo) => (
                    <div
                        key={chapter.path}
                        onClick={() => handleOpenChapter(chapter.path)}
                        className="group flex flex-col cursor-pointer animate-slide-in-right"
                    >
                        <div
                            className="aspect-[3/4] rounded-xl overflow-hidden mb-3 relative shadow-lg"
                            style={{ backgroundColor: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)' }}
                        >
                            {thumbnails[chapter.path] ? (
                                <img
                                    src={thumbnails[chapter.path]}
                                    alt={chapter.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-20">
                                    <ImageIcon />
                                </div>
                            )}

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="bg-accent text-white px-4 py-2 rounded-full font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                    Read Now
                                </span>
                            </div>
                        </div>

                        <h3
                            className="font-bold truncate group-hover:text-accent transition-colors"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            {chapter.name}
                        </h3>
                        <p className="text-xs opacity-60" style={{ color: 'var(--color-text-muted)' }}>
                            {chapter.imageCount} pages
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default SeriesDetailsPage;
