/**
 * Viewer Store - Manages viewer state
 * Refactored to support multiple tabs via tabStore
 */

import { create } from 'zustand';
import { ViewerState, ImageInfo, FolderInfo, ViewerMode } from '../types';
import { useTabStore } from './tabStore';

interface ViewerStoreState extends ViewerState {
    // Image navigation
    setCurrentIndex: (index: number) => void;
    nextImage: () => void;
    prevImage: () => void;
    goToImage: (index: number) => void;
    setViewerState: (state: Partial<ViewerState>) => void;

    // Folder management
    setCurrentFolder: (folder: FolderInfo | null) => void;
    setImages: (images: ImageInfo[]) => void;
    clearViewer: () => void;

    // Viewer mode
    setMode: (mode: ViewerMode) => void;

    // Loading state
    setIsLoading: (loading: boolean) => void;

    // Zoom
    setZoomLevel: (level: number) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;

    // Scroll position (for history)
    setScrollPosition: (position: number) => void;

    // Computed
    getCurrentImage: () => ImageInfo | null;
    hasNext: () => boolean;
    hasPrev: () => boolean;

    // Internal helper (should be treated as private)
    _updateTabState: (updates: Partial<ViewerState>) => void;
}

// Initial state values for when a tab has no viewerState yet
const defaultViewerState = {
    currentFolder: null,
    images: [],
    currentIndex: 0,
    mode: 'vertical' as ViewerMode,
    isLoading: false,
    zoomLevel: 1,
    scrollPosition: 0,
};

export const useViewerStore = create<ViewerStoreState>((set, get) => ({
    // Proxy properties
    currentFolder: useTabStore.getState().getActiveTab().viewerState?.currentFolder ?? defaultViewerState.currentFolder,
    images: useTabStore.getState().getActiveTab().viewerState?.images ?? defaultViewerState.images,
    currentIndex: useTabStore.getState().getActiveTab().viewerState?.currentIndex ?? defaultViewerState.currentIndex,
    mode: useTabStore.getState().getActiveTab().viewerState?.mode ?? defaultViewerState.mode,
    isLoading: useTabStore.getState().getActiveTab().viewerState?.isLoading ?? defaultViewerState.isLoading,
    zoomLevel: useTabStore.getState().getActiveTab().viewerState?.zoomLevel ?? defaultViewerState.zoomLevel,
    scrollPosition: useTabStore.getState().getActiveTab().viewerState?.scrollPosition ?? defaultViewerState.scrollPosition,

    // Image navigation
    setCurrentIndex: (index) => {
        const { images } = get();
        if (index >= 0 && index < images.length) {
            get()._updateTabState({ currentIndex: index });
        }
    },

    nextImage: () => {
        const { currentIndex, images } = get();
        if (currentIndex < images.length - 1) {
            get()._updateTabState({ currentIndex: currentIndex + 1 });
        }
    },

    prevImage: () => {
        const { currentIndex } = get();
        if (currentIndex > 0) {
            get()._updateTabState({ currentIndex: currentIndex - 1 });
        }
    },

    goToImage: (index) => {
        const { images } = get();
        if (index >= 0 && index < images.length) {
            get()._updateTabState({ currentIndex: index, scrollPosition: 0 });
        }
    },

    // Folder management
    setCurrentFolder: (folder) => {
        get()._updateTabState({ currentFolder: folder });
    },

    setImages: (images) => {
        get()._updateTabState({ images, currentIndex: 0, scrollPosition: 0 });
    },

    clearViewer: () => {
        get()._updateTabState(defaultViewerState);
    },

    // Viewer mode
    setMode: (mode) => {
        get()._updateTabState({ mode });
    },

    // Loading state
    setIsLoading: (isLoading) => {
        get()._updateTabState({ isLoading });
    },

    // Zoom
    setZoomLevel: (level) => {
        const clampedLevel = Math.min(5, Math.max(0.1, level));
        get()._updateTabState({ zoomLevel: clampedLevel });
    },

    zoomIn: () => {
        const { zoomLevel } = get();
        get()._updateTabState({ zoomLevel: Math.min(5, zoomLevel + 0.25) });
    },

    zoomOut: () => {
        const { zoomLevel } = get();
        get()._updateTabState({ zoomLevel: Math.max(0.1, zoomLevel - 0.25) });
    },

    resetZoom: () => {
        get()._updateTabState({ zoomLevel: 1 });
    },

    // Scroll position
    setScrollPosition: (scrollPosition) => {
        get()._updateTabState({ scrollPosition });
    },

    // Computed
    getCurrentImage: () => {
        const { images, currentIndex } = get();
        return images[currentIndex] || null;
    },

    hasNext: () => {
        const { currentIndex, images } = get();
        return currentIndex < images.length - 1;
    },

    hasPrev: () => {
        const { currentIndex } = get();
        return currentIndex > 0;
    },

    setViewerState: (updates) => {
        get()._updateTabState(updates);
    },

    // Internal helper to update tabStore
    _updateTabState: (updates: any) => {
        const activeTab = useTabStore.getState().getActiveTab();
        const currentState = activeTab.viewerState || defaultViewerState;
        useTabStore.getState().updateActiveTab({
            viewerState: { ...currentState, ...updates }
        });
    }
}));

// Subscribe to tabStore changes to trigger re-renders in viewerStore consumers
useTabStore.subscribe((tabState) => {
    const activeTab = tabState.tabs.find(t => t.id === tabState.activeTabId) || tabState.tabs[0];
    const viewerState = activeTab?.viewerState || defaultViewerState;

    if (activeTab) {
        useViewerStore.setState({
            currentFolder: viewerState.currentFolder,
            images: viewerState.images,
            currentIndex: viewerState.currentIndex,
            mode: viewerState.mode,
            isLoading: viewerState.isLoading,
            zoomLevel: viewerState.zoomLevel,
            scrollPosition: viewerState.scrollPosition,
        });
    }
});
