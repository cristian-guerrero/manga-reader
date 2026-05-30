import { useState, useCallback, useRef, useEffect } from 'react';
import { useTabStore, useSettingsStore } from '@stores';
import { useViewer } from '@hooks';
import { AppAPI } from '@services/api';

interface UseViewerStateOptions {
    folderPath?: string;
    tabId?: string;
    params: Record<string, string>;
}

export function useViewerState({ folderPath, tabId, params }: UseViewerStateOptions) {
    const verticalWidth = useSettingsStore(state => state.verticalWidth);
    const viewerMode = useSettingsStore(state => state.viewerMode);
    const { setViewerState: updateTabState } = useViewer(tabId);

    // Use stable atomic selectors instead of full viewerState object
    const currentFolder = useTabStore(state => {
        const tab = state.tabs.find((t) => t.id === tabId);
        return tab?.viewerState?.currentFolder || null;
    });
    const images = useTabStore(state => {
        const tab = state.tabs.find((t) => t.id === tabId);
        return tab?.viewerState?.images || [];
    });
    const currentIndex = useTabStore(state => {
        const tab = state.tabs.find((t) => t.id === tabId);
        return tab?.viewerState?.currentIndex ?? 0;
    });
    const mode = useTabStore(state => {
        const tab = state.tabs.find((t) => t.id === tabId);
        return tab?.viewerState?.mode || viewerMode;
    });
    const isLoading = useTabStore(state => {
        const tab = state.tabs.find((t) => t.id === tabId);
        return tab?.viewerState?.isLoading ?? false;
    });
    const tabVerticalWidth = useTabStore(state => {
        const tab = state.tabs.find((t) => t.id === tabId);
        const vw = tab?.viewerState?.verticalWidth;
        return (vw && vw !== 0) ? vw : 0;
    });
    const currentVerticalWidth = tabVerticalWidth !== 0 ? tabVerticalWidth : verticalWidth;

    // Local state for resume position
    const [resumeIndex, setResumeIndex] = useState(() => {
        const initialTab = useTabStore.getState().tabs.find((t) => t.id === tabId);
        const initialTabState = initialTab?.viewerState;
        if (initialTabState?.currentIndex !== undefined && initialTabState.currentIndex >= 0) {
            return initialTabState.currentIndex;
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

    const [resumeScrollPos, setResumeScrollPos] = useState(() => {
        const initialTab = useTabStore.getState().tabs.find((t) => t.id === tabId);
        const scrollPos = initialTab?.viewerState?.scrollPosition;
        return scrollPos && scrollPos > 0 && scrollPos <= 1 ? scrollPos : 0;
    });

    const [resetKey, setResetKey] = useState(0);
    const lastSyncedIndexRef = useRef<number>(-1);
    const lastProcessedParamsRef = useRef<{ targetPath?: string; startIndex?: string } | null>(null);
    const folderPathRef = useRef(folderPath);

    useEffect(() => {
        folderPathRef.current = folderPath;
    }, [folderPath]);

    // Unified handler for viewer state changes
    const handleViewerStateChange = useCallback(async (updates: { index?: number; width?: number }) => {
        if (!folderPath) return;

        if (updates.width !== undefined) {
            updateTabState({ verticalWidth: updates.width });
        }
        if (updates.index !== undefined) {
            updateTabState({ currentIndex: updates.index });
        }

        try {
            const store = useTabStore.getState();
            const tab = store.tabs.find((t) => t.id === tabId);
            const tabViewerState = tab?.viewerState;
            const targetIndex = updates.index !== undefined
                ? updates.index
                : (tabViewerState?.currentIndex ?? 0);
            const targetWidth = updates.width !== undefined
                ? updates.width
                : ((tabViewerState?.verticalWidth || 0) !== 0
                    ? (tabViewerState?.verticalWidth || verticalWidth)
                    : verticalWidth);
            const scrollPosition = tabViewerState?.scrollPosition ?? 0;

            await AppAPI.saveViewerState(folderPath, targetIndex, targetWidth, scrollPosition);
        } catch (error) {
            console.error('[useViewerState] Failed to save viewer state:', error);
        }
    }, [folderPath, verticalWidth, updateTabState, tabId]);

    const handleIndexChange = useCallback((index: number) => {
        handleViewerStateChange({ index });
    }, [handleViewerStateChange]);

    const handleWidthChange = useCallback((width: number) => {
        handleViewerStateChange({ width });
    }, [handleViewerStateChange]);

    return {
        currentFolder,
        images,
        currentIndex,
        mode,
        isLoading,
        currentVerticalWidth,
        resumeIndex,
        resumeScrollPos,
        resetKey,
        lastSyncedIndexRef,
        lastProcessedParamsRef,
        setResumeIndex,
        setResumeScrollPos,
        setResetKey,
        handleIndexChange,
        handleWidthChange,
        updateTabState,
    };
}
