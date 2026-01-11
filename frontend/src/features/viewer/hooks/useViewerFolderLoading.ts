/**
 * useViewerFolderLoading - Hook to handle folder and image loading logic
 * Extracted from ViewerPage to improve separation of concerns
 */

import { useEffect, useCallback } from 'react';
import { useTabStore } from '../../../stores';
import { AppAPI } from '../../../services/api/appAPI';
import { FolderInfo, ImageInfo } from '../../../types';

interface UseViewerFolderLoadingOptions {
    folderPath?: string;
    tabId?: string;
    isActive: boolean;
    params: Record<string, string>;
    isNoHistorySession: boolean;
    currentFolder: FolderInfo | null;
    images: ImageInfo[];
    currentIndex: number;
    resumeIndex: number;
    lastSyncedIndexRef: React.MutableRefObject<number>;
    updateTabState: (updates: any) => void;
    onRestorationComplete: () => void;
}

export function useViewerFolderLoading({
    folderPath,
    tabId,
    isActive,
    params,
    isNoHistorySession,
    currentFolder,
    images,
    currentIndex,
    resumeIndex,
    lastSyncedIndexRef,
    updateTabState,
    onRestorationComplete,
}: UseViewerFolderLoadingOptions) {
    
    const saveProgress = useCallback(async () => {
        if (!currentFolder || !folderPath) return;
        // Progress saving logic would go here
    }, [currentFolder, folderPath]);

    // Load folder and images
    useEffect(() => {
        if (!folderPath) return;
        if (!isActive) return;

        const activeTabFromState = useTabStore.getState().tabs.find((t) => t.id === tabId);
        const isRestoredFromState = activeTabFromState?.restored;

        if (!isRestoredFromState && images.length > 0 && currentFolder?.path === folderPath) {
            if (currentIndex !== resumeIndex) {
                lastSyncedIndexRef.current = currentIndex;
            }
            return;
        }

        const loadFolder = async () => {
            const activeTab = useTabStore.getState().tabs.find((t) => t.id === tabId);
            const isRestored = activeTab?.restored;

            if (isRestored) {
                useTabStore.getState().updateTab(tabId!, { restored: false });
            }

            if (currentFolder && !isNoHistorySession) {
                await saveProgress();
            }

            updateTabState({ isLoading: true });
            try {
                const useShallow = params && params.shallow === 'true';
                const folderInfo = useShallow
                    ? await AppAPI.getFolderInfoShallow(folderPath)
                    : await AppAPI.getFolderInfo(folderPath);

                if (!folderInfo) {
                    console.error(`[useViewerFolderLoading] Folder not found: ${folderPath}`);
                    updateTabState({ isLoading: false });
                    return;
                }

                const imageList = useShallow
                    ? await AppAPI.getImagesShallow(folderPath)
                    : await AppAPI.getImages(folderPath);

                updateTabState({
                    currentFolder: folderInfo,
                    images: imageList,
                    isLoading: false,
                });

                if (isRestored) {
                    onRestorationComplete();
                }
            } catch (error) {
                console.error('[useViewerFolderLoading] Failed to load folder:', error);
                updateTabState({ isLoading: false });
            }
        };

        loadFolder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [folderPath, isActive, tabId, isNoHistorySession]);

    return { saveProgress };
}
