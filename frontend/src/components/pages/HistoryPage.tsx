/**
 * HistoryPage - Reading history management with virtualization
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../../stores/navigationStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToast } from '../common/Toast';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Tooltip } from '../common/Tooltip';
import { GridContainer } from '../common/GridContainer';
import { GridItem } from '../common/GridItem';
import { EventsOn, EventsOff } from '../../../wailsjs/runtime';

// Icons
const ClockIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const PlayIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
);

const TrashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

const GridIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
    </svg>
);

const ListIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
);

interface HistoryEntry {
    id: string;
    folderPath: string;
    folderName: string;
    lastImage: string;
    lastImageIndex: number;
    scrollPosition: number;
    totalImages: number;
    lastRead: string;
}

// Virtualized list component with improved performance
function VirtualizedList({
    items,
    itemHeight,
    containerRef,
    renderItem,
    overscan = 5
}: {
    items: HistoryEntry[];
    itemHeight: number;
    containerRef: React.RefObject<HTMLDivElement>;
    renderItem: (item: HistoryEntry, index: number) => React.ReactNode;
    overscan?: number;
}) {
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(20, items.length) });
    const rafIdRef = useRef<number | null>(null);
    const lastScrollTopRef = useRef<number>(0);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateVisibleRange = () => {
            const scrollTop = container.scrollTop;
            const containerHeight = container.clientHeight;
            
            // Only update if scroll position changed significantly (more than 50px)
            if (Math.abs(scrollTop - lastScrollTopRef.current) < 50 && rafIdRef.current) {
                return;
            }
            
            lastScrollTopRef.current = scrollTop;
            
            const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
            const end = Math.min(
                items.length,
                Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
            );

            setVisibleRange(prev => {
                // Only update if range actually changed
                if (prev.start === start && prev.end === end) {
                    return prev;
                }
                return { start, end };
            });
        };

        // Initial calculation
        updateVisibleRange();
        
        // Throttled scroll handler using requestAnimationFrame
        const handleScroll = () => {
            if (rafIdRef.current) return;
            
            rafIdRef.current = requestAnimationFrame(() => {
                updateVisibleRange();
                rafIdRef.current = null;
            });
        };
        
        container.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, [items.length, itemHeight, overscan, containerRef]);

    const visibleItems = items.slice(visibleRange.start, visibleRange.end);
    const totalHeight = items.length * itemHeight;
    const offsetY = visibleRange.start * itemHeight;

    return (
        <div style={{ position: 'relative', height: totalHeight, willChange: 'transform' }}>
            <div style={{ transform: `translateY(${offsetY}px)`, willChange: 'transform' }}>
                {visibleItems.map((item, index) => (
                    <div key={item.id} style={{ height: itemHeight }}>
                        {renderItem(item, visibleRange.start + index)}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Thumbnail cache to avoid reloading
const thumbnailCache = new Map<string, string>();

// Simple thumbnail component - loads only when visible with caching
function SimpleThumbnail({ entry }: { entry: HistoryEntry }) {
    const [thumbnail, setThumbnail] = useState<string | null>(thumbnailCache.get(entry.id) || null);
    const [isLoading, setIsLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);

    useEffect(() => {
        // If already cached, use it immediately
        const cached = thumbnailCache.get(entry.id);
        if (cached) {
            setThumbnail(cached);
            return;
        }

        if (!ref.current || loadingRef.current || thumbnail) return;

        const observer = new IntersectionObserver(
            ([obsEntry]) => {
                if (obsEntry.isIntersecting && !loadingRef.current && !thumbnail) {
                    // Check cache again before loading
                    const cached = thumbnailCache.get(entry.id);
                    if (cached) {
                        setThumbnail(cached);
                        observer.disconnect();
                        return;
                    }

                    loadingRef.current = true;
                    setIsLoading(true);
                    
                    // Load thumbnail asynchronously with delay to avoid blocking
                    // Use GetFolderInfoShallow instead of GetImages to avoid recursive scanning
                    // This is much faster and follows the pattern from ExplorerPage
                    const loadTimer = setTimeout(async () => {
                        try {
                            // @ts-ignore
                            const folderInfo = await window.go?.main?.App?.GetFolderInfoShallow(entry.folderPath);
                            if (folderInfo && folderInfo.coverImage) {
                                // @ts-ignore
                                const thumb = await window.go?.main?.App?.GetThumbnail(folderInfo.coverImage);
                                if (thumb) {
                                    // Cache the thumbnail
                                    thumbnailCache.set(entry.id, thumb);
                                    setThumbnail(thumb);
                                }
                            }
                        } catch (error) {
                            // Silently fail
                        } finally {
                            setIsLoading(false);
                            loadingRef.current = false;
                        }
                    }, 100); // Small delay to yield to browser
                    
                    observer.disconnect();
                    
                    return () => clearTimeout(loadTimer);
                }
            },
            { rootMargin: '200px' } // Same as ExplorerPage for consistency
        );

        observer.observe(ref.current);
        return () => {
            observer.disconnect();
        };
    }, [entry, thumbnail]);

    return (
        <div ref={ref} className="relative w-full h-full">
            {thumbnail ? (
                <img
                    src={thumbnail}
                    alt={entry.folderName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
            ) : (
                <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-text-muted)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                </div>
            )}
        </div>
    );
}

export function HistoryPage() {
    const { t } = useTranslation();
    const { navigate } = useNavigationStore();
    const { showToast } = useToast();
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isClearHistoryOpen, setIsClearHistoryOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        const saved = localStorage.getItem('history_viewMode');
        return (saved === 'grid' || saved === 'list') ? saved : 'list';
    });
    const { enableHistory } = useSettingsStore();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isMountedRef = useRef(true);

    // Save view mode preference
    useEffect(() => {
        localStorage.setItem('history_viewMode', viewMode);
    }, [viewMode]);

    const loadHistory = useCallback(async () => {
        if (!isMountedRef.current) return;

        try {
            // @ts-ignore - Wails generated bindings
            const app = window.go?.main?.App;
            if (!app?.GetHistory) {
                // Bindings not available - this shouldn't happen in normal operation
                console.warn('[HistoryPage] Bindings not available yet');
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
                setTimeout(() => reject(new Error('Timeout loading history')), 10000); // 10 second timeout
            });

            const historyPromise = app.GetHistory();
            const entries = await Promise.race([historyPromise, timeoutPromise]) as any[];

            if (!isMountedRef.current) return;

            if (entries && Array.isArray(entries)) {
                setHistory(entries);
            } else {
                setHistory([]);
            }
            setIsLoading(false);
        } catch (error) {
            console.error('Failed to load history:', error);
            if (isMountedRef.current) {
                setHistory([]);
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        let unsubscribeHistory: () => void;
        let unsubscribeAppReady: () => void;

        if (enableHistory) {
            // Try to load immediately - bindings should be available
            loadHistory();

            // Listen for app_ready event in case bindings weren't ready immediately
            unsubscribeAppReady = EventsOn('app_ready', () => {
                console.log('[HistoryPage] Received app_ready event');
                if (isMountedRef.current && enableHistory) {
                    loadHistory();
                }
            });

            unsubscribeHistory = EventsOn('history_updated', () => {
                if (isMountedRef.current) loadHistory();
            });
        } else {
            setIsLoading(false);
            setHistory([]);
        }

        return () => {
            isMountedRef.current = false;
            if (unsubscribeHistory) unsubscribeHistory();
            if (unsubscribeAppReady) unsubscribeAppReady();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enableHistory]); // Only depend on enableHistory, loadHistory is stable

    const handleContinue = (entry: HistoryEntry) => {
        navigate('viewer', { folder: entry.folderPath });
    };

    const handleRemove = async (entry: HistoryEntry, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            // @ts-ignore - Wails generated bindings
            await window.go?.main?.App?.RemoveHistory(entry.folderPath);
            setHistory((prev) => prev.filter((h) => h.id !== entry.id));
        } catch (error) {
            console.error('Failed to remove history entry:', error);
        }
    };

    const handleClearAllClick = () => {
        setIsClearHistoryOpen(true);
    };

    const confirmClearAll = async () => {
        try {
            // @ts-ignore - Wails generated bindings
            await window.go?.main?.App?.ClearHistory();
            setHistory([]);
            setIsClearHistoryOpen(false);
            showToast(t('history.clearSuccess') || 'History cleared successfully', 'success');
        } catch (error) {
            console.error('Failed to clear history:', error);
            showToast(t('history.clearError') || 'Failed to clear history', 'error');
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateString;
        }
    };

    const getProgress = (entry: HistoryEntry) => {
        if (entry.totalImages === 0) return 0;
        return Math.round(((entry.lastImageIndex + 1) / entry.totalImages) * 100);
    };

    const renderListItem = useCallback((entry: HistoryEntry, index: number) => {
    return (
        <div
                onClick={() => handleContinue(entry)}
                className="group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:border-accent hover-lift"
                    style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        border: '1px solid var(--color-border)',
                    }}
                >
                {/* Thumbnail */}
                            <div
                                className="relative w-20 h-28 rounded-lg overflow-hidden flex-shrink-0"
                                style={{ backgroundColor: 'var(--color-surface-tertiary)' }}
                            >
                    <SimpleThumbnail entry={entry} />

                                {/* Play overlay */}
                                <div
                                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                                        style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                                    >
                                        <PlayIcon />
                                    </div>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h3
                                    className="font-semibold truncate mb-1"
                                    style={{ color: 'var(--color-text-primary)' }}
                                >
                                    {entry.folderName}
                                </h3>

                                <p
                                    className="text-sm mb-2"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >
                                    {t('history.continueFrom')} {entry.lastImageIndex + 1} / {entry.totalImages}
                                </p>

                                {/* Progress bar */}
                                <div className="flex items-center gap-2">
                                    <div
                                        className="flex-1 h-1.5 rounded-full overflow-hidden"
                                        style={{ backgroundColor: 'var(--color-surface-tertiary)' }}
                                    >
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                backgroundColor: 'var(--color-accent)',
                                                width: `${getProgress(entry)}%`
                                            }}
                                        />
                                    </div>
                                    <span
                                        className="text-xs font-medium"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        {getProgress(entry)}%
                                    </span>
                                </div>
                            </div>

                            {/* Date and actions */}
                            <div className="flex flex-col items-end gap-2">
                                <span
                                    className="text-xs"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >
                                    {formatDate(entry.lastRead)}
                                </span>

                                <Tooltip content={t('history.remove') || 'Remove'} placement="left">
                                    <button
                                        onClick={(e) => handleRemove(entry, e)}
                                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 active:scale-90"
                                        style={{
                                            backgroundColor: 'var(--color-surface-tertiary)',
                                            color: '#ef4444',
                                        }}
                                    >
                                        <TrashIcon />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
        );
    }, [t]);

    const renderGridItem = useCallback((entry: HistoryEntry, index: number) => {
        return (
                        <GridItem key={entry.id}>
                            <div
                                onClick={() => handleContinue(entry)}
                    className="group/card relative rounded-xl overflow-hidden cursor-pointer hover-lift shadow-sm hover:border-accent transition-all"
                                style={{
                                    backgroundColor: 'var(--color-surface-secondary)',
                                    border: '1px solid var(--color-border)',
                                }}
                            >
                                {/* Thumbnail */}
                                <div
                                    className="aspect-[3/4] relative overflow-hidden"
                                    style={{ backgroundColor: 'var(--color-surface-tertiary)' }}
                                >
                        <SimpleThumbnail entry={entry} />

                                    {/* Play overlay */}
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none"
                                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                                    >
                                        <div
                                            className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-2xl backdrop-blur-md"
                                            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                                        >
                                            <PlayIcon />
                                        </div>
                                    </div>

                                    {/* Remove button */}
                                    <div className="absolute top-2 right-2 z-20 opacity-0 group-hover/card:opacity-100 transition-all">
                                        <Tooltip content={t('history.remove') || 'Remove'} placement="left">
                                            <button
                                                onClick={(e) => handleRemove(entry, e)}
                                                className="p-2 rounded-full hover:scale-110 active:scale-90"
                                                style={{
                                                    backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                                    color: 'white',
                                                }}
                                                aria-label={t('history.remove') || 'Remove'}
                                            >
                                                <TrashIcon />
                                            </button>
                                        </Tooltip>
                                    </div>

                                    {/* Progress overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div
                                                className="flex-1 h-1.5 rounded-full overflow-hidden"
                                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                                            >
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        backgroundColor: 'var(--color-accent)',
                                                        width: `${getProgress(entry)}%`
                                                    }}
                                                />
                                            </div>
                                            <span
                                                className="text-xs font-medium text-white"
                                            >
                                                {getProgress(entry)}%
                                            </span>
                                        </div>
                                        <span
                                            className="text-xs text-white/80"
                                        >
                                            {entry.lastImageIndex + 1} / {entry.totalImages}
                                        </span>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-3">
                                    <h3
                                        className="font-semibold truncate mb-1"
                                        style={{ color: 'var(--color-text-primary)' }}
                                    >
                                        {entry.folderName}
                                    </h3>
                                    <p
                                        className="text-xs"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        {formatDate(entry.lastRead)}
                                    </p>
                                </div>
                            </div>
                        </GridItem>
        );
    }, [t]);

    return (
        <div
            className="h-full overflow-hidden p-6 flex flex-col"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <h1
                    className="text-2xl font-bold"
                    style={{ color: 'var(--color-text-primary)' }}
                >
                    {t('history.title')}
                </h1>
                <div className="flex items-center gap-2">
                    {enableHistory && history.length > 0 && (
                        <>
                            {/* View mode toggle */}
                            <div className="flex items-center bg-surface-tertiary rounded-lg p-1 border border-white/5">
                                <Tooltip content={t('history.listView') || 'List View'} placement="bottom">
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-1.5 rounded transition-colors ${
                                            viewMode === 'list'
                                                ? 'bg-accent text-white'
                                                : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                                        }`}
                                    >
                                        <ListIcon />
                                    </button>
                                </Tooltip>
                                <Tooltip content={t('history.gridView') || 'Grid View'} placement="bottom">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-1.5 rounded transition-colors ${
                                            viewMode === 'grid'
                                                ? 'bg-accent text-white'
                                                : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                                        }`}
                                    >
                                        <GridIcon />
                                    </button>
                                </Tooltip>
                            </div>
                            <Tooltip content={t('history.clearHistory')} placement="bottom">
                                <button
                                    onClick={handleClearAllClick}
                                    className="btn-ghost text-sm flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                                    style={{ color: '#ef4444' }}
                                >
                                    <TrashIcon />
                                    {t('history.clearHistory')}
                                </button>
                            </Tooltip>
                        </>
                    )}
                </div>
            </div>

            {/* History content */}
            <div className="flex-1 overflow-hidden">
                {!enableHistory ? (
                    <div
                        className="flex flex-col items-center justify-center py-20 animate-fade-in"
                    >
                        <div
                            className="mb-4 text-4xl"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            🚫
                        </div>
                        <p
                            className="text-lg font-medium"
                            style={{ color: 'var(--color-text-secondary)' }}
                        >
                            {t('history.disabled')}
                        </p>
                        <p
                            className="text-sm mt-2"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            {t('history.disabledDesc')}
                        </p>
                    </div>
                ) : isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div
                            className="w-12 h-12 border-4 rounded-full animate-spin"
                            style={{
                                borderColor: 'var(--color-accent)',
                                borderTopColor: 'transparent',
                            }}
                        />
                    </div>
                ) : history.length === 0 ? (
                    <div
                        className="flex flex-col items-center justify-center py-20 rounded-2xl animate-scale-in"
                        style={{
                            backgroundColor: 'var(--color-surface-secondary)',
                            border: '1px solid var(--color-border)',
                        }}
                    >
                        <div
                            className="mb-4 animate-pulse"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            <ClockIcon />
                        </div>
                        <p
                            className="text-lg font-medium"
                            style={{ color: 'var(--color-text-secondary)' }}
                        >
                            {t('history.noHistory')}
                        </p>
                    </div>
                ) : viewMode === 'list' ? (
                    <div
                        ref={scrollContainerRef}
                        className="h-full overflow-auto space-y-3"
                        style={{ scrollbarGutter: 'stable' }}
                    >
                        <VirtualizedList
                            items={history}
                            itemHeight={120} // Approximate height of list item
                            containerRef={scrollContainerRef}
                            renderItem={renderListItem}
                            overscan={3}
                        />
                    </div>
                ) : (
                    <div
                        ref={scrollContainerRef}
                        className="h-full overflow-auto"
                        style={{ scrollbarGutter: 'stable' }}
                    >
                        <GridContainer>
                            {history.map((entry, index) => renderGridItem(entry, index))}
                </GridContainer>
                    </div>
            )}
            </div>

            {/* Clear History Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isClearHistoryOpen}
                onClose={() => setIsClearHistoryOpen(false)}
                onConfirm={confirmClearAll}
                title={t('history.clearHistory')}
                message={t('history.confirmClear')}
                isDestructive={true}
                confirmText={t('common.confirm') || 'Confirm'}
                cancelText={t('common.cancel') || 'Cancel'}
                icon={<TrashIcon />}
            />
        </div>
    );
}

export default HistoryPage;
