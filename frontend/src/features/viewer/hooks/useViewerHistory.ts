/**
 * useViewerHistory - Hook for saving reading progress to history
 */

import { useCallback } from 'react';
import { FolderInfo, ImageInfo } from '../../../types';
import { AppAPI } from '../../../services/api/appAPI';

interface UseViewerHistoryOptions {
    currentFolder: FolderInfo | null;
    images: ImageInfo[];
    currentIndex: number;
    scrollPosition: number; // 0-1 percentage
    isNoHistorySession: boolean;
}

export function useViewerHistory({
    currentFolder,
    images,
    currentIndex,
    scrollPosition,
    isNoHistorySession,
}: UseViewerHistoryOptions) {
    const saveProgress = useCallback(async (customScrollPosition?: number) => {
        if (!currentFolder || images.length === 0 || isNoHistorySession) {
            return;
        }

        // Use provided scroll position or fallback to current
        const historyScrollPos = typeof customScrollPosition === 'number' && customScrollPosition >= 0 && customScrollPosition <= 1
            ? customScrollPosition
            : scrollPosition;

        try {
            await AppAPI.addHistory({
                folderPath: currentFolder.path,
                folderName: currentFolder.name,
                lastImage: images[currentIndex]?.name || '',
                lastImageIndex: currentIndex,
                scrollPosition: historyScrollPos,
                totalImages: images.length,
                lastRead: new Date().toISOString(),
            });
            console.log(`[useViewerHistory] Saved progress: index=${currentIndex}, scrollPos=${historyScrollPos}`);
        } catch (error) {
            console.error('[useViewerHistory] Failed to save progress:', error);
        }
    }, [currentFolder, images, currentIndex, scrollPosition, isNoHistorySession]);

    return { saveProgress };
}
