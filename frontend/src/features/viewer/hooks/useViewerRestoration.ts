/**
 * useViewerRestoration - Hook for managing viewer state restoration
 * Handles complex logic for determining restore index and scroll position
 */

import { useState, useEffect, useRef } from 'react';
import { ImageInfo, HistoryEntry } from '../../../types';
import { AppAPI } from '../../../services/api/appAPI';
import { ViewerPersistenceService } from '../../../services/persistence';
import { useTabStore } from '../../../stores/tabStore';

interface UseViewerRestorationOptions {
    folderPath: string;
    images: ImageInfo[];
    tabId?: string;
    isActive: boolean;
    currentIndex: number;
    targetPath?: string;
    explicitStartIndex?: string;
    isRestored?: boolean;
}

interface UseViewerRestorationResult {
    restoreIndex: number;
    restoreScrollPosition: number;
    setRestoreIndex: (index: number) => void;
    setRestoreScrollPosition: (position: number) => void;
}

/**
 * Calculate the target index based on priority:
 * 1. Saved viewer state (if restoring)
 * 2. targetPath (if new navigation)
 * 3. explicitStartIndex (if new navigation)
 * 4. Saved viewer state (fallback)
 * 5. History entry (legacy fallback)
 */
function calculateRestoreIndex(
    images: ImageInfo[],
    savedState: { currentIndex: number; verticalWidth: number } | null,
    historyEntry: HistoryEntry | null,
    targetPath: string | undefined,
    explicitStartIndex: number | undefined,
    isRestored: boolean
): number {
    // If restoring, prioritize saved state
    if (isRestored && savedState && savedState.currentIndex > 0 && savedState.currentIndex < images.length) {
        return savedState.currentIndex;
    }

    // New navigation - use targetPath or explicit index
    if (!isRestored) {
        if (targetPath) {
            const pathIndex = images.findIndex(img => img.path === targetPath);
            if (pathIndex >= 0) {
                return pathIndex;
            }
        }

        if (explicitStartIndex !== undefined && explicitStartIndex >= 0 && explicitStartIndex < images.length) {
            return explicitStartIndex;
        }
    }

    // Fallback to saved state
    if (savedState && savedState.currentIndex > 0 && savedState.currentIndex < images.length) {
        return savedState.currentIndex;
    }

    // Legacy fallback to history
    if (historyEntry && historyEntry.lastImageIndex > 0 && historyEntry.lastImageIndex < images.length) {
        return historyEntry.lastImageIndex;
    }

    return 0;
}

export function useViewerRestoration({
    folderPath,
    images,
    tabId,
    isActive,
    currentIndex,
    targetPath,
    explicitStartIndex,
    isRestored = false,
}: UseViewerRestorationOptions): UseViewerRestorationResult {
    const [restoreIndex, setRestoreIndex] = useState(0);
    const [restoreScrollPosition, setRestoreScrollPosition] = useState(0);
    const lastSyncedIndexRef = useRef<number>(-1);
    const lastProcessedParamsRef = useRef<{ targetPath?: string; startIndex?: string } | null>(null);

    // Load restoration data
    useEffect(() => {
        if (!folderPath || images.length === 0 || !isActive) {
            return;
        }

        let cancelled = false;

        const loadRestorationData = async () => {
            try {
                // Load saved state and history in parallel
                const [savedState, historyEntry] = await Promise.all([
                    Promise.resolve(ViewerPersistenceService.load(folderPath)),
                    AppAPI.getHistoryEntry(folderPath),
                ]);

                if (cancelled) return;

                // Get tab params
                const tab = useTabStore.getState().tabs.find(t => t.id === tabId);
                const tabParams = tab?.params || {};
                const targetPathFromParams = targetPath || tabParams.targetPath;
                const explicitIndexFromParams = tabParams.startIndex ? parseInt(tabParams.startIndex, 10) : -1;
                const explicitIndex: number | undefined = explicitStartIndex !== undefined
                    ? (typeof explicitStartIndex === 'string' ? parseInt(explicitStartIndex, 10) : explicitStartIndex)
                    : (explicitIndexFromParams >= 0 ? explicitIndexFromParams : undefined);

                // Calculate restore index
                const calculatedIndex = calculateRestoreIndex(
                    images,
                    savedState,
                    historyEntry,
                    targetPathFromParams,
                    explicitIndex,
                    isRestored
                );

                // Get scroll position from tab state or history
                let scrollPos = 0;
                const tabScrollPosition = tab?.viewerState?.scrollPosition;
                if (tabScrollPosition && tabScrollPosition > 0 && tabScrollPosition <= 1) {
                    scrollPos = tabScrollPosition; // Percentage
                } else if (historyEntry && historyEntry.scrollPosition > 0) {
                    scrollPos = historyEntry.scrollPosition; // Percentage
                }

                setRestoreIndex(calculatedIndex);
                setRestoreScrollPosition(scrollPos);
                lastSyncedIndexRef.current = calculatedIndex;
            } catch (error) {
                console.error('[useViewerRestoration] Failed to load restoration data:', error);
            }
        };

        loadRestorationData();

        return () => {
            cancelled = true;
        };
    }, [folderPath, images.length, isActive, tabId, isRestored]);

    // Sync with currentIndex when tab becomes active
    useEffect(() => {
        if (!isActive) {
            lastSyncedIndexRef.current = -1;
            lastProcessedParamsRef.current = null;
            return;
        }

        if (images.length === 0) return;

        const tab = useTabStore.getState().tabs.find(t => t.id === tabId);
        const tabCurrentIndex = tab?.viewerState?.currentIndex ?? 0;

        if (tabCurrentIndex >= 0 && tabCurrentIndex < images.length && tabCurrentIndex !== restoreIndex) {
            setRestoreIndex(tabCurrentIndex);
            lastSyncedIndexRef.current = tabCurrentIndex;

            // Restore scroll position from tab state
            const tabScrollPosition = tab?.viewerState?.scrollPosition;
            if (tabScrollPosition && tabScrollPosition > 0 && tabScrollPosition <= 1) {
                setRestoreScrollPosition(tabScrollPosition);
            }
        }
    }, [isActive, tabId, images.length, currentIndex, restoreIndex]);

    return {
        restoreIndex,
        restoreScrollPosition,
        setRestoreIndex,
        setRestoreScrollPosition,
    };
}
