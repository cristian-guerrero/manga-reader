/**
 * useOneShotData - Hook to manage oneshot folders loading
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { EventsOn, EventsOff } from '../../../../wailsjs/runtime';
import { AppAPI } from '@services/api/appAPI';
import type { FolderInfo } from '@types';

interface UseOneShotDataOptions {
    loadThumbnails: (folders: FolderInfo[], getCoverImage: (folder: FolderInfo) => string | undefined, getId: (folder: FolderInfo) => string) => void;
    setFolders: (folders: FolderInfo[]) => void;
}

export function useOneShotData({ loadThumbnails, setFolders }: UseOneShotDataOptions) {
    const [isLoading, setIsLoading] = useState(true);
    const isMountedRef = useRef(true);

    const loadFolders = useCallback(async () => {
        if (!isMountedRef.current) return;

        try {
            // Set loading state
            if (isMountedRef.current) {
                setIsLoading(true);
            }

            const library = await AppAPI.getLibrary();

            console.log(`[OneShotPage] Library received: ${library?.length || 0} items`);

            if (!isMountedRef.current) return;

            if (library && Array.isArray(library)) {
                const folderData = library.map((entry: any) => ({
                    path: entry.path,
                    name: entry.name,
                    imageCount: entry.imageCount,
                    coverImage: entry.coverImage,
                    thumbnailUrl: entry.thumbnailUrl,
                    isTemporary: entry.isTemporary,
                    lastModified: entry.lastModified,
                }));
                setFolders(folderData);
                setIsLoading(false); // Show UI immediately with data

                // Load thumbnails (hook handles existing thumbnailUrl)
                loadThumbnails(folderData, (f) => f.coverImage, (f) => f.path);
            } else {
                setFolders([]);
                setIsLoading(false);
            }
        } catch (error) {
            console.error('[OneShotPage] Failed to load folders:', error);
            if (isMountedRef.current) {
                setFolders([]);
                setIsLoading(false);
            }
        }
    }, [loadThumbnails, setFolders]);

    // Load folders from settings/library
    useEffect(() => {
        isMountedRef.current = true;
        let unsubscribeLibrary: () => void;
        let unsubscribeAppReady: () => void;

        // Try to load immediately - bindings should be available
        loadFolders();

        // Listen for app_ready event in case bindings weren't ready immediately
        unsubscribeAppReady = EventsOn('app_ready', () => {
            console.log('[OneShotPage] Received app_ready event');
            if (isMountedRef.current) {
                loadFolders();
            }
        });

        // Listen for updates (e.g. from drag and drop)
        unsubscribeLibrary = EventsOn('library_updated', () => {
            if (isMountedRef.current) loadFolders();
        });

        return () => {
            isMountedRef.current = false;
            if (unsubscribeLibrary) unsubscribeLibrary();
            if (unsubscribeAppReady) unsubscribeAppReady();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - only run once on mount

    return {
        isLoading,
        reloadFolders: loadFolders,
    };
}
