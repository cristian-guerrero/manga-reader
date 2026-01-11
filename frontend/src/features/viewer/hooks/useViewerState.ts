/**
 * useViewerState - Hook to manage viewer state logic
 * Extracted from ViewerPage to improve separation of concerns
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTabStore, useSettingsStore } from '@stores';
import { useViewer } from '@hooks';
import { ViewerPersistenceService } from '@services/persistence';

interface UseViewerStateOptions {
    folderPath?: string;
    tabId?: string;
    isActive: boolean;
    params: Record<string, string>;
}

export function useViewerState({ folderPath, tabId, isActive, params }: UseViewerStateOptions) {
    const { verticalWidth } = useSettingsStore();
    const { setViewerState: updateTabState } = useViewer(tabId);
    
    // Get current state for this specific tab
    const tabState = useTabStore((state) => state.tabs.find((t) => t.id === tabId)?.viewerState);
    
    const currentFolder = tabState?.currentFolder || null;
    const images = tabState?.images || [];
    const currentIndex = tabState?.currentIndex || 0;
    const mode = tabState?.mode || 'vertical';
    const isLoading = tabState?.isLoading || false;
    const currentVerticalWidth = (tabState?.verticalWidth || 0) !== 0 
        ? (tabState?.verticalWidth || verticalWidth) 
        : verticalWidth;

    // Local state for resume position
    const [resumeIndex, setResumeIndex] = useState(() => {
        const initialTab = useTabStore.getState().tabs.find((t) => t.id === tabId);
        const initialTabState = initialTab?.viewerState;
        if (initialTabState?.currentIndex !== undefined && initialTabState.currentIndex >= 0) {
            return initialTabState.currentIndex;
        }
        if (folderPath) {
            try {
                const savedState = ViewerPersistenceService.load(folderPath);
                if (savedState && savedState.currentIndex >= 0) {
                    return savedState.currentIndex;
                }
            } catch (error) {
                // Ignore errors in initialization
            }
        }
        const tabParams = initialTab?.params;
        if (tabParams?.startIndex) {
            const startIndex = parseInt(tabParams.startIndex, 10);
            if (!isNaN(startIndex) && startIndex >= 0) {
                return startIndex;
            }
        }
        return 0;
    });

    const [resumeScrollPos, setResumeScrollPos] = useState(0);
    const [resetKey, setResetKey] = useState(0);
    const saveViewerStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSyncedIndexRef = useRef<number>(-1);
    const lastProcessedParamsRef = useRef<{ targetPath?: string; startIndex?: string } | null>(null);
    const currentScrollTopRef = useRef<number>(0);
    const scrollPositionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Unified handler for viewer state changes
    const handleViewerStateChange = useCallback((updates: { index?: number; width?: number }) => {
        if (!folderPath) return;

        if (updates.width !== undefined) {
            updateTabState({ verticalWidth: updates.width });
        }
        if (updates.index !== undefined) {
            updateTabState({ currentIndex: updates.index });
        }

        if (saveViewerStateTimerRef.current) {
            clearTimeout(saveViewerStateTimerRef.current);
        }

        saveViewerStateTimerRef.current = setTimeout(async () => {
            try {
                const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
                const tabViewerState = tab?.viewerState;
                const targetIndex = updates.index !== undefined 
                    ? updates.index 
                    : (tabViewerState?.currentIndex ?? 0);
                const targetWidth = updates.width !== undefined 
                    ? updates.width 
                    : ((tabViewerState?.verticalWidth || 0) !== 0 
                        ? (tabViewerState?.verticalWidth || verticalWidth) 
                        : verticalWidth);

                ViewerPersistenceService.save(folderPath, {
                    currentIndex: targetIndex,
                    verticalWidth: targetWidth
                });
            } catch (error) {
                console.error('[useViewerState] Failed to save viewer state:', error);
            }
        }, 500);
    }, [folderPath, verticalWidth, updateTabState, tabId]);

    const handleIndexChange = useCallback((index: number) => {
        handleViewerStateChange({ index });
    }, [handleViewerStateChange]);

    const handleWidthChange = useCallback((width: number) => {
        handleViewerStateChange({ width });
    }, [handleViewerStateChange]);

    const handleScrollPositionChange = useCallback((scrollTop: number) => {
        currentScrollTopRef.current = scrollTop;
        
        if (scrollPositionDebounceRef.current) {
            clearTimeout(scrollPositionDebounceRef.current);
        }
        scrollPositionDebounceRef.current = setTimeout(() => {
            const container = document.querySelector('.overflow-y-scroll') as HTMLElement;
            let scrollPercentage = 0;
            if (container) {
                const { scrollHeight, clientHeight } = container;
                const maxScroll = scrollHeight - clientHeight;
                if (maxScroll > 0) {
                    scrollPercentage = scrollTop / maxScroll;
                }
            }

            updateTabState({ scrollPosition: scrollPercentage });
        }, 100);
    }, [updateTabState]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveViewerStateTimerRef.current) {
                clearTimeout(saveViewerStateTimerRef.current);
            }
            if (scrollPositionDebounceRef.current) {
                clearTimeout(scrollPositionDebounceRef.current);
            }
        };
    }, []);

    return {
        // State
        currentFolder,
        images,
        currentIndex,
        mode,
        isLoading,
        currentVerticalWidth,
        resumeIndex,
        resumeScrollPos,
        resetKey,
        // Refs
        lastSyncedIndexRef,
        lastProcessedParamsRef,
        currentScrollTopRef,
        // Actions
        setResumeIndex,
        setResumeScrollPos,
        setResetKey,
        handleIndexChange,
        handleWidthChange,
        handleScrollPositionChange,
        updateTabState,
    };
}
