/**
 * useViewerFolderLoading - Hook to handle folder and image loading logic
 * Extracted from ViewerPage to improve separation of concerns
 */

import { useEffect, useState } from 'react';
import { useTabStore } from '@stores';
import { AppAPI } from '@services/api/appAPI';
import { FolderAPI } from '@services/api/folderAPI';
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
    sortBy?: string;
    sortOrder?: string;
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
    sortBy,
    sortOrder,
}: UseViewerFolderLoadingOptions) {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!folderPath) return;
        if (!isActive) return;

        let cancelled = false;

        const loadData = async () => {
            try {
                const activeTab = useTabStore.getState().tabs.find((t) => t.id === tabId);
                const isRestored = activeTab?.restored;

                // Skip backend fetch if tab already has loaded images for this exact folder
                // (prevents stale data from backend returning different index on tab switch)
                const tabState = activeTab?.viewerState;
                if (tabState?.images?.length && tabState?.currentFolder?.path === folderPath && !isRestored) {
                    const ci = tabState.currentIndex ?? 0;
                    const sp = tabState.scrollPosition;
                    console.log(`[useViewerFolderLoading] Skipping fetch, tab already loaded. index=${ci}, scrollPos=${sp}`);
                    setResumeIndex(ci);
                    lastSyncedIndexRef.current = ci;
                    if (sp && sp > 0) {
                        setResumeScrollPos(sp);
                    }
                    return;
                }

                setIsLoading(true);
                updateTabState({ isLoading: true });

                if (isRestored) {
                    console.log(`[useViewerFolderLoading] Restored tab detected for ${folderPath}. Forcing refresh.`);
                    useTabStore.getState().updateTab(tabId!, { restored: false });
                }

                // Save current progress before switching if not a no-history session
                if (currentFolder && !isNoHistorySession && !cancelled) {
                    await saveProgress();
                }

                if (cancelled) return;

                // Check if we should use shallow loading (non-recursive)
                const useShallow = params && params.shallow === 'true';

                // Load folder info and images
                const folderInfo = useShallow
                    ? await AppAPI.getFolderInfoShallow(folderPath)
                    : await AppAPI.getFolderInfo(folderPath);

                if (cancelled) return;

                const hasSortPrefs = sortBy !== undefined && (sortBy !== 'name' || sortOrder === 'desc');
                const imageList = useShallow
                    ? (hasSortPrefs
                        ? await FolderAPI.getImagesShallowWithSort(folderPath, sortBy, sortOrder || 'asc')
                        : await AppAPI.getImagesShallow(folderPath))
                    : (hasSortPrefs
                        ? await FolderAPI.getImagesWithSort(folderPath, sortBy, sortOrder || 'asc')
                        : await AppAPI.getImages(folderPath));

                if (cancelled) return;

                // Fetch history and viewer state sequentially
                const historyEntry = await AppAPI.getHistoryEntry(folderPath);
                if (cancelled) return;

                const savedViewerState = await AppAPI.getViewerState(folderPath);

                if (cancelled) return;

                if (folderInfo && imageList) {
                    const imgs = imageList as ImageInfo[];
                    let targetIndex = 0;
                    let targetScroll = 0;

                    // Check for targetPath or explicit start index from navigation params
                    const tabParams = activeTab?.params || {};
                    const targetPath = tabParams.targetPath;
                    const explicitStartIndex = tabParams.startIndex ? parseInt(tabParams.startIndex, 10) : -1;

                    // Get scroll position from current viewer state if available
                    const currentTabScroll = activeTab?.viewerState?.scrollPosition;
                    if (currentTabScroll && currentTabScroll > 0 && currentTabScroll <= 1) {
                        targetScroll = currentTabScroll;
                    }

                    // Prioritization logic for target index
                    if (isRestored) {
                        // Use the tab's own restored viewerState (avoids double-overwrite from backend)
                        const restoredState = activeTab?.viewerState;
                        if (restoredState?.currentIndex !== undefined && restoredState.currentIndex >= 0 && restoredState.currentIndex < imgs.length) {
                            targetIndex = restoredState.currentIndex;
                            console.log(`[useViewerFolderLoading] Using tab's restored state: index=${targetIndex}`);
                            if (restoredState.scrollPosition && restoredState.scrollPosition > 0 && restoredState.scrollPosition <= 1) {
                                targetScroll = restoredState.scrollPosition;
                            }
                        } else if (savedViewerState && savedViewerState.currentIndex >= 0 && savedViewerState.currentIndex < imgs.length) {
                            targetIndex = savedViewerState.currentIndex;
                            console.log(`[useViewerFolderLoading] Fallback to BACKEND state: index=${targetIndex}`);
                            if (savedViewerState.scrollPosition && savedViewerState.scrollPosition > 0 && savedViewerState.scrollPosition <= 1) {
                                targetScroll = savedViewerState.scrollPosition;
                            }
                        }
                    } else if (tabState?.currentIndex !== undefined && tabState.currentIndex >= 0 && tabState.currentIndex < imgs.length && tabState.currentFolder?.path === folderPath) {
                        targetIndex = tabState.currentIndex;
                        console.log(`[useViewerFolderLoading] Using tab's currentIndex: ${targetIndex}`);
                        if (tabState.scrollPosition && tabState.scrollPosition > 0 && tabState.scrollPosition <= 1) {
                            targetScroll = tabState.scrollPosition;
                        }
                    } else if (targetPath && !isRestored) {
                        const pathIndex = imgs.findIndex((img) => img.path === targetPath);
                        if (pathIndex >= 0) {
                            targetIndex = pathIndex;
                            console.log(`[useViewerFolderLoading] Starting from TARGET PATH: ${targetIndex} (${targetPath})`);
                        } else if (savedViewerState && savedViewerState.currentIndex >= 0 && savedViewerState.currentIndex < imgs.length) {
                            // Fallback to saved state if targetPath not found
                            targetIndex = savedViewerState.currentIndex;
                            console.log(`[useViewerFolderLoading] TARGET PATH not found, resuming from BACKEND state: index=${targetIndex}`);
                        }
                    } else if (explicitStartIndex >= 0 && explicitStartIndex < imgs.length && !isRestored) {
                        targetIndex = explicitStartIndex;
                        console.log(`[useViewerFolderLoading] Starting from EXPLICIT INDEX: ${targetIndex}`);
                    } else if (tabParams.endOfChapter === 'true' && !isRestored) {
                        targetIndex = imgs.length - 1;
                        console.log(`[useViewerFolderLoading] End of chapter: index=${targetIndex}`);
                    } else if (savedViewerState && savedViewerState.currentIndex >= 0 && savedViewerState.currentIndex < imgs.length) {
                        targetIndex = savedViewerState.currentIndex;
                        console.log(`[useViewerFolderLoading] Resuming from BACKEND state: index=${targetIndex}`);
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
                    // Preserve restored tab's own verticalWidth when available
                    const restoredVerticalWidth = (isRestored && activeTab?.viewerState?.verticalWidth)
                        ? activeTab.viewerState.verticalWidth
                        : (savedViewerState?.verticalWidth || 0);
                    updateTabState({
                        images: imgs,
                        currentIndex: targetIndex,
                        scrollPosition: targetScroll,
                        verticalWidth: restoredVerticalWidth,
                        currentFolder: folderInfo as FolderInfo,
                        isLoading: false
                    });
                    setIsLoading(false);
                } else {
                    updateTabState({ isLoading: false });
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('[useViewerFolderLoading] Failed to load folder:', error);
                updateTabState({ isLoading: false });
                setIsLoading(false);
            }
        };

        loadData();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [folderPath, isActive, tabId]);

    return { isLoading };
}
