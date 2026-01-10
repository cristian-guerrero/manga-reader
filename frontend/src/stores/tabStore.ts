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
    fromPage?: PageType | null;
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
        verticalWidth?: number;
    } | null;
    restored?: boolean;
}

interface TabStoreState {
    tabs: Tab[];
    activeTabId: string;
    isReady: boolean; // Flag to prevent saving during restoration

    // Actions
    addTab: (page?: PageType, params?: Record<string, string>, title?: string, initialState?: Partial<Tab>, makeActive?: boolean) => string;
    closeTab: (id: string) => void;
    setActiveTab: (id: string | number) => void;
    updateActiveTab: (updates: Partial<Tab>) => void;
    updateTab: (id: string, updates: Partial<Tab>) => void;
    reorderTabs: (oldIndex: number, newIndex: number) => void;

    // Getters - used by navigation store proxy
    getActiveTab: () => Tab;

    // Persistence
    saveTabs: () => string;
    completeRestoration: (id: string) => void;
    restoreTabs: (savedTabs: string) => void;
    setReady: (ready: boolean) => void;
    // New backend format methods
    saveTabsForBackend: () => {
        activeTabId: string;
        tabs: Array<{
            id: string;
            title: string;
            page: string;
            fromPage?: PageType | null;
            params: Record<string, string>;
            explorerState?: any;
            thumbnailScrollPositions?: Record<string, number>;
        }>
    };
    restoreTabsFromBackend: (data: {
        activeTabId: string;
        tabs: Array<{
            id: string;
            title: string;
            page: string;
            fromPage?: PageType | null;
            params: Record<string, string>;
            explorerState?: any;
            thumbnailScrollPositions?: Record<string, number>;
        }>
    }) => void;
}

const createInitialTab = (): Tab => ({
    id: Math.random().toString(36).substring(2, 9),
    title: 'Home',
    page: 'home',
    fromPage: null,
    params: {},
    history: [{ page: 'home', params: {} }],
    activeMenuPage: 'home',
    explorerState: null,
    thumbnailScrollPositions: {},
    viewerState: null,
});

export const useTabStore = create<TabStoreState>((set, get) => ({
    tabs: [createInitialTab()],
    activeTabId: '',
    isReady: false,
    // Will be set in the first tab creation or manually

    getActiveTab: () => {
        const { tabs, activeTabId } = get();
        return tabs.find(t => t.id === activeTabId) || tabs[0];
    },

    addTab: (page = 'home', params = {}, title = 'New Tab', initialState = {}, makeActive = true) => {
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
            activeTabId: makeActive ? newTab.id : state.activeTabId,
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

    updateTab: (id, updates) => {
        set((state) => ({
            tabs: state.tabs.map(t =>
                t.id === id ? { ...t, ...updates } : t
            )
        }));
    },

    setReady: (isReady) => set({ isReady }),

    reorderTabs: (oldIndex, newIndex) => {
        set((state) => {
            const newTabs = [...state.tabs];
            const [removed] = newTabs.splice(oldIndex, 1);
            newTabs.splice(newIndex, 0, removed);
            return { tabs: newTabs };
        });
    },

    saveTabs: () => {
        const { tabs, activeTabId } = get();
        // SIMPLIFIED: Only save essential data - no complex protection needed
        // Yomikiru approach: just save page number, nothing else
        const savedData = tabs.map(tab => ({
            id: tab.id,
            title: tab.title,
            page: tab.page,
            params: tab.params,
            explorerState: tab.explorerState,
            viewerState: tab.viewerState ? {
                // Only essential data for restoration
                currentFolder: tab.viewerState.currentFolder,
                currentIndex: tab.viewerState.currentIndex,
                mode: tab.viewerState.mode,
                verticalWidth: tab.viewerState.verticalWidth,
            } : null,
            thumbnailScrollPositions: tab.thumbnailScrollPositions,
        }));
        return JSON.stringify({ tabs: savedData, activeTabId });
    },

    completeRestoration: (id) => {
        set((state) => ({
            tabs: state.tabs.map(tab =>
                tab.id === id ? { ...tab, restored: false } : tab
            )
        }));
        console.log(`[TabStore] Restoration completed for tab: ${id}`);
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
                    explorerState: saved.explorerState || null,
                    thumbnailScrollPositions: saved.thumbnailScrollPositions || {},
                    viewerState: saved.viewerState ? {
                        ...saved.viewerState,
                        images: saved.viewerState.images || []
                    } : null,
                    restored: true, // Mark as restored to trigger URL refresh
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

    // Save tabs in backend format (minimal data)
    saveTabsForBackend: () => {
        const { tabs, activeTabId } = get();
        return {
            activeTabId,
            tabs: tabs.map(tab => ({
                id: tab.id,
                title: tab.title,
                page: tab.page,
                fromPage: tab.fromPage,
                params: tab.params,
                explorerState: tab.explorerState,
                thumbnailScrollPositions: tab.thumbnailScrollPositions
            }))
        };
    },

    // Restore tabs from backend format
    restoreTabsFromBackend: (data) => {
        if (!data.tabs || data.tabs.length === 0) return;

        const restoredTabs: Tab[] = data.tabs.map((saved) => ({
            id: saved.id || Math.random().toString(36).substring(2, 9),
            title: saved.title || 'Home',
            page: saved.page as PageType || 'home',
            fromPage: saved.fromPage || null,
            params: saved.params || {},
            history: [{ page: saved.page as PageType || 'home', params: saved.params || {} }],
            activeMenuPage: saved.page as PageType || 'home',
            explorerState: saved.explorerState || null,
            thumbnailScrollPositions: saved.thumbnailScrollPositions || {},
            viewerState: null,
            restored: true, // Mark as restored so ViewerPage loads state from backend
        }));

        set({
            tabs: restoredTabs,
            activeTabId: data.activeTabId || restoredTabs[0].id,
            isReady: false // Still not ready until App says so
        });
        console.log('[TabStore] Restored', restoredTabs.length, 'tabs from backend');
    },
}));

// Initialize activeTabId with the first tab's ID
const firstTab = useTabStore.getState().tabs[0];
useTabStore.setState({ activeTabId: firstTab.id });
