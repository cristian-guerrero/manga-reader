/**
 * useExplorerLoading - Hook to handle loading of base folders and directories
 * Extracted from ExplorerPage to improve separation of concerns
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTabStore } from '@stores';
import { AppAPI } from '@services/api/appAPI';
import { useToast } from '@shared/components';
import { useTranslation } from 'react-i18next';
import { BaseFolder, ExplorerEntry } from '../types';


interface UseExplorerLoadingOptions {
    tabId?: string;
    currentPath: string | null;
    currentPathRef: React.MutableRefObject<string | null>;
    initializeThumbnails: (thumbs: Record<string, string>) => void;
    onPathChange: (path: string | null) => void;
    onTitleChange: (title: string) => void;
}

export function useExplorerLoading({
    tabId,
    currentPath,
    currentPathRef,
    initializeThumbnails,
    onPathChange,
    onTitleChange,
}: UseExplorerLoadingOptions) {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [baseFolders, setBaseFolders] = useState<BaseFolder[]>([]);
    const [entries, setEntries] = useState<ExplorerEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const isMountedRef = useRef(true);

    const loadBaseFolders = useCallback(async () => {
        try {
            const folders = await AppAPI.getBaseFolders();
            setBaseFolders(folders || []);

            // Reset title to Explorer if we are at root
            if (!currentPathRef.current) {
                if (tabId) {
                    useTabStore.getState().updateTab(tabId, { title: t('explorer.title') || 'Explorer' });
                } else {
                    useTabStore.getState().updateActiveTab({ title: t('explorer.title') || 'Explorer' });
                }
                onTitleChange(t('explorer.title') || 'Explorer');
            }

            // Initialize thumbnails that come from backend
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
            }
        } catch (error) {
            console.error("Failed to load base folders", error);
        }
    }, [tabId, currentPathRef, initializeThumbnails, onTitleChange, t]);

    const loadDirectory = useCallback(async (path: string, pushHistory = true) => {
        if (!isMountedRef.current) return;

        setLoading(true);
        try {
            const items = await AppAPI.exploreFolder(path);

            if (!isMountedRef.current) return;

            setEntries(items || []);

            if (pushHistory) {
                onPathChange(path);
            } else {
                onPathChange(path);
            }

            // Update tab title with current folder name
            const folderName = path.split(/[\\/]/).filter(Boolean).pop() || path;
            if (tabId) {
                useTabStore.getState().updateTab(tabId, { title: folderName });
            } else {
                useTabStore.getState().updateActiveTab({ title: folderName });
            }
            onTitleChange(folderName);

            // Initialize thumbnails that come from backend
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
    }, [tabId, isMountedRef, onPathChange, onTitleChange, initializeThumbnails, showToast, t]);

    // Initial load - defer to allow UI to render first
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            loadBaseFolders();
        }, 0);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [loadBaseFolders]);

    // Listen for updates
    useEffect(() => {
        const unlisten = (window as any).runtime?.EventsOn("explorer_updated", () => {
            loadBaseFolders();
            const path = currentPathRef.current;
            if (path) {
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
    }, [loadBaseFolders, loadDirectory, currentPathRef]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    return {
        baseFolders,
        entries,
        loading,
        loadBaseFolders,
        loadDirectory,
        setEntries,
    };
}
