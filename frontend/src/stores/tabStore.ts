import { create } from 'zustand';
import { PageType, FolderInfo, ImageInfo, ViewerMode } from '../types';

interface HistoryEntry {
    page: PageType;
    params: Record<string, string>;
}

export interface Tab {
    id: string;
    title: string;
    page: PageType;
    params: Record<string, string>;
    history: HistoryEntry[];
    activeMenuPage: PageType | null;
    explorerState: {
        currentPath: string | null;
        pathHistory: string[];
    } | null;
    thumbnailScrollPositions: Record<string, number>;
    viewerState: {
        currentFolder: FolderInfo | null;
        images: ImageInfo[];
        currentIndex: number;
        mode: ViewerMode;
        isLoading: boolean;
        zoomLevel: number;
        scrollPosition: number;
    } | null;
}

interface TabStoreState {
    tabs: Tab[];
    activeTabId: string;

    // Actions
    addTab: (page?: PageType, params?: Record<string, string>, title?: string, initialState?: Partial<Tab>) => string;
    closeTab: (id: string) => void;
    setActiveTab: (id: string | number) => void;
    updateActiveTab: (updates: Partial<Tab>) => void;

    // Getters - used by navigation store proxy
    getActiveTab: () => Tab;

    // Persistence
    saveTabs: () => string;
    restoreTabs: (savedTabs: string) => void;
}

const createInitialTab = (): Tab => ({
    id: Math.random().toString(36).substring(2, 9),
    title: 'Home',
    page: 'home',
    params: {},
    history: [{ page: 'home', params: {} }],
    activeMenuPage: 'home',
    explorerState: null,
    thumbnailScrollPositions: {},
    viewerState: null,
});

export const useTabStore = create<TabStoreState>((set, get) => ({
    tabs: [createInitialTab()],
    activeTabId: '', // Will be set in the first tab creation or manually

    getActiveTab: () => {
        const { tabs, activeTabId } = get();
        return tabs.find(t => t.id === activeTabId) || tabs[0];
    },

    addTab: (page = 'home', params = {}, title = 'New Tab', initialState = {}) => {
        const newTab: Tab = {
            id: Math.random().toString(36).substring(2, 9),
            title,
            page,
            params,
            history: [{ page, params }],
            activeMenuPage: page as PageType,
            explorerState: null,
            thumbnailScrollPositions: {},
            viewerState: null,
            ...initialState,
        };

        set((state) => ({
            tabs: [...state.tabs, newTab],
            activeTabId: newTab.id,
        }));

        return newTab.id;
    },

    closeTab: (id) => {
        const { tabs, activeTabId } = get();
        if (tabs.length <= 1) return; // Don't close the last tab

        const index = tabs.findIndex(t => t.id === id);
        if (index === -1) return;

        const newTabs = tabs.filter(t => t.id !== id);
        let newActiveId = activeTabId;

        if (activeTabId === id) {
            // If we closed the active tab, switch to the next one or the last one
            newActiveId = newTabs[Math.min(index, newTabs.length - 1)].id;
        }

        set({ tabs: newTabs, activeTabId: newActiveId });
    },

    setActiveTab: (idOrIndex) => {
        const { tabs } = get();
        if (typeof idOrIndex === 'number') {
            if (idOrIndex >= 0 && idOrIndex < tabs.length) {
                set({ activeTabId: tabs[idOrIndex].id });
            }
        } else {
            if (tabs.some(t => t.id === idOrIndex)) {
                set({ activeTabId: idOrIndex });
            }
        }
    },

    updateActiveTab: (updates) => {
        set((state) => ({
            tabs: state.tabs.map(t =>
                t.id === state.activeTabId ? { ...t, ...updates } : t
            )
        }));
    },

    saveTabs: () => {
        const { tabs, activeTabId } = get();
        // Only save essential tab data (page, params, title)
        const savedData = tabs.map(tab => ({
            id: tab.id,
            title: tab.title,
            page: tab.page,
            params: tab.params,
        }));
        return JSON.stringify({ tabs: savedData, activeTabId });
    },

    restoreTabs: (savedTabs: string) => {
        try {
            const data = JSON.parse(savedTabs);
            if (data.tabs && Array.isArray(data.tabs) && data.tabs.length > 0) {
                // Reconstruct full Tab objects from saved data
                const restoredTabs: Tab[] = data.tabs.map((saved: any) => ({
                    id: saved.id || Math.random().toString(36).substring(2, 9),
                    title: saved.title || 'Home',
                    page: saved.page || 'home',
                    params: saved.params || {},
                    history: [{ page: saved.page || 'home', params: saved.params || {} }],
                    activeMenuPage: saved.page as PageType || 'home',
                    explorerState: null,
                    thumbnailScrollPositions: {},
                    viewerState: null,
                }));
                set({
                    tabs: restoredTabs,
                    activeTabId: data.activeTabId || restoredTabs[0].id
                });
                console.log('[TabStore] Restored', restoredTabs.length, 'tabs');
            }
        } catch (error) {
            console.error('[TabStore] Failed to restore tabs:', error);
        }
    },
}));

// Initialize activeTabId with the first tab's ID
const firstTab = useTabStore.getState().tabs[0];
useTabStore.setState({ activeTabId: firstTab.id });
