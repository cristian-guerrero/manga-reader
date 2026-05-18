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
    baseFolders: BaseFolder[];
    entries: ExplorerEntry[];
    sortedEntries: ExplorerEntry[];
    setCurrentPath: (path: string | null) => void;
    setPathHistory: React.Dispatch<React.SetStateAction<string[]>>;
    setEntries: React.Dispatch<React.SetStateAction<ExplorerEntry[]>>;
    loadDirectory: (path: string, pushHistory?: boolean, sortModeOverride?: string) => Promise<void>;
    loadBaseFolders: () => Promise<void>;
    setExplorerState: (state: { currentPath: string | null; pathHistory: string[] }) => void;
    navigate: (page: PageType, params?: Record<string, string>, activeMenuPageOverride?: PageType) => void;
    onTitleChange: (title: string) => void;
    onAutoPromote?: (parentPath: string, entryName: string, allDirNames: string[]) => void;
}

export function useExplorerNavigation({
    tabId,
    currentPath,
    pathHistory,
    baseFolders,
    entries,
    sortedEntries,
    setCurrentPath,
    setPathHistory,
    setEntries,
    loadDirectory,
    loadBaseFolders,
    setExplorerState,
    navigate,
    onTitleChange,
    onAutoPromote,
}: UseExplorerNavigationOptions) {
    const { t } = useTranslation();
    const addTab = useTabStore((state) => state.addTab);

    const handleBack = useCallback(() => {
        if (pathHistory.length > 0) {
            const previous = pathHistory[pathHistory.length - 1];
            setPathHistory(prev => prev.slice(0, -1));
            setCurrentPath(previous);
            setEntries([]);
        } else {
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
    }, [pathHistory, setPathHistory, setCurrentPath, setEntries, tabId, onTitleChange, t]);

    const handleBreadcrumbClick = useCallback((path: string | null) => {
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
            } else {
                // Going forward or same level - add current path to history if it exists
                if (currentPath && path !== currentPath) {
                    setPathHistory(prev => [...prev, currentPath]);
                }
            }

            setCurrentPath(path);
            setEntries([]);
        }
    }, [currentPath, baseFolders, setCurrentPath, setPathHistory, setEntries, tabId, onTitleChange, t]);

    const handleBreadcrumbAuxClick = useCallback((e: React.MouseEvent, path: string | null, name: string) => {
        if (e.button === 1) { // Middle click
            e.preventDefault();
            e.stopPropagation();

            if (path === null) {
                addTab('explorer', {}, t('explorer.title') || 'Explorer', {
                    explorerState: {
                        currentPath: null,
                        pathHistory: []
                    }
                }, false);
            } else {
                addTab('explorer', {}, name, {
                    explorerState: {
                        currentPath: path,
                        pathHistory: []
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
                setTimeout(() => {
                    loadBaseFolders();
                    loadDirectory(path, false);
                }, 100);
            }
        } catch (error) {
            console.error("Failed to add base folder", error);
        }
    }, [loadBaseFolders, loadDirectory, setPathHistory]);

    const handleRemoveBaseFolder = useCallback(async (path: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await AppAPI.removeBaseFolder(path);
            setCurrentPath(null);
            setPathHistory([]);
            setEntries([]);
            loadBaseFolders();
        } catch (error) {
            console.error("Failed to remove base folder", error);
        }
    }, [setCurrentPath, setPathHistory, setEntries, loadBaseFolders]);

    const handleOpenInViewer = useCallback((path: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExplorerState({
            currentPath,
            pathHistory,
        });

        const entry = entries.find(ent => ent.path === path);
        const isDirectory = entry?.isDirectory ?? false;
        const hasSubfolders = (entry?.subdirectoryCount ?? 0) > 0;
        const useShallow = isDirectory && hasSubfolders;

        navigate('viewer', {
            folder: path,
            shallow: useShallow ? 'true' : 'false',
            ...(hasSubfolders ? { navRoot: path } : {})
        }, 'explorer' as PageType);
    }, [currentPath, pathHistory, entries, setExplorerState, navigate]);

    const handleItemClick = useCallback((entry: ExplorerEntry | BaseFolder) => {
        if ('addedAt' in entry) {
            setPathHistory([]);
            setCurrentPath(entry.path);
            setEntries([]);
        } else {
            const e = entry as ExplorerEntry;
            if (e.isDirectory) {
                if (currentPath) {
                    setPathHistory(prev => [...prev, currentPath]);
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
                    });

                    const hasSubdirs = entries.some(ent => ent.isDirectory);

                    navigate('viewer', {
                        folder: currentPath,
                        shallow: hasSubdirs ? 'true' : 'false',
                        startIndex: clickedIndex >= 0 ? String(clickedIndex) : '0',
                        targetPath: e.path,
                        ...(hasSubdirs ? { navRoot: currentPath } : {})
                    }, 'explorer' as PageType);
                }
            }
        }
    }, [currentPath, pathHistory, entries, sortedEntries, setPathHistory, setExplorerState, navigate]);

    const handleItemAuxClick = useCallback((e: React.MouseEvent, entry: ExplorerEntry | BaseFolder) => {
        if (e.button === 1) { // Middle click
            e.preventDefault();
            e.stopPropagation();

            if ('addedAt' in entry) {
                addTab('explorer', {}, entry.name, {
                    explorerState: {
                        currentPath: entry.path,
                        pathHistory: []
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
                            pathHistory: newPathHistory
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
                            ...(hasSubdirs ? { navRoot: currentPath } : {})
                        }, ent.name, {}, false);
                    }
                }
            }
        }
    }, [currentPath, pathHistory, entries, sortedEntries, addTab]);

    return {
        handleBack,
        handleBreadcrumbClick,
        handleBreadcrumbAuxClick,
        handleAddBaseFolder,
        handleRemoveBaseFolder,
        handleOpenInViewer,
        handleItemClick,
        handleItemAuxClick,
    };
}
