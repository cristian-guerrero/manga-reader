/**
 * HomePage - Welcome screen with recent history and folder selection
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../../stores/navigationStore';
import { EventsOn, EventsOff } from '../../../wailsjs/runtime';
import { Button } from '../common/Button';
import { Tooltip } from '../common/Tooltip';

// Icons
const FolderPlusIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        <line x1="12" y1="11" x2="12" y2="17" />
        <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
);

const BookOpenIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

const TrashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

// Thumbnail cache to avoid reloading
const thumbnailCache = new Map<string, string>();

// Thumbnail component with lazy loading - only loads when visible
// Uses GetFolderInfoShallow instead of GetImages to avoid recursive scanning (like ExplorerPage)
function ThumbnailComponent({ entryId, folderPath }: { entryId: string; folderPath: string }) {
    const [thumbnail, setThumbnail] = useState<string | null>(thumbnailCache.get(entryId) || null);
    const ref = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);
    const isMountedRef = useRef(true);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            loadingRef.current = false;
        };
    }, []);

    useEffect(() => {
        // If already cached, use it immediately
        const cached = thumbnailCache.get(entryId);
        if (cached) {
            setThumbnail(cached);
            return;
        }

        if (!ref.current || loadingRef.current || thumbnail) return;

        // Clean up previous observer and timer
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        const observer = new IntersectionObserver(
            ([obsEntry]) => {
                if (obsEntry.isIntersecting && !loadingRef.current && !thumbnail && isMountedRef.current) {
                    // Check cache again before loading
                    const cached = thumbnailCache.get(entryId);
                    if (cached) {
                        if (isMountedRef.current) {
                            setThumbnail(cached);
                        }
                        observer.disconnect();
                        observerRef.current = null;
                        return;
                    }

                    loadingRef.current = true;

                    // Load thumbnail asynchronously with delay to avoid blocking
                    timerRef.current = setTimeout(async () => {
                        if (!isMountedRef.current) {
                            loadingRef.current = false;
                            return;
                        }

                        try {
                            // Use GetFolderInfoShallow (only scans immediate directory, not recursive)
                            // This is much faster than GetImages which scans all subdirectories recursively
                            // Based on how ExplorerPage does it for better performance
                            // @ts-ignore
                            const folderInfo = await window.go?.main?.App?.GetFolderInfoShallow(folderPath);
                            if (!isMountedRef.current) {
                                loadingRef.current = false;
                                return;
                            }

                            if (folderInfo && folderInfo.coverImage) {
                                // @ts-ignore
                                const thumb = await window.go?.main?.App?.GetThumbnail(folderInfo.coverImage);
                                
                                if (!isMountedRef.current) {
                                    loadingRef.current = false;
                                    return;
                                }

                                if (thumb) {
                                    // Cache the thumbnail
                                    thumbnailCache.set(entryId, thumb);
                                    if (isMountedRef.current) {
                                        setThumbnail(thumb);
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('Failed to load thumbnail:', error);
                        } finally {
                            loadingRef.current = false;
                            timerRef.current = null;
                        }
                    }, 100); // Small delay to yield to browser

                    observer.disconnect();
                    observerRef.current = null;
                }
            },
            { rootMargin: '200px' } // Same as ExplorerPage
        );

        observerRef.current = observer;
        observer.observe(ref.current);
        
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [entryId, folderPath, thumbnail]);

    return (
        <div ref={ref} className="w-full h-full">
            {thumbnail ? (
                <img src={thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted">
                    <BookOpenIcon />
                </div>
            )}
        </div>
    );
}

export function HomePage() {
    const { t } = useTranslation();
    const { navigate } = useNavigationStore();
    const [historyEntries, setHistoryEntries] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isMountedRef = useRef(true);
    const historyEntriesRef = useRef<any[]>([]);

    // Keep ref in sync with state
    useEffect(() => {
        historyEntriesRef.current = historyEntries;
    }, [historyEntries]);

    const loadRecentHistory = useCallback(async () => {
        if (!isMountedRef.current) return;

        try {
            // @ts-ignore
            const app = window.go?.main?.App;
            if (!app?.GetHistory) {
                // Bindings not available - this shouldn't happen in normal operation
                console.warn('[HomePage] Bindings not available yet');
                if (isMountedRef.current) {
                    setIsLoading(false);
                }
                return;
            }

            // Set loading state
            if (isMountedRef.current) {
                setIsLoading(true);
            }

            const entries = await app.GetHistory();
            console.log(`[HomePage] History received: ${entries?.length || 0} items`);

            if (!isMountedRef.current) return;

            if (entries && Array.isArray(entries) && entries.length > 0) {
                // Show up to 4 recent items
                const recent = entries.slice(0, 4);
                setHistoryEntries(recent);
                setIsLoading(false); // Show UI immediately - thumbnails will load lazily
            } else {
                setHistoryEntries([]);
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Failed to load history', error);
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        let unsubscribeHistory: () => void;
        let unsubscribeAppReady: () => void;

        // Try to load immediately - bindings should be available
        loadRecentHistory();

        // Also listen for app_ready event in case bindings weren't ready immediately
        unsubscribeAppReady = EventsOn('app_ready', () => {
            console.log('[HomePage] Received app_ready event');
            // Use ref instead of state to avoid closure issues
            if (isMountedRef.current && historyEntriesRef.current.length === 0) {
                loadRecentHistory();
            }
        });

        unsubscribeHistory = EventsOn('history_updated', () => {
            console.log('[HomePage] Received history_updated event');
            if (isMountedRef.current) {
                loadRecentHistory();
            }
        });

        return () => {
            isMountedRef.current = false;
            if (unsubscribeHistory) unsubscribeHistory();
            if (unsubscribeAppReady) unsubscribeAppReady();
        };
    }, [loadRecentHistory]);

    const handleContinue = (path: string) => {
        navigate('viewer', { folder: path });
    };

    const handleRemoveHistory = async (path: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            // @ts-ignore
            await window.go?.main?.App?.RemoveHistory(path);
            // The list will refresh via the history_updated event
        } catch (error) {
            console.error('Failed to remove history', error);
        }
    };

    const handleSelectFolder = async () => {
        navigate('oneShot');
    };

    return (
        <div
            className="flex flex-col items-center min-h-full px-8 py-12 animate-fade-in"
        >
            {historyEntries.length > 0 ? (
                <div className="w-full max-w-6xl space-y-12">
                    {/* Featured Recent Item (The very last one read) */}
                    <div className="w-full flex flex-col md:flex-row gap-8 items-center bg-surface-secondary p-8 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden animate-scale-in">
                        {/* Background Glow */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/10 blur-3xl rounded-full pointer-events-none" />

                        {/* Thumbnail / Cover */}
                        <div
                            className="w-48 h-72 rounded-lg overflow-hidden shadow-lg flex-shrink-0 bg-surface-tertiary relative group cursor-pointer border border-white/5 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                            onClick={() => handleContinue(historyEntries[0].folderPath)}
                        >
                            <ThumbnailComponent
                                entryId={historyEntries[0].id}
                                folderPath={historyEntries[0].folderPath}
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <div className="bg-accent text-white p-3 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                    <BookOpenIcon />
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 flex flex-col items-start text-left">
                            <div
                                className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-semibold mb-3 tracking-wider animate-slide-in-right"
                            >
                                CONTINUE READING
                            </div>

                            <h1 className="text-3xl font-bold text-text-primary mb-2 line-clamp-2 animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
                                {historyEntries[0].folderName}
                            </h1>

                            <p className="text-text-secondary mb-6 line-clamp-1 opacity-60 text-sm animate-slide-in-right" style={{ animationDelay: '0.15s' }}>
                                {historyEntries[0].folderPath}
                            </p>

                            <div className="w-full bg-surface-tertiary h-2 rounded-full mb-2 overflow-hidden">
                                <div
                                    className="h-full bg-accent transition-all duration-1000 ease-out"
                                    style={{
                                        width: `${Math.round(((historyEntries[0].lastImageIndex + 1) / historyEntries[0].totalImages) * 100)}%`,
                                        transitionDelay: '0.5s'
                                    }}
                                />
                            </div>
                            <div className="flex justify-between w-full text-sm text-text-muted mb-8">
                                <span>Page {historyEntries[0].lastImageIndex + 1} of {historyEntries[0].totalImages}</span>
                                <span>{Math.round(((historyEntries[0].lastImageIndex + 1) / historyEntries[0].totalImages) * 100)}% Complete</span>
                            </div>

                            <div className="flex gap-4 w-full">
                                <Button
                                    onClick={() => handleContinue(historyEntries[0].folderPath)}
                                    variant="primary"
                                    className="flex-1 py-3 text-lg shadow-lg shadow-accent/20"
                                >
                                    Continue Reading
                                </Button>

                                <Tooltip content={t('common.remove') || "Remove from history"} placement="left">
                                    <button
                                        onClick={(e) => handleRemoveHistory(historyEntries[0].folderPath, e)}
                                        className="px-4 py-3 rounded-xl bg-surface-tertiary text-text-muted hover:text-red-500 transition-all hover:scale-[1.05] active:scale-[0.95] border border-white/5"
                                        aria-label={t('common.remove') || "Remove from history"}
                                    >
                                        <TrashIcon />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    </div>

                    {/* Other Recent Items Grid */}
                    {historyEntries.length > 1 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                                <span className="w-1 h-6 bg-accent rounded-full" />
                                Recent History
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                {historyEntries.slice(1).map((entry, idx) => (
                                    <div
                                        key={entry.id}
                                        className="bg-surface-secondary rounded-xl overflow-hidden border border-white/5 hover:border-accent/30 transition-all group flex flex-col hover:-translate-y-1 animate-scale-in"
                                        style={{ animationDelay: `${(idx + 1) * 0.05}s` }}
                                        onClick={() => handleContinue(entry.folderPath)}
                                    >
                                        <div className="aspect-[3/4] relative overflow-hidden bg-surface-tertiary">
                                            <ThumbnailComponent
                                                entryId={entry.id}
                                                folderPath={entry.folderPath}
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-tertiary">
                                                <div
                                                    className="h-full bg-accent"
                                                    style={{ width: `${Math.round(((entry.lastImageIndex + 1) / entry.totalImages) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-bold text-text-primary line-clamp-1 mb-1 group-hover:text-accent transition-colors">
                                                    {entry.folderName}
                                                </h3>
                                                <p className="text-xs text-text-muted line-clamp-1 opacity-80">
                                                    {entry.folderPath}
                                                </p>
                                            </div>
                                            <div className="mt-4 flex items-end justify-between">
                                                <div className="text-xs font-semibold text-accent uppercase tracking-tighter">
                                                    Page {entry.lastImageIndex + 1} of {entry.totalImages}
                                                </div>
                                                <Tooltip content={t('common.remove') || "Remove"} placement="top">
                                                    <button
                                                        onClick={(e) => handleRemoveHistory(entry.folderPath, e)}
                                                        className="p-1.5 rounded-lg bg-surface-tertiary/50 text-text-muted hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-90"
                                                        aria-label={t('common.remove') || "Remove"}
                                                    >
                                                        <TrashIcon />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Browse More Card */}
                                <div
                                    className="bg-surface-secondary/50 rounded-xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center cursor-pointer hover:border-accent/40 transition-all py-12 hover:scale-[0.98] animate-scale-in"
                                    style={{ animationDelay: '0.2s' }}
                                    onClick={() => navigate('history')}
                                >
                                    <div className="w-12 h-12 rounded-full bg-surface-tertiary flex items-center justify-center mb-4 text-text-muted group-hover:text-accent transition-colors">
                                        <ArrowRightIcon />
                                    </div>
                                    <span className="text-sm font-bold text-text-secondary">View Full History</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // Welcome View (No History)
                <div
                    className="flex flex-col items-center text-center max-w-2xl animate-scale-in"
                >
                    {/* Animated Logo */}
                    <div
                        className="relative mb-8"
                    >
                        {/* Glow effect */}
                        <div
                            className="absolute inset-0 rounded-full blur-3xl animate-pulse-slow"
                            style={{
                                backgroundColor: 'var(--color-accent-glow)',
                                animationDuration: '3s'
                            }}
                        />

                        {/* Icon container */}
                        <div
                            className="relative flex items-center justify-center w-24 h-24 rounded-2xl"
                            style={{
                                background: 'var(--gradient-accent)',
                                boxShadow: 'var(--shadow-glow)',
                                animation: 'rotateLogo 4s ease-in-out infinite'
                            }}
                        >
                            <div style={{ color: 'white' }}>
                                <BookOpenIcon />
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <h1
                        className="text-4xl font-bold mb-3 text-gradient animate-slide-in-right"
                    >
                        {t('home.welcome')}
                    </h1>

                    {/* Subtitle */}
                    <p
                        className="text-lg mb-8 animate-slide-in-right"
                        style={{ color: 'var(--color-text-secondary)', animationDelay: '0.1s' }}
                    >
                        {t('home.subtitle')}
                    </p>

                    {/* CTA Button */}
                    {/* CTA Button */}
                    <Button
                        onClick={handleSelectFolder}
                        variant="primary"
                        size="lg"
                        className="group gap-3 px-8 py-4 rounded-xl text-lg animate-slide-in-right"
                        style={{
                            background: 'var(--gradient-accent)',
                            boxShadow: 'var(--shadow-md)',
                            animationDelay: '0.2s'
                        }}
                    >
                        <FolderPlusIcon />
                        <span>{t('home.selectFolder')}</span>
                        <div
                            className="transition-transform group-hover:translate-x-1"
                        >
                            <ArrowRightIcon />
                        </div>
                    </Button>
                </div>
            )}

            {/* Link to full history if displaying welcome screen or if we want to provide access */}
            <div
                className="mt-16 w-full max-w-4xl flex justify-center animate-fade-in"
                style={{ animationDelay: '0.4s' }}
            >
                <button
                    onClick={() => navigate('history')}
                    className="text-sm font-medium px-6 py-2 rounded-full transition-all border border-white/5 bg-surface-secondary text-text-secondary hover:text-white hover:bg-surface-tertiary hover:scale-105 active:scale-95"
                >
                    {t('common.history')} →
                </button>
            </div>


            {/* Decorative Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                {/* Top right gradient */}
                <div
                    className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20 animate-pulse-slow"
                    style={{ backgroundColor: 'var(--color-accent)', animationDuration: '4s' }}
                />
                {/* Bottom left gradient */}
                <div
                    className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-10 animate-pulse-slow"
                    style={{ backgroundColor: 'var(--color-accent)', animationDuration: '5s' }}
                />
            </div>
        </div>
    );
}

export default HomePage;
