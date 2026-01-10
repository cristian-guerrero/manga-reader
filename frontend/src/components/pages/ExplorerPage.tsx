import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../../stores/navigationStore';
import { useToast } from '../common/Toast';
import { Tooltip } from '../common/Tooltip';
import { SortControls } from '../common/SortControls';
import { GridItem } from '../common/GridItem';
import { GridContainer } from '../common/GridContainer';
import { SearchBar } from '../common/SearchBar';
import { Breadcrumb } from '../common/Breadcrumb';
import { useThumbnails } from '../../hooks/useThumbnails';
import { useTabStore } from '../../stores/tabStore';

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

import { MediaTile } from '../common/MediaTile';

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

interface ExplorerPageProps {
    isActive?: boolean;
    tabId?: string;
}

export function ExplorerPage({ isActive = true, tabId }: ExplorerPageProps) {
    const { t } = useTranslation();
    const { navigate, explorerState, setExplorerState, previousPage, fromPage, params, setParams } = useNavigationStore();
    const { addTab, getActiveTab } = useTabStore();
    const { showToast } = useToast();

    // Get initial state from the specific TAB, not the global active tab
    // This ensures each tab maintains its own explorer state
    const getInitialExplorerState = () => {
        const tabs = useTabStore.getState().tabs;
        const tab = tabId ? tabs.find(t => t.id === tabId) : useTabStore.getState().getActiveTab();
        return tab?.explorerState || null;
    };

    const [baseFolders, setBaseFolders] = useState<BaseFolder[]>([]);
    // Initialize from tab's explorerState
    const initialState = getInitialExplorerState();
    const [currentPath, setCurrentPath] = useState<string | null>(initialState?.currentPath || null);
    const [pathHistory, setPathHistory] = useState<string[]>(initialState?.pathHistory || []);
    const [entries, setEntries] = useState<ExplorerEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const isMountedRef = useRef(true);

    // Usar hook para thumbnails - cargar individualmente cuando sean visibles
    const { thumbnails, loadThumbnail, initializeThumbnails } = useThumbnails(10);

    // Sorting state - initialized with root preferences
    const [sortBy, setSortBy] = useState<'name' | 'date'>(() => {
        return getSortPreferences(null).sortBy;
    });
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
        return getSortPreferences(null).sortOrder;
    });

    // Track if preferences have been loaded for current path
    const preferencesLoadedRef = useRef(false);
    // Track if we're initializing from store to avoid saving during initialization
    const isInitializingRef = useRef(true);
    // Keep current path in ref for event listener closure
    const currentPathRef = useRef<string | null>(currentPath);

    // Update ref when currentPath changes
    useEffect(() => {
        currentPathRef.current = currentPath;
    }, [currentPath]);

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

    // Initial load - defer to allow UI to render first
    useEffect(() => {
        // Use setTimeout to defer loading and allow UI to render first
        // This prevents blocking the main thread and allows drag from title bar
        const timeoutId = setTimeout(() => {
            loadBaseFolders();
        }, 0);

        return () => {
            clearTimeout(timeoutId);
        };
    }, []); // Only run once on mount

    // Listen for updates - separate effect to avoid re-registration on path change
    useEffect(() => {
        const unlisten = (window as any).runtime?.EventsOn("explorer_updated", () => {
            loadBaseFolders();
            // Only reload current directory if we're not at root
            // This prevents unwanted navigation when adding/removing folders
            const path = currentPathRef.current;
            if (path) {
                // Use requestAnimationFrame for better performance
                requestAnimationFrame(() => {
                    loadDirectory(path, false);
                });
            }
        });

        return () => {
            if (unlisten) {
                unlisten();
            }
        };
    }, []); // Only register listener once - uses ref for current path

    const loadBaseFolders = async () => {
        try {
            // @ts-ignore
            const app = window.go?.main?.App;
            if (!app?.GetBaseFolders) {
                console.warn('[ExplorerPage] Bindings not available yet');
                return;
            }

            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout loading base folders')), 10000); // 10 second timeout
            });

            const foldersPromise = app.GetBaseFolders();
            const folders = await Promise.race([foldersPromise, timeoutPromise]) as BaseFolder[];

            setBaseFolders(folders || []);

            // Reset title to Explorer if we are at root
            if (!currentPathRef.current) {
                if (tabId) {
                    useTabStore.getState().updateTab(tabId, { title: t('explorer.title') || 'Explorer' });
                } else {
                    useTabStore.getState().updateActiveTab({ title: t('explorer.title') || 'Explorer' });
                }
            }

            // Inicializar thumbnails que ya vienen del backend
            if (folders && folders.length > 0) {
                const initialThumbs: Record<string, string> = {};
                folders.forEach((folder: BaseFolder) => {
                    if (folder.thumbnailUrl) {
                        initialThumbs[folder.path] = folder.thumbnailUrl;
                    }
                });
                if (Object.keys(initialThumbs).length > 0) {
                    initializeThumbnails(initialThumbs);
                }
                // Los thumbnails sin thumbnailUrl se cargarán de forma lazy cuando sean visibles
            }
        } catch (error) {
            console.error("Failed to load base folders", error);
        }
    };

    // Handle resetToRoot parameter - navigate to root when clicking explorer button while already in explorer
    // ONLY process this when the tab is active to prevent other tabs from being affected
    useEffect(() => {
        if (isActive && params?.resetToRoot === 'true') {
            // Reset to root
            setCurrentPath(null);
            setPathHistory([]);
            setEntries([]);
            // Reload base folders to show root view
            loadBaseFolders();
            // Clear the parameter to prevent infinite loops
            setParams({});
        }
    }, [params?.resetToRoot, setParams, isActive]);

    const loadDirectory = async (path: string, pushHistory = true) => {
        if (!isMountedRef.current) return;

        setLoading(true);
        try {
            // @ts-ignore
            const app = window.go?.main?.App;
            if (!app?.ExploreFolder) {
                console.warn('[ExplorerPage] Bindings not available yet');
                setLoading(false);
                return;
            }

            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout loading directory')), 10000); // 10 second timeout
            });

            const itemsPromise = app.ExploreFolder(path);
            const items = await Promise.race([itemsPromise, timeoutPromise]) as ExplorerEntry[];

            if (!isMountedRef.current) return;

            setEntries(items || []);

            if (pushHistory && currentPath && currentPath !== path) {
                setPathHistory(prev => [...prev, currentPath]);
            }

            setCurrentPath(path);

            // Update THIS tab's title with current folder name (not the active tab)
            const folderName = path.split(/[\\/]/).filter(Boolean).pop() || path;
            if (tabId) {
                useTabStore.getState().updateTab(tabId, { title: folderName });
            } else {
                useTabStore.getState().updateActiveTab({ title: folderName });
            }

            // Inicializar thumbnails que ya vienen del backend
            // NO cargar todos los thumbnails de una vez - se cargarán de forma lazy cuando sean visibles
            if (items && items.length > 0) {
                const initialThumbs: Record<string, string> = {};
                items.forEach((entry: ExplorerEntry) => {
                    if (entry.thumbnailUrl) {
                        initialThumbs[entry.path] = entry.thumbnailUrl;
                    }
                });
                if (Object.keys(initialThumbs).length > 0) {
                    initializeThumbnails(initialThumbs);
                }
                // Los thumbnails sin thumbnailUrl se cargarán de forma lazy cuando sean visibles
            }
        } catch (error) {
            console.error("Failed to load directory", error);
            if (isMountedRef.current) {
                showToast(t('explorer.loadFailed') || "Failed to load directory", "error");
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    };

    // Restore explorer state from store ONLY if we were already navigating within explorer
    // If coming from another view, always start at root
    useEffect(() => {
        isMountedRef.current = true;

        // First priority: Check if tab was restored with saved explorerState
        const tabInitialState = getInitialExplorerState();

        if (tabInitialState?.currentPath) {
            // Tab was restored with saved state - load that directory
            isInitializingRef.current = true;
            setTimeout(() => {
                if (isMountedRef.current && tabInitialState.currentPath) {
                    loadDirectory(tabInitialState.currentPath, false).finally(() => {
                        setTimeout(() => {
                            isInitializingRef.current = false;
                        }, 50);
                    });
                }
            }, 0);
        } else {
            // Fallback: Check global explorerState for returning from viewer/thumbnails
            const savedPath = explorerState?.currentPath;
            const mainPages = ['home', 'oneShot', 'series', 'history', 'download', 'settings'];
            const isReturning = fromPage === 'viewer' || fromPage === 'thumbnails' || (previousPage && !mainPages.includes(previousPage));

            if (isReturning && savedPath) {
                isInitializingRef.current = true;
                setPathHistory(explorerState.pathHistory || []);
                setTimeout(() => {
                    if (isMountedRef.current && savedPath) {
                        loadDirectory(savedPath, false).finally(() => {
                            setTimeout(() => {
                                isInitializingRef.current = false;
                            }, 50);
                        });
                    }
                }, 0);
            } else {
                // Fresh tab with no saved state - already initialized to root via useState
                isInitializingRef.current = false;
            }
        }

        return () => {
            isMountedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

    // Save explorer state to the specific TAB when it changes (but not during initialization and only when active)
    useEffect(() => {
        if (!isInitializingRef.current && isActive && tabId) {
            // Update this specific tab's explorerState in tabStore
            const tabs = useTabStore.getState().tabs;
            const tabIndex = tabs.findIndex(t => t.id === tabId);
            if (tabIndex >= 0) {
                useTabStore.setState({
                    tabs: tabs.map((t, i) => i === tabIndex ? {
                        ...t,
                        explorerState: { currentPath, pathHistory }
                    } : t)
                });
            }
        }
    }, [currentPath, pathHistory, isActive, tabId]);

    const handleBack = () => {
        if (pathHistory.length > 0) {
            const previous = pathHistory[pathHistory.length - 1];
            setPathHistory(prev => prev.slice(0, -1));
            loadDirectory(previous, false);
        } else {
            setCurrentPath(null);
            setPathHistory([]);

            // Reset title to Explorer
            if (tabId) {
                useTabStore.getState().updateTab(tabId, { title: t('explorer.title') || 'Explorer' });
            } else {
                useTabStore.getState().updateActiveTab({ title: t('explorer.title') || 'Explorer' });
            }
        }
    };

    const handleBreadcrumbClick = (path: string | null) => {
        if (path === null) {
            setCurrentPath(null);
            setPathHistory([]);
            setEntries([]);

            // Reset title to Explorer
            if (tabId) {
                useTabStore.getState().updateTab(tabId, { title: t('explorer.title') || 'Explorer' });
            } else {
                useTabStore.getState().updateActiveTab({ title: t('explorer.title') || 'Explorer' });
            }
        } else {
            // Navigate to specific path
            // Build segments to check navigation direction
            const buildSegments = (p: string | null): Array<{ name: string; path: string | null }> => {
                if (!p) return [{ name: t('explorer.title'), path: null }];

                const segs: Array<{ name: string; path: string | null }> = [{ name: t('explorer.title'), path: null }];
                const baseFolder = baseFolders.find(bf => {
                    const bfPath = bf.path.replace(/[\\/]$/, '');
                    const normalizedBfPath = bfPath.replace(/\\/g, '/');
                    const normalizedPath = p.replace(/\\/g, '/');
                    return normalizedPath.startsWith(normalizedBfPath + '/') || normalizedPath === normalizedBfPath;
                });

                if (baseFolder) {
                    const basePath: string = baseFolder.path.replace(/[\\/]$/, '');
                    segs.push({ name: baseFolder.name, path: basePath });
                    const basePathNormalized = basePath.replace(/\\/g, '/');
                    const pathNormalized = p.replace(/\\/g, '/');
                    const relativePath = pathNormalized.substring(basePathNormalized.length + 1);

                    if (relativePath) {
                        const parts = relativePath.split('/').filter(part => part.length > 0);
                        const pathSeparator = p.includes('\\') ? '\\' : '/';
                        let currentPathSegments = [basePath];
                        for (let i = 0; i < parts.length; i++) {
                            currentPathSegments.push(parts[i]);
                            segs.push({ name: parts[i], path: currentPathSegments.join(pathSeparator) });
                        }
                    }
                } else {
                    const normalizedPath = p.replace(/\\/g, '/');
                    const parts = normalizedPath.split('/').filter(part => part.length > 0);
                    const pathSeparator = p.includes('\\') ? '\\' : '/';
                    let currentPathSegments: string[] = [];
                    for (let i = 0; i < parts.length; i++) {
                        currentPathSegments.push(parts[i]);
                        segs.push({ name: parts[i], path: currentPathSegments.join(pathSeparator) });
                    }
                }
                return segs;
            };

            const clickedSegments = buildSegments(path);
            const currentSegments = buildSegments(currentPath);
            const clickedIndex = clickedSegments.findIndex(seg => seg.path === path);
            const currentIndex = currentSegments.findIndex(seg => seg.path === currentPath);

            if (clickedIndex >= 0 && currentIndex >= 0 && clickedIndex < currentIndex) {
                // Going backwards - rebuild path history
                const newHistory: string[] = [];
                for (let i = 1; i < clickedIndex; i++) {
                    const segPath = clickedSegments[i].path;
                    if (segPath) {
                        newHistory.push(segPath);
                    }
                }
                setPathHistory(newHistory);
            } else {
                // Going forward or same level - add current path to history if it exists
                if (currentPath && path !== currentPath) {
                    setPathHistory(prev => [...prev, currentPath]);
                }
            }

            loadDirectory(path, false);
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
                // Navigate to the newly added folder
                setPathHistory([]);
                // Use setTimeout to ensure the event listener doesn't interfere
                setTimeout(() => {
                    loadBaseFolders(); // Refresh first
                    // Then navigate to the folder (not to its first subfolder)
                    loadDirectory(path, false);
                }, 100);
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

            // Always go back to root when removing a folder
            setCurrentPath(null);
            setPathHistory([]);
            setEntries([]);
            loadBaseFolders();
        } catch (error) {
            console.error("Failed to remove base folder", error);
        }
    };

    const handleOpenInViewer = (path: string, e: React.MouseEvent) => {
        e.stopPropagation();
        // Save explorer state before navigating to viewer
        setExplorerState({
            currentPath,
            pathHistory,
        });

        // Check if we should use shallow loading
        // Use shallow if: the folder is in a directory that has other folders at the same level
        // This prevents loading images from sibling folders recursively
        const entry = entries.find(ent => ent.path === path);
        const isDirectory = entry?.isDirectory ?? false;

        // If it's a directory and there are other directories in the same level, use shallow
        // This ensures we only load images from the current folder, not from sibling folders
        const hasOtherFolders = entries.some(ent =>
            ent.isDirectory && ent.path !== path
        );
        const useShallow = isDirectory && hasOtherFolders;

        navigate('viewer', {
            folder: path,
            shallow: useShallow ? 'true' : 'false'
        }, 'explorer');
    };

    const handleItemClick = (entry: ExplorerEntry | BaseFolder) => {
        if ('addedAt' in entry) {
            loadDirectory(entry.path);
        } else {
            const e = entry as ExplorerEntry;
            if (e.isDirectory) {
                loadDirectory(e.path);
            } else {
                // It's a file - use the parent directory with shallow loading
                // because the parent directory may have subdirectories
                if (currentPath) {
                    // Find the index of this file among images in the CURRENT view (filtered and sorted)
                    // This matches what the user sees on screen
                    const imageEntries = sortedEntries.filter(ent => !ent.isDirectory);
                    const clickedIndex = imageEntries.findIndex(ent => ent.path === e.path);

                    // Save explorer state before navigating to viewer
                    setExplorerState({
                        currentPath,
                        pathHistory,
                    });

                    // Decide if we should use shallow loading
                    const hasSubdirs = entries.some(ent => ent.isDirectory);

                    // Navigate to viewer, passing the calculated startIndex and targetPath
                    navigate('viewer', {
                        folder: currentPath,
                        shallow: hasSubdirs ? 'true' : 'false',
                        startIndex: clickedIndex >= 0 ? String(clickedIndex) : '0',
                        targetPath: e.path
                    }, 'explorer');
                }
            }
        }
    };

    const handleItemAuxClick = (e: React.MouseEvent, entry: ExplorerEntry | BaseFolder) => {
        if (e.button === 1) { // Middle click
            e.preventDefault();
            e.stopPropagation();

            if ('addedAt' in entry) {
                // BaseFolder
                addTab('explorer', {}, entry.name, {
                    explorerState: {
                        currentPath: entry.path,
                        pathHistory: []
                    }
                }, false);
            } else {
                const ent = entry as ExplorerEntry;
                if (ent.isDirectory) {
                    // Build proper path history for the new tab
                    const newPathHistory = currentPath
                        ? [...pathHistory, currentPath]
                        : [...pathHistory];

                    addTab('explorer', {}, ent.name, {
                        explorerState: {
                            currentPath: ent.path,
                            pathHistory: newPathHistory
                        }
                    }, false);
                } else {
                    // Open file in viewer tab
                    if (currentPath) {
                        const imageEntries = sortedEntries.filter(e => !e.isDirectory);
                        // Fixed: was comparing ent.path to ent.path (always true for all items)
                        const clickedIndex = imageEntries.findIndex(img => img.path === ent.path);
                        const hasSubdirs = entries.some(e => e.isDirectory);

                        addTab('viewer', {
                            folder: currentPath,
                            shallow: hasSubdirs ? 'true' : 'false',
                            startIndex: clickedIndex >= 0 ? String(clickedIndex) : '0',
                            targetPath: ent.path
                        }, ent.name, {}, false);
                    }
                }
            }
        }
    };

    // Filter function for search
    const matchesSearch = (item: BaseFolder | ExplorerEntry, query: string): boolean => {
        if (!query.trim()) return true;
        const searchTerm = query.toLowerCase();
        return item.name.toLowerCase().includes(searchTerm) ||
            ('path' in item && item.path.toLowerCase().includes(searchTerm));
    };

    // Sort and filter base folders
    const sortedBaseFolders = [...baseFolders]
        .filter(folder => matchesSearch(folder, searchQuery))
        .sort((a, b) => {
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

    // Sort and filter entries (directory view)
    const sortedEntries = [...entries]
        .filter(entry => matchesSearch(entry, searchQuery))
        .sort((a, b) => {
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
        <div
            className="h-full p-6 flex flex-col"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    {currentPath && (
                        <Tooltip content={t('common.back')} placement="right">
                            <button
                                onClick={handleBack}
                                className="p-2 rounded-full hover:bg-white/10 transition-all opacity-100 translate-x-0 flex-shrink-0"
                                aria-label={t('common.back')}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                            </button>
                        </Tooltip>
                    )}

                    {/* Breadcrumb */}
                    <div className="flex-1 min-w-0">
                        <Breadcrumb
                            currentPath={currentPath}
                            baseFolders={baseFolders}
                            onNavigate={handleBreadcrumbClick}
                        />
                    </div>

                    {/* Sort Controls */}
                    <div className="flex-shrink-0 ml-8">
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
                </div>

                {!currentPath && (
                    <button
                        onClick={handleAddBaseFolder}
                        className="btn-primary transition-transform hover:scale-105 active:scale-95 ml-6"
                    >
                        <span className="mr-2">+</span>
                        {t('explorer.addBaseFolder')}
                    </button>
                )}
            </div>

            {/* Search Bar */}
            {((!currentPath && baseFolders.length > 0) || (currentPath && entries.length > 0)) && (
                <div className="mb-4">
                    <SearchBar
                        placeholder={t('explorer.searchPlaceholder') || 'Search by name...'}
                        onSearch={setSearchQuery}
                        className="max-w-md"
                    />
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto pr-2">
                <GridContainer key={currentPath || 'root'}>
                    {/* Base Folders View */}
                    {!currentPath && sortedBaseFolders.map((folder) => (
                        <GridItem key={folder.path}>
                            <MediaTile
                                id={folder.path}
                                name={folder.name}
                                thumbnail={folder.thumbnailUrl || thumbnails[folder.path]}
                                onClick={() => handleItemClick(folder)}
                                onAuxClick={(e) => handleItemAuxClick(e, folder)}
                                onVisible={async () => {
                                    if (!folder.hasImages || folder.thumbnailUrl || thumbnails[folder.path]) return;
                                    try {
                                        // @ts-ignore
                                        const folderInfo = await window.go?.main?.App?.GetFolderInfoShallow(folder.path);
                                        if (folderInfo && folderInfo.coverImage) {
                                            await loadThumbnail(folder.path, folderInfo.coverImage);
                                        }
                                    } catch (error) {
                                        console.error('Failed to load thumbnail for folder:', folder.path, error);
                                    }
                                }}
                                onSecondaryAction={(e) => handleRemoveBaseFolder(folder.path, e)}
                                secondaryActionIcon={<TrashIcon />}
                                secondaryActionLabel={t('common.remove')}
                                fallbackIcon={
                                    <div className="p-4 rounded-xl bg-accent/10 text-accent">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                        </svg>
                                    </div>
                                }
                                footerLeft={<p className="text-xs text-white/50 truncate mt-1 font-mono">{folder.path}</p>}
                            />
                        </GridItem>
                    ))}

                    {/* Directory View */}
                    {currentPath && sortedEntries.map((entry) => (
                        <GridItem key={entry.path}>
                            <MediaTile
                                id={entry.path}
                                name={entry.name}
                                thumbnail={entry.thumbnailUrl || thumbnails[entry.path]}
                                onClick={() => handleItemClick(entry)}
                                onAuxClick={(e) => handleItemAuxClick(e, entry)}
                                onVisible={async () => {
                                    if (!entry.coverImage || entry.thumbnailUrl || thumbnails[entry.path]) return;
                                    await loadThumbnail(entry.path, entry.coverImage);
                                }}
                                fallbackIcon={
                                    <svg className="w-12 h-12 text-accent/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                    </svg>
                                }
                                footerLeft={
                                    <span className="text-xs text-white/50">
                                        {entry.isDirectory ? (entry.hasImages ? `${entry.imageCount} ${t('explorer.images')}` : t('explorer.folder')) : t('explorer.file')}
                                    </span>
                                }
                                footerRight={
                                    entry.hasImages && (
                                        <Tooltip content={t('explorer.openInViewer')} placement="left">
                                            <button
                                                onClick={(e) => handleOpenInViewer(entry.path, e)}
                                                className="p-1.5 rounded-full bg-accent text-white hover:bg-accent-hover transform hover:scale-110 transition-all opacity-0 group-hover/tile:opacity-100"
                                                aria-label={t('explorer.openInViewer')}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </button>
                                        </Tooltip>
                                    )
                                }
                            />
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

                {/* No results message */}
                {((!currentPath && sortedBaseFolders.length === 0 && baseFolders.length > 0 && searchQuery.trim()) ||
                    (currentPath && sortedEntries.length === 0 && entries.length > 0 && searchQuery.trim())) && (
                        <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
                            <svg className="w-16 h-16 mb-4 text-surface-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                            <p className="text-lg">{t('explorer.noResultsFound') || 'No results found'}</p>
                            <p className="text-sm mt-1">{t('explorer.tryDifferentSearch') || `Try a different search term`}</p>
                        </div>
                    )}
            </div>
        </div>
    );
}
