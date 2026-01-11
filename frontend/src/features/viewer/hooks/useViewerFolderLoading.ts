/**
 * useViewerFolderLoading - Hook to handle folder and image loading logic
 * Extracted from ViewerPage to improve separation of concerns
 */

import { useEffect, useCallback } from 'react';
import { useTabStore } from '@stores';
import { AppAPI } from '@services/api/appAPI';
import { ViewerPersistenceService } from '@services/persistence';
import { FolderInfo, ImageInfo } from '@types';

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
    setResumeIndex: (index: number) => void;
    setResumeScrollPos: (pos: number) => void;
    lastSyncedIndexRef: React.MutableRefObject<number>;
    updateTabState: (updates: any) => void;
    onRestorationComplete: () => void;
    saveProgress: () => Promise<void>;
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
    setResumeIndex,
    setResumeScrollPos,
    lastSyncedIndexRef,
    updateTabState,
    onRestorationComplete,
    saveProgress,
}: UseViewerFolderLoadingOptions) {
    // Load folder and images
    useEffect(() => {
        if (!folderPath) return;
        if (!isActive) return; // Don't load if tab is not active - prevents content bleeding between tabs

        // Read tab state to check if we are in restoration
        const activeTabFromState = useTabStore.getState().tabs.find((t) => t.id === tabId);
        const isRestoredFromState = activeTabFromState?.restored;

        if (!isRestoredFromState && images.length > 0 && currentFolder?.path === folderPath) {
            console.log(`[useViewerFolderLoading] Eager check: Using existing images for ${folderPath}. Resuming at index ${currentIndex} (resumeIndex: ${resumeIndex}, lastSynced: ${lastSyncedIndexRef.current})`);
            // Important: ensure resumeIndex is updated to our last known position
            if (currentIndex !== resumeIndex) {
                console.log(`[useViewerFolderLoading] Eager check: Updating resumeIndex from ${resumeIndex} to ${currentIndex}`);
                setResumeIndex(currentIndex);
                lastSyncedIndexRef.current = currentIndex;
            } else {
                console.log(`[useViewerFolderLoading] Eager check: Already synced (resumeIndex=${resumeIndex}, currentIndex=${currentIndex})`);
            }
            return;
        }

        const loadFolder = async () => {
            const activeTab = useTabStore.getState().tabs.find((t) => t.id === tabId);
            // Save restored flag BEFORE clearing it - we need it for prioritization logic
            const isRestored = activeTab?.restored;

            if (isRestored) {
                console.log(`[useViewerFolderLoading] Restored tab detected for ${folderPath}. Forcing refresh to update stale URLs.`);
                // Clear restored flag so we don't force refresh every time we switch back to this tab
                useTabStore.getState().updateTab(tabId!, { restored: false });
            }

            // Save current progress before switching if not a no-history session
            if (currentFolder && !isNoHistorySession) {
                await saveProgress();
            }

            updateTabState({ isLoading: true });
            try {
                // Check if we should use shallow loading (non-recursive)
                const useShallow = params && params.shallow === 'true';

                // Use AppAPI service instead of direct window.go calls
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

                if (folderInfo) {
                    updateTabState({ currentFolder: folderInfo as FolderInfo });
                }
                if (imageList) {
                    const imgs = imageList as ImageInfo[];
                    let targetIndex = 0;
                    let targetScroll = 0;

                    // Check for targetPath or explicit start index from navigation params
                    const tabParams = activeTab?.params || {};
                    const targetPath = tabParams.targetPath;
                    const explicitStartIndex = tabParams.startIndex ? parseInt(tabParams.startIndex, 10) : -1;

                    // First, try to get scroll position from current tabState if available
                    const currentTabScroll = activeTab?.viewerState?.scrollPosition;
                    if (currentTabScroll && currentTabScroll > 0 && currentTabScroll <= 1) {
                        targetScroll = currentTabScroll; // Store percentage for now
                    }

                    // PRIORITIZATION LOGIC:
                    // 1. savedViewerState from backend (Resume from last session) - PRIORITY when restoring
                    // 2. targetPath specified in navigation params (Explicit user click) - Only if NOT restoring
                    // 3. explicitStartIndex in navigation params (Explicit user click) - Only if NOT restoring
                    // 4. history entry (Legacy fallback)

                    if (isRestored && savedViewerState && savedViewerState.currentIndex >= 0 && savedViewerState.currentIndex < imgs.length) {
                        targetIndex = savedViewerState.currentIndex;
                        console.log(`[useViewerFolderLoading] Restoring from BACKEND state (ignoring params): index=${targetIndex}`);
                    } else if (savedViewerState && savedViewerState.currentIndex >= 0 && savedViewerState.currentIndex < imgs.length) {
                        targetIndex = savedViewerState.currentIndex;
                        console.log(`[useViewerFolderLoading] Resuming from BACKEND state (ignoring targetPath): index=${targetIndex}`);
                    } else if (targetPath && !isRestored) {
                        const pathIndex = imgs.findIndex((img) => img.path === targetPath);
                        if (pathIndex >= 0) {
                            targetIndex = pathIndex;
                            console.log(`[useViewerFolderLoading] Starting from TARGET PATH: ${targetIndex} (${targetPath})`);
                        }
                    } else if (explicitStartIndex >= 0 && explicitStartIndex < imgs.length && !isRestored) {
                        targetIndex = explicitStartIndex;
                        console.log(`[useViewerFolderLoading] Starting from EXPLICIT INDEX: ${targetIndex}`);
                    } else if (historyEntry && historyEntry.lastImageIndex >= 0 && historyEntry.lastImageIndex < imgs.length) {
                        targetIndex = historyEntry.lastImageIndex;
                        console.log(`[useViewerFolderLoading] Resuming from history index: ${targetIndex}`);
                        if (historyEntry.scrollPosition > 0 && !targetScroll) {
                            targetScroll = historyEntry.scrollPosition;
                        }
                    }

                    // Set local state FIRST before store update
                    console.log(`[useViewerFolderLoading] Setting resumeIndex=${targetIndex}, resumeScrollPos=${targetScroll} (percentage)`);
                    setResumeIndex(targetIndex);
                    lastSyncedIndexRef.current = targetIndex;
                    setResumeScrollPos(targetScroll);

                    // Update store with new images and index
                    updateTabState({
                        images: imgs,
                        currentIndex: targetIndex,
                        scrollPosition: targetScroll,
                        verticalWidth: savedViewerState?.verticalWidth || 0,
                        currentFolder: folderInfo as FolderInfo,
                        isLoading: false
                    });
                }

            } catch (error) {
                console.error('[useViewerFolderLoading] Failed to load folder:', error);
                updateTabState({ isLoading: false });
            }
        };

        loadFolder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [folderPath, isActive, tabId]); // REMOVED resetKey to prevent infinite loop
}
