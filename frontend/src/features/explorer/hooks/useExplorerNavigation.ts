/**
 * useExplorerNavigation - Hook to handle navigation logic (back, breadcrumb, item clicks)
 * Extracted from ExplorerPage to improve separation of concerns
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTabStore } from '@stores';
import { AppAPI } from '@services/api/appAPI';
import { ExplorerEntry, BaseFolder } from '../types';
import type { PageType } from '@types';

interface UseExplorerNavigationOptions {
    tabId?: string;
    currentPath: string | null;
    pathHistory: string[];
    forwardHistory: string[];
    baseFolders: BaseFolder[];
    entries: ExplorerEntry[];
    sortedEntries: ExplorerEntry[];
    setCurrentPath: (path: string | null) => void;
    setPathHistory: React.Dispatch<React.SetStateAction<string[]>>;
    setForwardHistory: React.Dispatch<React.SetStateAction<string[]>>;
    setEntries: React.Dispatch<React.SetStateAction<ExplorerEntry[]>>;
    loadDirectory: (path: string, pushHistory?: boolean, sortModeOverride?: string) => Promise<void>;
    loadBaseFolders: () => Promise<void>;
    setExplorerState: (state: { currentPath: string | null; pathHistory: string[]; forwardHistory: string[] }) => void;
    navigate: (page: PageType, params?: Record<string, string>, activeMenuPageOverride?: PageType) => void;
    onTitleChange: (title: string) => void;
    onAutoPromote?: (parentPath: string, entryName: string, allDirNames: string[]) => void;
    onSearchClear?: () => void;
    sortBy?: string;
    sortOrder?: string;
}

export function useExplorerNavigation({
    tabId,
    currentPath,
    pathHistory,
    forwardHistory,
    baseFolders,
    entries,
    sortedEntries,
    setCurrentPath,
    setPathHistory,
    setForwardHistory,
    setEntries,
    loadDirectory,
    loadBaseFolders,
    setExplorerState,
    navigate,
    onTitleChange,
    onAutoPromote,
    onSearchClear,
    sortBy: currentSortBy,
    sortOrder: currentSortOrder,
}: UseExplorerNavigationOptions) {
    const { t } = useTranslation();
    const addTab = useTabStore((state) => state.addTab);

    const handleBack = useCallback(() => {
        onSearchClear?.();
        if (pathHistory.length > 0) {
            const previous = pathHistory[pathHistory.length - 1];
            setPathHistory(prev => prev.slice(0, -1));
            if (currentPath) {
                setForwardHistory(prev => [...prev, currentPath]);
            }
            setCurrentPath(previous);
            setEntries([]);
        } else {
            if (currentPath) {
                setForwardHistory(prev => [...prev, currentPath]);
            }
            setCurrentPath(null);
            setPathHistory([]);
            setEntries([]);
            onTitleChange(t('explorer.title') || 'Explorer');
            if (tabId) {
                useTabStore.getState().updateTab(tabId, { title: t('explorer.title') || 'Explorer' });
            } else {
                useTabStore.getState().updateActiveTab({ title: t('explorer.title') || 'Explorer' });
            }
        }
    }, [pathHistory, currentPath, setPathHistory, setForwardHistory, setCurrentPath, setEntries, tabId, onTitleChange, t, onSearchClear]);

    const handleForward = useCallback(() => {
        onSearchClear?.();
        if (forwardHistory.length > 0) {
            const next = forwardHistory[forwardHistory.length - 1];
            setForwardHistory(prev => prev.slice(0, -1));
            if (currentPath) {
                setPathHistory(prev => [...prev, currentPath]);
            }
            setCurrentPath(next);
            setEntries([]);
        }
    }, [forwardHistory, currentPath, setForwardHistory, setPathHistory, setCurrentPath, setEntries, onSearchClear]);

    const handleBreadcrumbClick = useCallback((path: string | null) => {
        onSearchClear?.();
        if (path === null) {
            setCurrentPath(null);
            setPathHistory([]);
            setEntries([]);
            onTitleChange(t('explorer.title') || 'Explorer');
            if (tabId) {
                useTabStore.getState().updateTab(tabId, { title: t('explorer.title') || 'Explorer' });
            } else {
                useTabStore.getState().updateActiveTab({ title: t('explorer.title') || 'Explorer' });
            }
        } else {
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
                setForwardHistory([]);
            } else {
                // Going forward or same level - add current path to history if it exists
                if (currentPath && path !== currentPath) {
                    setPathHistory(prev => [...prev, currentPath]);
                    setForwardHistory([]);
                }
            }

            setCurrentPath(path);
            setEntries([]);
        }
    }, [currentPath, baseFolders, setCurrentPath, setPathHistory, setForwardHistory, setEntries, tabId, onTitleChange, t, onSearchClear]);

    const handleBreadcrumbAuxClick = useCallback((e: React.MouseEvent, path: string | null, name: string) => {
        if (e.button === 1) { // Middle click
            e.preventDefault();
            e.stopPropagation();

            if (path === null) {
                addTab('explorer', {}, t('explorer.title') || 'Explorer', {
                    explorerState: {
                        currentPath: null,
                        pathHistory: [],
                        forwardHistory: []
                    }
                }, false);
            } else {
                addTab('explorer', {}, name, {
                    explorerState: {
                        currentPath: path,
                        pathHistory: [],
                        forwardHistory: []
                    }
                }, false);
            }
        }
    }, [addTab, t]);

    const handleAddBaseFolder = useCallback(async () => {
        try {
            const path = await AppAPI.selectFolder();
            if (path) {
                await AppAPI.addBaseFolder(path);
                setPathHistory([]);
                setForwardHistory([]);
                setTimeout(() => {
                    loadBaseFolders();
                    loadDirectory(path, false);
                }, 100);
            }
        } catch (error) {
            console.error("Failed to add base folder", error);
        }
    }, [loadBaseFolders, loadDirectory, setPathHistory, setForwardHistory]);

    const handleRemoveBaseFolder = useCallback(async (path: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onSearchClear?.();
        try {
            await AppAPI.removeBaseFolder(path);
            setCurrentPath(null);
            setPathHistory([]);
            setForwardHistory([]);
            setEntries([]);
            loadBaseFolders();
        } catch (error) {
            console.error("Failed to remove base folder", error);
        }
    }, [setCurrentPath, setPathHistory, setForwardHistory, setEntries, loadBaseFolders, onSearchClear]);

    const handleOpenInViewer = useCallback(async (path: string, e: React.MouseEvent) => {
        e.stopPropagation();
            setExplorerState({
            currentPath,
            pathHistory,
            forwardHistory,
        });

        const entry = entries.find(ent => ent.path === path);
        const isDirectory = entry?.isDirectory ?? false;
        const hasSubfolders = (entry?.subdirectoryCount ?? 0) > 0;
        const useShallow = isDirectory && hasSubfolders;

        navigate('viewer', {
            folder: path,
            shallow: useShallow ? 'true' : 'false',
            sortBy: currentSortBy ?? 'name',
            sortOrder: currentSortOrder ?? 'asc',
            ...(hasSubfolders ? { navRoot: path } : {})
        }, 'explorer' as PageType);
    }, [currentPath, pathHistory, entries, setExplorerState, navigate, currentSortBy, currentSortOrder]);

    const handleItemClick = useCallback(async (entry: ExplorerEntry | BaseFolder) => {
        if ('addedAt' in entry) {
            onSearchClear?.();
            setPathHistory([]);
            setForwardHistory([]);
            setCurrentPath(entry.path);
            setEntries([]);
        } else {
            const e = entry as ExplorerEntry;
            if (e.isDirectory) {
                onSearchClear?.();
                if (currentPath) {
                    setPathHistory(prev => [...prev, currentPath]);
                    setForwardHistory([]);
                    if (onAutoPromote) {
                        const allDirNames = entries.filter(ent => ent.isDirectory).map(ent => ent.name);
                        onAutoPromote(currentPath, e.name, allDirNames);
                    }
                }
                setCurrentPath(e.path);
                setEntries([]);
            } else {
                if (currentPath) {
                    const imageEntries = sortedEntries.filter(ent => !ent.isDirectory);
                    const clickedIndex = imageEntries.findIndex(ent => ent.path === e.path);

                    setExplorerState({
                        currentPath,
                        pathHistory,
                        forwardHistory,
                    });

                    // Sync viewerState BEFORE navigating so ViewerPage shows the correct
                    // image on first render (not a stale index from a previous session)
                    if (clickedIndex >= 0) {
                        const store = useTabStore.getState();
                        const existing = store.tabs.find(t => t.id === store.activeTabId)?.viewerState;
                        if (existing) {
                            store.updateTab(store.activeTabId, {
                                viewerState: {
                                    ...existing,
                                    currentIndex: clickedIndex,
                                    scrollPosition: 0
                                }
                            });
                        }
                    }

                    const hasSubdirs = entries.some(ent => ent.isDirectory);

                    navigate('viewer', {
                        folder: currentPath,
                        shallow: hasSubdirs ? 'true' : 'false',
                        startIndex: clickedIndex >= 0 ? String(clickedIndex) : '0',
                        targetPath: e.path,
                        sortBy: currentSortBy ?? 'name',
                        sortOrder: currentSortOrder ?? 'asc',
                        ...(hasSubdirs ? { navRoot: currentPath } : {})
                    }, 'explorer' as PageType);
                }
            }
        }
    }, [currentPath, pathHistory, entries, sortedEntries, setPathHistory, setExplorerState, navigate, onSearchClear, currentSortBy, currentSortOrder]);

    const handleItemAuxClick = useCallback(async (e: React.MouseEvent, entry: ExplorerEntry | BaseFolder) => {
        if (e.button === 1) { // Middle click
            e.preventDefault();
            e.stopPropagation();

            if ('addedAt' in entry) {
                addTab('explorer', {}, entry.name, {
                    explorerState: {
                        currentPath: entry.path,
                        pathHistory: [],
                        forwardHistory: []
                    }
                }, false);
            } else {
                const ent = entry as ExplorerEntry;
                if (ent.isDirectory) {
                    const newPathHistory = currentPath
                        ? [...pathHistory, currentPath]
                        : [...pathHistory];

                    addTab('explorer', {}, ent.name, {
                        explorerState: {
                            currentPath: ent.path,
                            pathHistory: newPathHistory,
                            forwardHistory: []
                        }
                    }, false);
                } else {
                    if (currentPath) {
                        const imageEntries = sortedEntries.filter(e => !e.isDirectory);
                        const clickedIndex = imageEntries.findIndex(img => img.path === ent.path);
                        const hasSubdirs = entries.some(e => e.isDirectory);

                        addTab('viewer', {
                            folder: currentPath,
                            shallow: hasSubdirs ? 'true' : 'false',
                            startIndex: clickedIndex >= 0 ? String(clickedIndex) : '0',
                            targetPath: ent.path,
                            sortBy: currentSortBy ?? 'name',
                            sortOrder: currentSortOrder ?? 'asc',
                            from: 'explorer',
                            ...(hasSubdirs ? { navRoot: currentPath } : {})
                        }, ent.name, {
                            explorerState: {
                                currentPath,
                                pathHistory,
                                forwardHistory: []
                            }
                        }, false);
                    }
                }
            }
        }
    }, [currentPath, pathHistory, entries, sortedEntries, addTab, currentSortBy, currentSortOrder]);

    return {
        handleBack,
        handleForward,
        handleBreadcrumbClick,
        handleBreadcrumbAuxClick,
        handleAddBaseFolder,
        handleRemoveBaseFolder,
        handleOpenInViewer,
        handleItemClick,
        handleItemAuxClick,
    };
}
