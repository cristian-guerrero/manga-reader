/**
 * useViewerDataLoading - Hook for loading folder and image data
 * Extracts data loading logic from ViewerPage
 */

import { useEffect, useState } from 'react';
import { useTabStore } from '../../stores/tabStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { AppAPI } from '../../services/api/appAPI';
import { ViewerPersistenceService } from '../../services/persistence';
import { ImageInfo, FolderInfo } from '../../types';

interface UseViewerDataLoadingOptions {
    folderPath?: string;
    isActive: boolean;
    tabId?: string;
    currentFolder: FolderInfo | null;
    images: ImageInfo[];
    currentIndex: number;
    isNoHistorySession: boolean;
    onDataLoaded: (folder: FolderInfo | null, images: ImageInfo[], targetIndex: number, targetScroll: number) => void;
    onSaveProgress: () => Promise<void>;
}

/**
 * Hook for loading folder and image data
 */
export function useViewerDataLoading({
    folderPath,
    isActive,
    tabId,
    currentFolder,
    images,
    currentIndex,
    isNoHistorySession,
    onDataLoaded,
    onSaveProgress,
}: UseViewerDataLoadingOptions) {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!folderPath) return;
        if (!isActive) return; // Don't load if tab is not active

        // Read tab state to check if we are in restoration
        const activeTabFromState = useTabStore.getState().tabs.find(t => t.id === tabId);
        const isRestoredFromState = activeTabFromState?.restored;

        // Eager check: use existing images if available
        if (!isRestoredFromState && images.length > 0 && currentFolder?.path === folderPath) {
            return;
        }

        const loadFolder = async () => {
            const activeTab = useTabStore.getState().tabs.find(t => t.id === tabId);
            const isRestored = activeTab?.restored;

            if (isRestored) {
                console.log(`[useViewerDataLoading] Restored tab detected for ${folderPath}. Forcing refresh.`);
                useTabStore.getState().updateTab(tabId!, { restored: false });
            }

            // Save current progress before switching if not a no-history session
            if (currentFolder && !isNoHistorySession) {
                await onSaveProgress();
            }

            setIsLoading(true);
            try {
                // Check if we should use shallow loading (non-recursive)
                const navParams = useNavigationStore.getState().params;
                const useShallow = navParams && navParams.shallow === 'true';

                // Load folder info and images
                const folderInfo = useShallow
                    ? await AppAPI.getFolderInfoShallow(folderPath)
                    : await AppAPI.getFolderInfo(folderPath);

                const imageList = useShallow
                    ? await AppAPI.getImagesShallow(folderPath)
                    : await AppAPI.getImages(folderPath);

                // Fetch history for this folder (legacy fallback)
                const historyEntry = await AppAPI.getHistoryEntry(folderPath);

                // Fetch viewer state from localStorage (primary source for restoration)
                const savedViewerState = ViewerPersistenceService.load(folderPath);

                const imgs = imageList as ImageInfo[];
                let targetIndex = 0;
                let targetScroll = 0;

                // Check for targetPath or explicit start index from navigation params
                const tabParams = activeTab?.params || {};
                const targetPath = tabParams.targetPath;
                const explicitStartIndex = tabParams.startIndex ? parseInt(tabParams.startIndex, 10) : -1;

                // Get scroll position from current tab state if available
                const currentTabScroll = activeTab?.viewerState?.scrollPosition;
                if (currentTabScroll && currentTabScroll > 0 && currentTabScroll <= 1) {
                    targetScroll = currentTabScroll; // Percentage
                }

                // Prioritization logic for target index
                if (isRestored && savedViewerState && savedViewerState.currentIndex >= 0 && savedViewerState.currentIndex < imgs.length) {
                    targetIndex = savedViewerState.currentIndex;
                    console.log(`[useViewerDataLoading] Restoring from saved state: index=${targetIndex}`);
                } else if (targetPath && !isRestored) {
                    const pathIndex = imgs.findIndex(img => img.path === targetPath);
                    if (pathIndex >= 0) {
                        targetIndex = pathIndex;
                        console.log(`[useViewerDataLoading] Starting from target path: index=${targetIndex}`);
                    }
                } else if (explicitStartIndex >= 0 && explicitStartIndex < imgs.length && !isRestored) {
                    targetIndex = explicitStartIndex;
                    console.log(`[useViewerDataLoading] Starting from explicit index: ${targetIndex}`);
                } else if (savedViewerState && savedViewerState.currentIndex > 0 && savedViewerState.currentIndex < imgs.length) {
                    targetIndex = savedViewerState.currentIndex;
                    console.log(`[useViewerDataLoading] Resuming from saved state: index=${targetIndex}`);
                } else if (historyEntry && historyEntry.lastImageIndex > 0 && historyEntry.lastImageIndex < imgs.length) {
                    targetIndex = historyEntry.lastImageIndex;
                    console.log(`[useViewerDataLoading] Resuming from history: index=${targetIndex}`);
                    if (historyEntry.scrollPosition > 0 && !targetScroll) {
                        targetScroll = historyEntry.scrollPosition;
                    }
                }

                // Call callback with loaded data
                onDataLoaded(folderInfo as FolderInfo, imgs, targetIndex, targetScroll);
            } catch (error) {
                console.error('[useViewerDataLoading] Failed to load folder:', error);
                setIsLoading(false);
            }
        };

        loadFolder();
    }, [folderPath, isActive, tabId, currentFolder, images.length, currentIndex, isNoHistorySession, onDataLoaded, onSaveProgress]);

    return { isLoading };
}
