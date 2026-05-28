/**
 * useViewerTabSync - Hook to handle tab activation/deactivation sync
 * Extracted from ViewerPage to improve separation of concerns
 */

import { useEffect } from 'react';
import { useTabStore } from '@stores';

interface UseViewerTabSyncOptions {
    tabId?: string;
    isActive: boolean;
    folderPath?: string;
    images: any[];
    resumeIndex: number;
    setResumeIndex: (index: number) => void;
    setResumeScrollPos: (pos: number) => void;
    lastSyncedIndexRef: React.MutableRefObject<number>;
    lastProcessedParamsRef: React.MutableRefObject<{ targetPath?: string; startIndex?: string } | null>;
}

export function useViewerTabSync({
    tabId,
    isActive,
    folderPath,
    images,
    resumeIndex,
    setResumeIndex,
    setResumeScrollPos,
    lastSyncedIndexRef,
    lastProcessedParamsRef,
}: UseViewerTabSyncOptions) {
    useEffect(() => {
        if (!isActive) {
            // Reset lastSyncedIndexRef when tab becomes inactive so we sync again when it becomes active
            lastSyncedIndexRef.current = -1;
            // Also reset last processed params
            lastProcessedParamsRef.current = null;
            return;
        }
        if (images.length === 0) return;
        if (!folderPath) return;

        // Read currentIndex directly from tabState to ensure we have the latest value
        const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
        const tabCurrentIndex = tab?.viewerState?.currentIndex ?? 0;
        const tabScrollPosition = tab?.viewerState?.scrollPosition;

        if (tabCurrentIndex >= 0 && tabCurrentIndex < images.length && tabCurrentIndex !== resumeIndex) {
            console.log(`[useViewerTabSync] Tab activated: Syncing resumeIndex from ${resumeIndex} to ${tabCurrentIndex} for tab ${tabId}`);
            setResumeIndex(tabCurrentIndex);
            lastSyncedIndexRef.current = tabCurrentIndex;

            // Restore scroll position: use resumeScrollPos if available (exact pixels), otherwise convert percentage
            if (tabScrollPosition && tabScrollPosition > 0 && tabScrollPosition <= 1) {
                console.log(`[useViewerTabSync] Tab activated: Will restore scroll position percentage: ${tabScrollPosition}`);
                setResumeScrollPos(tabScrollPosition); // Set percentage, VerticalViewer will convert
            }

            // Mark current params as processed to prevent navigation seek from applying old params
            const currentParams = tab?.params;
            if (currentParams && (currentParams.targetPath || currentParams.startIndex)) {
                lastProcessedParamsRef.current = {
                    targetPath: currentParams.targetPath,
                    startIndex: currentParams.startIndex
                };
                console.log(`[useViewerTabSync] Tab activated: Marked current params as processed to prevent applying old navigation`);
            } else {
                lastProcessedParamsRef.current = null;
            }
        } else if (tabCurrentIndex === resumeIndex) {
            console.log(`[useViewerTabSync] Tab activated: Already synced (resumeIndex=${resumeIndex}, tabCurrentIndex=${tabCurrentIndex})`);
            lastSyncedIndexRef.current = tabCurrentIndex;

            // Mark current params as processed
            const currentParams = tab?.params;
            if (currentParams && (currentParams.targetPath || currentParams.startIndex)) {
                lastProcessedParamsRef.current = {
                    targetPath: currentParams.targetPath,
                    startIndex: currentParams.startIndex
                };
            } else {
                lastProcessedParamsRef.current = null;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, tabId, folderPath]); // Include tabId and folderPath to re-sync when switching tabs
}
