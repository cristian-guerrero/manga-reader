import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../../stores/navigationStore';
import { useToast } from '../common/Toast';
import { Tooltip } from '../common/Tooltip';
import { SortControls } from '../common/SortControls';
import { GridItem } from '../common/GridItem';
import { GridContainer } from '../common/GridContainer';

// Icons
const TrashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);


// Interfaces for backend data
interface BaseFolder {
    path: string;
    name: string;
    addedAt: string;
    isVisible: boolean;
    hasImages?: boolean;
    thumbnailUrl?: string;
}

interface ExplorerEntry {
    path: string;
    name: string;
    isDirectory: boolean;
    hasImages: boolean;
    imageCount: number;
    coverImage: string;
    thumbnailUrl?: string; // Add this
    size: number;
    lastModified: number;
}

// Robust Lazy Image component using IntersectionObserver
function LazyImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
    const [isVisible, setIsVisible] = useState(false);
    const [ref, setRef] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!ref) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' } // Load a bit earlier
        );

        observer.observe(ref);
        return () => observer.disconnect();
    }, [ref]);

    return (
        <div ref={setRef} className="w-full h-full bg-surface-tertiary overflow-hidden">
            {isVisible ? (
                <img
                    src={src}
                    alt={alt}
                    className={className}
                    onLoad={(e) => {
                        (e.target as HTMLImageElement).classList.add('opacity-100');
                    }}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
                </div>
            )}
        </div>
    );
}

// Helper functions for sort preferences per path
const getSortPreferences = (path: string | null) => {
    const key = path || 'root';
    try {
        const stored = localStorage.getItem('explorer_sortPreferences');
        if (stored) {
            const prefs = JSON.parse(stored);
            return prefs[key] || { sortBy: 'name', sortOrder: 'asc' };
        }
    } catch (e) {
        console.error('Failed to load sort preferences', e);
    }
    return { sortBy: 'name', sortOrder: 'asc' };
};

const saveSortPreferences = (path: string | null, sortBy: 'name' | 'date', sortOrder: 'asc' | 'desc') => {
    const key = path || 'root';
    try {
        const stored = localStorage.getItem('explorer_sortPreferences');
        const prefs = stored ? JSON.parse(stored) : {};
        prefs[key] = { sortBy, sortOrder };
        localStorage.setItem('explorer_sortPreferences', JSON.stringify(prefs));
    } catch (e) {
        console.error('Failed to save sort preferences', e);
    }
};

export function ExplorerPage() {
    const { t } = useTranslation();
    const { navigate } = useNavigationStore();
    const { showToast } = useToast();

    const [baseFolders, setBaseFolders] = useState<BaseFolder[]>([]);
    const [currentPath, setCurrentPath] = useState<string | null>(null);
    const [pathHistory, setPathHistory] = useState<string[]>([]);
    const [entries, setEntries] = useState<ExplorerEntry[]>([]);
    const [loading, setLoading] = useState(false);

    // Sorting state - initialized with root preferences
    const [sortBy, setSortBy] = useState<'name' | 'date'>(() => {
        return getSortPreferences(null).sortBy;
    });
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
        return getSortPreferences(null).sortOrder;
    });

    // Track if preferences have been loaded for current path
    const preferencesLoadedRef = useRef(false);

    // Load sort preferences when path changes
    useEffect(() => {
        const prefs = getSortPreferences(currentPath);
        setSortBy(prefs.sortBy);
        setSortOrder(prefs.sortOrder);
        preferencesLoadedRef.current = true;
    }, [currentPath]);

    // Save sort preference when it changes (but only after initial load)
    useEffect(() => {
        if (preferencesLoadedRef.current) {
            saveSortPreferences(currentPath, sortBy, sortOrder);
        }
    }, [sortBy, sortOrder, currentPath]);

    // Initial load
    useEffect(() => {
        loadBaseFolders();

        // Listen for updates
        const unlisten = (window as any).runtime?.EventsOn("explorer_updated", () => {
            loadBaseFolders();
            if (currentPath) {
                loadDirectory(currentPath, false);
            }
        });

        return () => {
            // Cleanup
        };
    }, [currentPath]);

    const loadBaseFolders = async () => {
        try {
            // @ts-ignore
            const folders = await window.go.main.App.GetBaseFolders();
            setBaseFolders(folders || []);
        } catch (error) {
            console.error("Failed to load base folders", error);
        }
    };

    const loadDirectory = async (path: string, pushHistory = true) => {
        setLoading(true);
        try {
            // @ts-ignore
            const items = await window.go.main.App.ExploreFolder(path);
            setEntries(items || []);

            if (pushHistory && currentPath && currentPath !== path) {
                setPathHistory(prev => [...prev, currentPath]);
            }

            setCurrentPath(path);
        } catch (error) {
            console.error("Failed to load directory", error);
            showToast(t('explorer.loadFailed') || "Failed to load directory", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (pathHistory.length > 0) {
            const previous = pathHistory[pathHistory.length - 1];
            setPathHistory(prev => prev.slice(0, -1));
            loadDirectory(previous, false);
        } else {
            setCurrentPath(null);
            setPathHistory([]);
        }
    };

    const handleAddBaseFolder = async () => {
        try {
            // @ts-ignore
            const path = await window.go.main.App.SelectFolder();
            if (path) {
                // @ts-ignore
                await window.go.main.App.AddBaseFolder(path);
                showToast(t('explorer.folderAdded') || "Folder added to explorer", "success");
                loadBaseFolders(); // Refresh
            }
        } catch (error) {
            console.error("Failed to add base folder", error);
            showToast(t('explorer.addFailed') || "Failed to add folder", "error");
        }
    };

    const handleRemoveBaseFolder = async (path: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            // @ts-ignore
            await window.go.main.App.RemoveBaseFolder(path);
            showToast(t('explorer.folderRemoved') || "Folder removed", "success");

            // If we deleted the current folder, go back to root
            if (currentPath === path) {
                setCurrentPath(null);
            }
            loadBaseFolders();
        } catch (error) {
            console.error("Failed to remove base folder", error);
        }
    };

    const handleOpenInViewer = (path: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigate('viewer', { folder: path });
    };

    const handleItemClick = (entry: ExplorerEntry | BaseFolder) => {
        if ('addedAt' in entry) {
            loadDirectory(entry.path);
        } else {
            const e = entry as ExplorerEntry;
            if (e.isDirectory) {
                loadDirectory(e.path);
            } else {
                // It's a file - if it's an image, we could open viewer at parent folder or just this image
                // For now, let's open viewer in the current directory if it has images
                if (currentPath) {
                    navigate('viewer', { folder: currentPath });
                }
            }
        }
    };

    // Sort base folders
    const sortedBaseFolders = [...baseFolders].sort((a, b) => {
        let res = 0;
        if (sortBy === 'name') {
            res = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        } else {
            // Date sort - use addedAt for base folders
            const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
            const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
            res = dateA - dateB;
        }
        return sortOrder === 'asc' ? res : -res;
    });

    // Sort entries (directory view)
    const sortedEntries = [...entries].sort((a, b) => {
        let res = 0;
        if (sortBy === 'name') {
            res = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        } else {
            // Date sort - use lastModified for entries
            const dateA = a.lastModified || 0;
            const dateB = b.lastModified || 0;
            res = dateA - dateB;
        }
        return sortOrder === 'asc' ? res : -res;
    });

    return (
        <div className="p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    {currentPath && (
                        <Tooltip content={t('common.back')} placement="right">
                            <button
                                onClick={handleBack}
                                className="p-2 rounded-full hover:bg-white/10 transition-all opacity-100 translate-x-0"
                                aria-label={t('common.back')}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                            </button>
                        </Tooltip>
                    )}
                    <h1 className="text-3xl font-bold tracking-tight text-shadow">
                        {currentPath ? currentPath.split(/[\\/]/).pop() : t('explorer.title')}
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
                        show={Boolean((!currentPath && baseFolders.length > 0) || (currentPath && entries.length > 0))}
                    />
                </div>

                {!currentPath && (
                    <button
                        onClick={handleAddBaseFolder}
                        className="btn-primary transition-transform hover:scale-105 active:scale-95"
                    >
                        <span className="mr-2">+</span>
                        {t('explorer.addBaseFolder')}
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pr-2">
                <GridContainer>
                    {/* Base Folders View */}
                    {!currentPath && sortedBaseFolders.map((folder) => (
                        <GridItem key={folder.path}>
                            <div
                                className="group/card relative bg-surface-secondary rounded-xl overflow-hidden border border-white/5 hover:border-accent/50 transition-all hover:shadow-lg cursor-pointer animate-scale-in"
                                onClick={() => handleItemClick(folder)}
                            >
                            {folder.hasImages && folder.thumbnailUrl ? (
                                <div className="aspect-[2/3] w-full relative overflow-hidden">
                                    <LazyImage
                                        src={folder.thumbnailUrl}
                                        alt={folder.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-0"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />
                                </div>
                            ) : (
                                <div className="aspect-[2/3] w-full flex items-center justify-center bg-surface-tertiary group-hover:bg-surface-elevated transition-colors">
                                    <div className="p-4 rounded-xl bg-accent/10 text-accent">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                        </svg>
                                    </div>
                                </div>
                            )}

                            <div className="absolute top-2 right-2 z-20">
                                <Tooltip content={t('common.remove')} placement="left">
                                    <button
                                        onClick={(e) => handleRemoveBaseFolder(folder.path, e)}
                                        className="p-2 rounded-full bg-red-500/20 text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-red-500/40 backdrop-blur-md"
                                        aria-label={t('common.remove')}
                                    >
                                        <TrashIcon />
                                    </button>
                                </Tooltip>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                                <h3 className="font-semibold text-white truncate text-shadow-sm" title={folder.path}>{folder.name}</h3>
                                <p className="text-xs text-white/60 truncate mt-1 font-mono opacity-80">{folder.path}</p>
                            </div>
                            </div>
                        </GridItem>
                    ))}

                    {/* Directory View */}
                    {currentPath && sortedEntries.map((entry) => (
                        <GridItem key={entry.path}>
                            <div
                                className="group/card relative bg-surface-secondary rounded-xl overflow-hidden border border-white/5 hover:border-accent/50 transition-all hover:shadow-lg cursor-pointer animate-scale-in"
                                onClick={() => handleItemClick(entry)}
                            >
                            {entry.hasImages && entry.coverImage ? (
                                <div className="aspect-[2/3] w-full relative overflow-hidden">
                                    <LazyImage
                                        src={entry.thumbnailUrl || entry.coverImage}
                                        alt={entry.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-0"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />
                                </div>
                            ) : (
                                <div className="aspect-[2/3] w-full flex items-center justify-center bg-surface-tertiary group-hover:bg-surface-elevated transition-colors">
                                    <svg className="w-12 h-12 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                    </svg>
                                </div>
                            )}

                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                <h3 className="font-semibold text-white truncate text-shadow-sm">{entry.name}</h3>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-white/70">
                                        {entry.isDirectory ? (entry.hasImages ? `${entry.imageCount} ${t('explorer.images')}` : t('explorer.folder')) : t('explorer.file')}
                                    </span>
                                    {entry.hasImages && (
                                        <Tooltip content={t('explorer.openInViewer')} placement="left" className="z-10">
                                            <button
                                                onClick={(e) => handleOpenInViewer(entry.path, e)}
                                                className="p-1.5 rounded-full bg-accent text-white hover:bg-accent-hover transform hover:scale-110 transition-all opacity-0 group-hover/card:opacity-100"
                                                aria-label={t('explorer.openInViewer')}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </button>
                                        </Tooltip>
                                    )}
                                </div>
                            </div>
                            </div>
                        </GridItem>
                    ))}
                </GridContainer>

                {!currentPath && baseFolders.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
                        <svg className="w-24 h-24 mb-4 text-surface-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        <p className="text-lg">{t('explorer.noFoldersAdded')}</p>
                        <p className="text-sm mt-1">{t('explorer.addFolderToStart')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
