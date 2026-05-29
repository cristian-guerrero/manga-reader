import { useCallback, useRef } from 'react';
import { useTabStore } from '../stores/tabStore';
import { ImageInfo, FolderInfo, ViewerMode, ViewerState } from '../types';

const defaultViewerState: Partial<ViewerState> = {
    currentFolder: null,
    images: [],
    currentIndex: 0,
    mode: 'vertical',
    isLoading: false,
    zoomLevel: 1,
    scrollPosition: 0,
    verticalWidth: 0,
};

const EMPTY_IMAGES: ImageInfo[] = [];

/**
 * Hook to access viewer state and operations for a specific tab
 * Uses stable atomic selectors to prevent unnecessary re-renders.
 * Operations use getState() at call time instead of reactive subscription.
 */
export function useViewer(tabId?: string) {
    const activeTabId = useTabStore(state => state.activeTabId);
    const targetTabId = tabId || activeTabId;

    // Stable helper to update viewer state at call-time
    const updateViewerState = useCallback((updates: Partial<ViewerState>) => {
        if (!targetTabId) return;

        const store = useTabStore.getState();
        const currentTab = store.tabs.find(t => t.id === targetTabId);
        if (!currentTab) return;

        const currentState = currentTab.viewerState || defaultViewerState;
        store.updateTab(targetTabId, {
            viewerState: { ...currentState, ...updates } as ViewerState
        });
    }, [targetTabId]);

    // Stable helper to read current viewer state at call-time
    const readViewerState = useCallback((): Partial<ViewerState> => {
        const store = useTabStore.getState();
        const tab = store.tabs.find(t => t.id === targetTabId);
        return tab?.viewerState || defaultViewerState;
    }, [targetTabId]);

    // Select specific primitive/stable fields individually
    // Atomic selectors: .find() creates temp ref but we extract a stable value
    const currentFolder = useTabStore(state => {
        const tab = state.tabs.find(t => t.id === targetTabId);
        return tab?.viewerState?.currentFolder || null;
    });
    const images = useTabStore(state => {
        const tab = state.tabs.find(t => t.id === targetTabId);
        return tab?.viewerState?.images ?? EMPTY_IMAGES;
    });
    const currentIndex = useTabStore(state => {
        const tab = state.tabs.find(t => t.id === targetTabId);
        return tab?.viewerState?.currentIndex ?? 0;
    });
    const mode = useTabStore(state => {
        const tab = state.tabs.find(t => t.id === targetTabId);
        return tab?.viewerState?.mode || 'vertical';
    });
    const isLoading = useTabStore(state => {
        const tab = state.tabs.find(t => t.id === targetTabId);
        return tab?.viewerState?.isLoading ?? false;
    });
    const zoomLevel = useTabStore(state => {
        const tab = state.tabs.find(t => t.id === targetTabId);
        return tab?.viewerState?.zoomLevel ?? 1;
    });
    const scrollPosition = useTabStore(state => {
        const tab = state.tabs.find(t => t.id === targetTabId);
        return tab?.viewerState?.scrollPosition ?? 0;
    });
    const verticalWidth = useTabStore(state => {
        const tab = state.tabs.find(t => t.id === targetTabId);
        return tab?.viewerState?.verticalWidth ?? 0;
    });

    // Image navigation - uses readViewerState() at call time + images for bounds check
    const setCurrentIndex = useCallback((index: number) => {
        const vs = readViewerState();
        const imgs = vs.images || EMPTY_IMAGES;
        if (index >= 0 && index < imgs.length) {
            updateViewerState({ currentIndex: index });
        }
    }, [readViewerState, updateViewerState]);

    const nextImage = useCallback((): boolean => {
        const vs = readViewerState();
        const ci = vs.currentIndex ?? 0;
        const imgs = vs.images || EMPTY_IMAGES;
        if (ci < imgs.length - 1) {
            updateViewerState({ currentIndex: ci + 1 });
            return true;
        }
        return false;
    }, [readViewerState, updateViewerState]);

    const prevImage = useCallback((): boolean => {
        const vs = readViewerState();
        const ci = vs.currentIndex ?? 0;
        if (ci > 0) {
            updateViewerState({ currentIndex: ci - 1 });
            return true;
        }
        return false;
    }, [readViewerState, updateViewerState]);

    const goToImage = useCallback((index: number) => {
        const vs = readViewerState();
        const imgs = vs.images || EMPTY_IMAGES;
        if (index >= 0 && index < imgs.length) {
            updateViewerState({ currentIndex: index, scrollPosition: 0 });
        }
    }, [readViewerState, updateViewerState]);

    // Folder management
    const setCurrentFolder = useCallback((folder: FolderInfo | null) => {
        updateViewerState({ currentFolder: folder });
    }, [updateViewerState]);

    const setImages = useCallback((newImages: ImageInfo[]) => {
        updateViewerState({ images: newImages, currentIndex: 0, scrollPosition: 0 });
    }, [updateViewerState]);

    const clearViewer = useCallback(() => {
        updateViewerState(defaultViewerState as ViewerState);
    }, [updateViewerState]);

    // Viewer mode
    const setMode = useCallback((newMode: ViewerMode) => {
        updateViewerState({ mode: newMode });
    }, [updateViewerState]);

    // Loading state
    const setIsLoading = useCallback((loading: boolean) => {
        updateViewerState({ isLoading: loading });
    }, [updateViewerState]);

    // Zoom
    const setZoomLevel = useCallback((level: number) => {
        const clampedLevel = Math.min(5, Math.max(0.1, level));
        updateViewerState({ zoomLevel: clampedLevel });
    }, [updateViewerState]);

    const zoomIn = useCallback(() => {
        const vs = readViewerState();
        updateViewerState({ zoomLevel: Math.min(5, (vs.zoomLevel ?? 1) + 0.25) });
    }, [readViewerState, updateViewerState]);

    const zoomOut = useCallback(() => {
        const vs = readViewerState();
        updateViewerState({ zoomLevel: Math.max(0.1, (vs.zoomLevel ?? 1) - 0.25) });
    }, [readViewerState, updateViewerState]);

    const resetZoom = useCallback(() => {
        updateViewerState({ zoomLevel: 1 });
    }, [updateViewerState]);

    // Scroll position
    const setScrollPosition = useCallback((position: number) => {
        updateViewerState({ scrollPosition: position });
    }, [updateViewerState]);

    // Computed
    const getCurrentImage = useCallback((): ImageInfo | null => {
        const vs = readViewerState();
        const imgs = vs.images || EMPTY_IMAGES;
        const ci = vs.currentIndex ?? 0;
        return imgs[ci] || null;
    }, [readViewerState]);

    const hasNext = useCallback((): boolean => {
        const vs = readViewerState();
        const ci = vs.currentIndex ?? 0;
        const imgs = vs.images || EMPTY_IMAGES;
        return ci < imgs.length - 1;
    }, [readViewerState]);

    const hasPrev = useCallback((): boolean => {
        const vs = readViewerState();
        return (vs.currentIndex ?? 0) > 0;
    }, [readViewerState]);

    return {
        currentFolder,
        images,
        currentIndex,
        mode,
        isLoading,
        zoomLevel,
        scrollPosition,
        verticalWidth,
        setCurrentIndex,
        nextImage,
        prevImage,
        goToImage,
        setCurrentFolder,
        setImages,
        clearViewer,
        setMode,
        setIsLoading,
        setZoomLevel,
        zoomIn,
        zoomOut,
        resetZoom,
        setScrollPosition,
        setViewerState: updateViewerState,
        getCurrentImage,
        hasNext,
        hasPrev,
    };
}
