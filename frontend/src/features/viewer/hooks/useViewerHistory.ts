/**
 * useViewerHistory - Hook for saving reading progress to history
 * Uses refs for volatile values (scrollPosition, currentIndex) to prevent
 * cascading useCallback invalidation chain on every scroll.
 */

import { useCallback, useRef } from 'react';
import { FolderInfo, ImageInfo } from '@types';
import { AppAPI } from '@services/api/appAPI';

interface UseViewerHistoryOptions {
    currentFolder: FolderInfo | null;
    images: ImageInfo[];
    currentIndex: number;
    scrollPosition: number; // 0-1 percentage
    isNoHistorySession: boolean;
    verticalWidth: number;
}

export function useViewerHistory({
    currentFolder,
    images,
    currentIndex,
    scrollPosition,
    isNoHistorySession,
    verticalWidth,
}: UseViewerHistoryOptions) {
    // Refs for volatile values that change on every scroll/index change.
    // This prevents saveProgress from getting a new reference on every scroll,
    // which would cascade into 8+ useCallback invalidations in ViewerPage.
    const scrollPositionRef = useRef(scrollPosition);
    scrollPositionRef.current = scrollPosition;
    const currentIndexRef = useRef(currentIndex);
    currentIndexRef.current = currentIndex;

    const saveProgress = useCallback(async (customScrollPosition?: number) => {
        if (!currentFolder || images.length === 0 || isNoHistorySession) {
            return;
        }

        const ci = currentIndexRef.current;
        const sp = typeof customScrollPosition === 'number' && customScrollPosition >= 0 && customScrollPosition <= 1
            ? customScrollPosition
            : scrollPositionRef.current;

        try {
            await AppAPI.addHistory({
                folderPath: currentFolder.path,
                folderName: currentFolder.name,
                lastImage: images[ci]?.name || '',
                lastImageIndex: ci,
                scrollPosition: sp,
                totalImages: images.length,
                lastRead: new Date().toISOString(),
            });
            await AppAPI.saveViewerState(currentFolder.path, ci, verticalWidth, sp);
        } catch (error) {
            console.error('[useViewerHistory] Failed to save progress:', error);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentFolder, images, isNoHistorySession, verticalWidth]);
    // NOTE: scrollPosition and currentIndex intentionally omitted — read from refs

    return { saveProgress };
}
