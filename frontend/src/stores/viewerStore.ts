/**
 * Viewer Store - Manages viewer state
 */

import { create } from 'zustand';
import { ViewerState, ImageInfo, FolderInfo, ViewerMode } from '../types';

interface ViewerStoreState extends ViewerState {
    // Image navigation
    setCurrentIndex: (index: number) => void;
    nextImage: () => void;
    prevImage: () => void;
    goToImage: (index: number) => void;

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
}

export const useViewerStore = create<ViewerStoreState>((set, get) => ({
    // Initial state
    currentFolder: null,
    images: [],
    currentIndex: 0,
    mode: 'vertical',
    isLoading: false,
    zoomLevel: 1,
    scrollPosition: 0,

    // Image navigation
    setCurrentIndex: (index) => {
        const { images } = get();
        if (index >= 0 && index < images.length) {
            set({ currentIndex: index });
        }
    },

    nextImage: () => {
        const { currentIndex, images } = get();
        if (currentIndex < images.length - 1) {
            set({ currentIndex: currentIndex + 1 });
        }
    },

    prevImage: () => {
        const { currentIndex } = get();
        if (currentIndex > 0) {
            set({ currentIndex: currentIndex - 1 });
        }
    },

    goToImage: (index) => {
        const { images } = get();
        if (index >= 0 && index < images.length) {
            set({ currentIndex: index, scrollPosition: 0 });
        }
    },

    // Folder management
    setCurrentFolder: (folder) => {
        set({ currentFolder: folder });
    },

    setImages: (images) => {
        set({ images, currentIndex: 0, scrollPosition: 0 });
    },

    clearViewer: () => {
        set({
            currentFolder: null,
            images: [],
            currentIndex: 0,
            isLoading: false,
            zoomLevel: 1,
            scrollPosition: 0,
        });
    },

    // Viewer mode
    setMode: (mode) => {
        set({ mode });
    },

    // Loading state
    setIsLoading: (isLoading) => {
        set({ isLoading });
    },

    // Zoom
    setZoomLevel: (level) => {
        const clampedLevel = Math.min(5, Math.max(0.1, level));
        set({ zoomLevel: clampedLevel });
    },

    zoomIn: () => {
        const { zoomLevel } = get();
        set({ zoomLevel: Math.min(5, zoomLevel + 0.25) });
    },

    zoomOut: () => {
        const { zoomLevel } = get();
        set({ zoomLevel: Math.max(0.1, zoomLevel - 0.25) });
    },

    resetZoom: () => {
        set({ zoomLevel: 1 });
    },

    // Scroll position
    setScrollPosition: (scrollPosition) => {
        set({ scrollPosition });
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
}));
