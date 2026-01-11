/**
 * useViewer - Hook for viewer operations
 * Replaces viewerStore proxy, uses tabStore directly
 */

import { useCallback } from 'react';
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

/**
 * Hook to access viewer state and operations for a specific tab
 */
export function useViewer(tabId?: string) {
    const activeTabId = useTabStore(state => state.activeTabId);
    const targetTabId = tabId || activeTabId;
    
    const tab = useTabStore(state => state.tabs.find(t => t.id === targetTabId));
    const updateTab = useTabStore(state => state.updateTab);
    
    const viewerState = tab?.viewerState || null;

    // Get current state values
    const currentFolder = viewerState?.currentFolder || null;
    const images = viewerState?.images || [];
    const currentIndex = viewerState?.currentIndex || 0;
    const mode = viewerState?.mode || 'vertical';
    const isLoading = viewerState?.isLoading || false;
    const zoomLevel = viewerState?.zoomLevel || 1;
    const scrollPosition = viewerState?.scrollPosition || 0;
    const verticalWidth = viewerState?.verticalWidth || 0;

    // Helper to update viewer state
    const updateViewerState = useCallback((updates: Partial<ViewerState>) => {
        if (!tab) return;

        const currentState = tab.viewerState || defaultViewerState;
        updateTab(tab.id, {
            viewerState: { ...currentState, ...updates } as ViewerState
        });
    }, [tab, updateTab]);

    // Image navigation
    const setCurrentIndex = useCallback((index: number) => {
        if (index >= 0 && index < images.length) {
            updateViewerState({ currentIndex: index });
        }
    }, [images.length, updateViewerState]);

    const nextImage = useCallback(() => {
        if (currentIndex < images.length - 1) {
            updateViewerState({ currentIndex: currentIndex + 1 });
        }
    }, [currentIndex, images.length, updateViewerState]);

    const prevImage = useCallback(() => {
        if (currentIndex > 0) {
            updateViewerState({ currentIndex: currentIndex - 1 });
        }
    }, [currentIndex, updateViewerState]);

    const goToImage = useCallback((index: number) => {
        if (index >= 0 && index < images.length) {
            updateViewerState({ currentIndex: index, scrollPosition: 0 });
        }
    }, [images.length, updateViewerState]);

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
        updateViewerState({ zoomLevel: Math.min(5, zoomLevel + 0.25) });
    }, [zoomLevel, updateViewerState]);

    const zoomOut = useCallback(() => {
        updateViewerState({ zoomLevel: Math.max(0.1, zoomLevel - 0.25) });
    }, [zoomLevel, updateViewerState]);

    const resetZoom = useCallback(() => {
        updateViewerState({ zoomLevel: 1 });
    }, [updateViewerState]);

    // Scroll position
    const setScrollPosition = useCallback((position: number) => {
        updateViewerState({ scrollPosition: position });
    }, [updateViewerState]);

    // Computed
    const getCurrentImage = useCallback((): ImageInfo | null => {
        return images[currentIndex] || null;
    }, [images, currentIndex]);

    const hasNext = useCallback((): boolean => {
        return currentIndex < images.length - 1;
    }, [currentIndex, images.length]);

    const hasPrev = useCallback((): boolean => {
        return currentIndex > 0;
    }, [currentIndex]);

    return {
        // State
        currentFolder,
        images,
        currentIndex,
        mode,
        isLoading,
        zoomLevel,
        scrollPosition,
        verticalWidth,
        // Operations
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
        // Computed
        getCurrentImage,
        hasNext,
        hasPrev,
    };
}
