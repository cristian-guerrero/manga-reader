/**
 * useThumbnailsPageScroll - Hook for managing scroll position in ThumbnailsPage
 */

import { useEffect, useRef, useCallback } from 'react';

interface UseThumbnailsPageScrollOptions {
    folderPath?: string;
    isLoading: boolean;
    imagesLength: number;
    thumbnailScrollPositions: Record<string, number>;
    setThumbnailScrollPosition: (folderPath: string, position: number) => void;
}

export function useThumbnailsPageScroll({
    folderPath,
    isLoading,
    imagesLength,
    thumbnailScrollPositions,
    setThumbnailScrollPosition,
}: UseThumbnailsPageScrollOptions) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const hasRestoredScroll = useRef<string | null>(null);

    // Restore scroll position
    useEffect(() => {
        if (!folderPath || isLoading || imagesLength === 0) return;

        if (hasRestoredScroll.current === folderPath) return;

        const savedPosition = thumbnailScrollPositions[folderPath];
        if (savedPosition !== undefined && savedPosition > 0 && scrollContainerRef.current) {
            console.log(`[ThumbnailsPage] Attempting to restore scroll to ${savedPosition} for ${folderPath}`);

            let attempts = 0;
            const maxAttempts = 10;

            const tryRestore = () => {
                const container = scrollContainerRef.current;
                if (!container) return;

                const maxScroll = container.scrollHeight - container.clientHeight;
                if (maxScroll >= savedPosition || attempts >= maxAttempts) {
                    container.scrollTop = savedPosition;
                    if (container.scrollTop > 0 || savedPosition === 0) {
                        console.log(`[ThumbnailsPage] Restored scroll to ${container.scrollTop} after ${attempts + 1} attempts`);
                        hasRestoredScroll.current = folderPath;
                    } else if (attempts < maxAttempts) {
                        attempts++;
                        setTimeout(tryRestore, 50 + (attempts * 20));
                    }
                } else {
                    attempts++;
                    setTimeout(tryRestore, 50 + (attempts * 20));
                }
            };

            setTimeout(tryRestore, 50);
        } else {
            hasRestoredScroll.current = folderPath;
        }
    }, [folderPath, isLoading, imagesLength, thumbnailScrollPositions]);

    // Reset restoration flag when folder changes
    useEffect(() => {
        if (folderPath !== hasRestoredScroll.current) {
            hasRestoredScroll.current = null;
        }
    }, [folderPath]);

    // Proactive scroll saving
    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (container && folderPath && !isLoading && imagesLength > 0) {
            const currentPos = container.scrollTop;
            if (hasRestoredScroll.current === folderPath) {
                setThumbnailScrollPosition(folderPath, currentPos);
            }
        }
    }, [folderPath, isLoading, imagesLength, setThumbnailScrollPosition]);

    const saveScrollPosition = useCallback(() => {
        if (scrollContainerRef.current && folderPath) {
            const pos = scrollContainerRef.current.scrollTop;
            setThumbnailScrollPosition(folderPath, pos);
        }
    }, [folderPath, setThumbnailScrollPosition]);

    return {
        scrollContainerRef,
        handleScroll,
        saveScrollPosition,
    };
}
