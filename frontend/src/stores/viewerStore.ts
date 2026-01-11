/**
 * Viewer Store - Compatibility wrapper for viewer operations
 * DEPRECATED: Use useViewer hook instead for new code
 * This store is maintained for backward compatibility
 * 
 * Note: State should be read directly from tabStore, not from this store
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

    // Internal helpers (for backward compatibility)
    _updateTabState: (updates: Partial<ViewerState>) => void;
    _updateTabStateById: (id: string, updates: Partial<ViewerState>) => void;
}

// Initial state values for when a tab has no viewerState yet
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

// Helper to update viewer state for a specific tab
function updateTabViewerState(tabId: string, updates: Partial<ViewerState>) {
    const tab = useTabStore.getState().tabs.find(t => t.id === tabId);
    if (!tab) return;

    const currentState = tab.viewerState || defaultViewerState;
    useTabStore.getState().updateTab(tabId, {
        viewerState: { ...currentState, ...updates } as ViewerState
    });
}

// Initialize state from active tab
const getInitialState = () => {
    const activeTab = useTabStore.getState().getActiveTab();
    const viewerState = activeTab.viewerState || defaultViewerState;
    return {
        currentFolder: viewerState.currentFolder ?? null,
        images: viewerState.images ?? [],
        currentIndex: viewerState.currentIndex ?? 0,
        mode: viewerState.mode ?? 'vertical',
        isLoading: viewerState.isLoading ?? false,
        zoomLevel: viewerState.zoomLevel ?? 1,
        scrollPosition: viewerState.scrollPosition ?? 0,
        verticalWidth: viewerState.verticalWidth ?? 0,
    };
};

export const useViewerStore = create<ViewerStoreState>((set, get) => ({
    ...getInitialState(),

    // Image navigation
    setCurrentIndex: (index) => {
        const activeTab = useTabStore.getState().getActiveTab();
        const viewerState = activeTab.viewerState;
        const images = viewerState?.images ?? [];
        if (index >= 0 && index < images.length) {
            updateTabViewerState(activeTab.id, { currentIndex: index });
        }
    },

    nextImage: () => {
        const activeTab = useTabStore.getState().getActiveTab();
        const viewerState = activeTab.viewerState;
        const currentIndex = viewerState?.currentIndex ?? 0;
        const images = viewerState?.images ?? [];
        if (currentIndex < images.length - 1) {
            updateTabViewerState(activeTab.id, { currentIndex: currentIndex + 1 });
        }
    },

    prevImage: () => {
        const activeTab = useTabStore.getState().getActiveTab();
        const viewerState = activeTab.viewerState;
        const currentIndex = viewerState?.currentIndex ?? 0;
        if (currentIndex > 0) {
            updateTabViewerState(activeTab.id, { currentIndex: currentIndex - 1 });
        }
    },

    goToImage: (index) => {
        const activeTab = useTabStore.getState().getActiveTab();
        const viewerState = activeTab.viewerState;
        const images = viewerState?.images ?? [];
        if (index >= 0 && index < images.length) {
            updateTabViewerState(activeTab.id, { currentIndex: index, scrollPosition: 0 });
        }
    },

    // Folder management
    setCurrentFolder: (folder) => {
        const activeTab = useTabStore.getState().getActiveTab();
        updateTabViewerState(activeTab.id, { currentFolder: folder });
    },

    setImages: (images) => {
        const activeTab = useTabStore.getState().getActiveTab();
        updateTabViewerState(activeTab.id, { images, currentIndex: 0, scrollPosition: 0 });
    },

    clearViewer: () => {
        const activeTab = useTabStore.getState().getActiveTab();
        updateTabViewerState(activeTab.id, defaultViewerState as ViewerState);
    },

    // Viewer mode
    setMode: (mode) => {
        const activeTab = useTabStore.getState().getActiveTab();
        updateTabViewerState(activeTab.id, { mode });
    },

    // Loading state
    setIsLoading: (isLoading) => {
        const activeTab = useTabStore.getState().getActiveTab();
        updateTabViewerState(activeTab.id, { isLoading });
    },

    // Zoom
    setZoomLevel: (level) => {
        const clampedLevel = Math.min(5, Math.max(0.1, level));
        const activeTab = useTabStore.getState().getActiveTab();
        updateTabViewerState(activeTab.id, { zoomLevel: clampedLevel });
    },

    zoomIn: () => {
        const activeTab = useTabStore.getState().getActiveTab();
        const viewerState = activeTab.viewerState;
        const zoomLevel = viewerState?.zoomLevel ?? 1;
        updateTabViewerState(activeTab.id, { zoomLevel: Math.min(5, zoomLevel + 0.25) });
    },

    zoomOut: () => {
        const activeTab = useTabStore.getState().getActiveTab();
        const viewerState = activeTab.viewerState;
        const zoomLevel = viewerState?.zoomLevel ?? 1;
        updateTabViewerState(activeTab.id, { zoomLevel: Math.max(0.1, zoomLevel - 0.25) });
    },

    resetZoom: () => {
        const activeTab = useTabStore.getState().getActiveTab();
        updateTabViewerState(activeTab.id, { zoomLevel: 1 });
    },

    // Scroll position
    setScrollPosition: (scrollPosition) => {
        const activeTab = useTabStore.getState().getActiveTab();
        updateTabViewerState(activeTab.id, { scrollPosition });
    },

    // Computed
    getCurrentImage: () => {
        const activeTab = useTabStore.getState().getActiveTab();
        const viewerState = activeTab.viewerState;
        const images = viewerState?.images ?? [];
        const currentIndex = viewerState?.currentIndex ?? 0;
        return images[currentIndex] || null;
    },

    hasNext: () => {
        const activeTab = useTabStore.getState().getActiveTab();
        const viewerState = activeTab.viewerState;
        const currentIndex = viewerState?.currentIndex ?? 0;
        const images = viewerState?.images ?? [];
        return currentIndex < images.length - 1;
    },

    hasPrev: () => {
        const activeTab = useTabStore.getState().getActiveTab();
        const viewerState = activeTab.viewerState;
        const currentIndex = viewerState?.currentIndex ?? 0;
        return currentIndex > 0;
    },

    setViewerState: (updates) => {
        const activeTab = useTabStore.getState().getActiveTab();
        updateTabViewerState(activeTab.id, updates);
    },

    // Internal helper to update tabStore for active tab (for backward compatibility)
    _updateTabState: (updates) => {
        const activeTabId = useTabStore.getState().activeTabId;
        if (activeTabId) {
            updateTabViewerState(activeTabId, updates);
        }
    },

    // Internal helper to update tabStore by ID (for backward compatibility)
    _updateTabStateById: (id, updates) => {
        updateTabViewerState(id, updates);
    },
}));

// Subscribe to tabStore changes to keep viewerStore state in sync (for backward compatibility)
useTabStore.subscribe((tabState) => {
    const activeTab = tabState.tabs.find(t => t.id === tabState.activeTabId) || tabState.tabs[0];
    if (activeTab?.viewerState) {
        const viewerState = activeTab.viewerState;
        useViewerStore.setState({
            currentFolder: viewerState.currentFolder,
            images: viewerState.images,
            currentIndex: viewerState.currentIndex,
            mode: viewerState.mode,
            isLoading: viewerState.isLoading,
            zoomLevel: viewerState.zoomLevel,
            scrollPosition: viewerState.scrollPosition,
            verticalWidth: viewerState.verticalWidth ?? 0,
        });
    } else {
        useViewerStore.setState({
            currentFolder: null,
            images: [],
            currentIndex: 0,
            mode: 'vertical',
            isLoading: false,
            zoomLevel: 1,
            scrollPosition: 0,
            verticalWidth: 0,
        });
    }
});
