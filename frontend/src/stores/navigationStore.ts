/**
 * Navigation Store - Manages app navigation state with proper history stack
 * Refactored to support multiple tabs via tabStore
 */

import { create } from 'zustand';
import { PageType, NavigationState, FolderInfo } from '../types';
import { useTabStore, Tab } from './tabStore';

interface HistoryEntry {
    page: PageType;
    params: Record<string, string>;
}

interface NavigationStoreState extends NavigationState {
    fromPage: PageType | null;
    history: HistoryEntry[];
    folders: FolderInfo[];
    setFolders: (folders: FolderInfo[] | ((prev: FolderInfo[]) => FolderInfo[])) => void;

    // Active menu page - tracks which menu item should be highlighted
    activeMenuPage: PageType | null;

    // Actions
    navigate: (page: PageType, params?: Record<string, string>, activeMenuPage?: PageType) => void;
    goBack: () => void;
    setParams: (params: Record<string, string>) => void;
    clearHistory: () => void;

    // Panic mode
    isPanicMode: boolean;
    triggerPanic: () => void;
    exitPanic: () => void;

    // Processing mode (e.g. ZIP extraction)
    isProcessing: boolean;
    setIsProcessing: (isProcessing: boolean) => void;

    // Thumbnail scroll state
    thumbnailScrollPositions: Record<string, number>;
    setThumbnailScrollPosition: (folderPath: string, position: number) => void;

    // Explorer state preservation
    explorerState: {
        currentPath: string | null;
        pathHistory: string[];
    } | null;
    setExplorerState: (state: { currentPath: string | null; pathHistory: string[] } | null) => void;
}

// Internal state for things that are truly global (not per tab)
let globalIsPanicMode = false;
let globalIsProcessing = false;
let globalFolders: FolderInfo[] = [];

export const useNavigationStore = create<NavigationStoreState>((set, get) => ({
    // These getters will return values from the active tab
    currentPage: useTabStore.getState().getActiveTab().page,
    previousPage: useTabStore.getState().getActiveTab().history.length > 1
        ? useTabStore.getState().getActiveTab().history[useTabStore.getState().getActiveTab().history.length - 2].page
        : null,
    fromPage: useTabStore.getState().getActiveTab().fromPage || null,
    params: useTabStore.getState().getActiveTab().params,
    history: useTabStore.getState().getActiveTab().history,
    activeMenuPage: useTabStore.getState().getActiveTab().activeMenuPage,
    thumbnailScrollPositions: useTabStore.getState().getActiveTab().thumbnailScrollPositions,
    explorerState: useTabStore.getState().getActiveTab().explorerState,

    // Global state
    isPanicMode: globalIsPanicMode,
    isProcessing: globalIsProcessing,
    folders: globalFolders,

    // Actions
    navigate: (page, params = {}, activeMenuPageOverride = undefined) => {
        const activeTab = useTabStore.getState().getActiveTab();
        const { history } = activeTab;

        let activeMenuPage: PageType | null;
        const mainPages: PageType[] = ['home', 'explorer', 'history', 'oneShot', 'series', 'download', 'settings'];

        if (activeMenuPageOverride !== undefined) {
            activeMenuPage = activeMenuPageOverride;
        } else if (mainPages.includes(page)) {
            activeMenuPage = page;
        } else {
            activeMenuPage = activeTab.activeMenuPage || null;
        }

        const newHistory = [...history, { page, params }];

        // Determine the title - use folder name for viewer pages
        let newTitle = page.charAt(0).toUpperCase() + page.slice(1);
        if (page === 'viewer' && params.folder) {
            // Extract folder name from path
            const folderPath = params.folder;
            const folderName = folderPath.split(/[\\/]/).pop() || 'Viewer';
            newTitle = folderName;
        }

        useTabStore.getState().updateActiveTab({
            page,
            fromPage: activeTab.page, // Save previous page as fromPage
            params,
            history: newHistory,
            activeMenuPage,
            title: newTitle
        });

        // Save main pages to settings for startup restore
        const mainPagesToSave = ['home', 'oneShot', 'series', 'history', 'download', 'settings'];
        if (mainPagesToSave.includes(page)) {
            // @ts-ignore - Dynamic import to avoid circular dependency
            import('./settingsStore').then(({ useSettingsStore }) => {
                useSettingsStore.getState().setLastPage(page);
            });
        }

        // Force a re-render by setting a dummy value if needed, 
        // but since components listen to useTabStore too, it might be fine.
        // To be safe with existing useNavigationStore users, we trigger a local set.
        set({});
    },

    goBack: () => {
        const activeTab = useTabStore.getState().getActiveTab();
        const { history } = activeTab;

        if (history.length > 1) {
            const newHistory = history.slice(0, -1);
            const previous = newHistory[newHistory.length - 1];

            const mainPages: PageType[] = ['home', 'explorer', 'history', 'oneShot', 'series', 'download', 'settings'];
            let activeMenuPage: PageType | null = previous.page;
            if (!mainPages.includes(previous.page)) {
                const lastMainPage = newHistory.slice().reverse().find(h => mainPages.includes(h.page));
                activeMenuPage = lastMainPage ? lastMainPage.page : activeTab.activeMenuPage || 'home';
            }

            // Determine the title - use folder name for viewer pages
            let newTitle = previous.page.charAt(0).toUpperCase() + previous.page.slice(1);
            if (previous.page === 'viewer' && previous.params.folder) {
                const folderPath = previous.params.folder;
                const folderName = folderPath.split(/[\\/]/).pop() || 'Viewer';
                newTitle = folderName;
            }

            useTabStore.getState().updateActiveTab({
                page: previous.page,
                params: previous.params,
                history: newHistory,
                activeMenuPage,
                title: newTitle
            });
        } else {
            useTabStore.getState().updateActiveTab({
                page: 'home',
                params: {},
                history: [{ page: 'home', params: {} }],
                activeMenuPage: 'home',
                title: 'Home'
            });
        }
        set({});
    },

    setParams: (params) => {
        const activeTab = useTabStore.getState().getActiveTab();
        const { history, page } = activeTab;

        const newHistory = [...history];
        if (newHistory.length > 0) {
            newHistory[newHistory.length - 1] = { page, params };
        }

        useTabStore.getState().updateActiveTab({ params, history: newHistory });
        set({});
    },

    clearHistory: () => {
        useTabStore.getState().updateActiveTab({
            history: [{ page: 'home', params: {} }],
            page: 'home',
            params: {},
            activeMenuPage: 'home',
            title: 'Home'
        });
        set({});
    },

    triggerPanic: () => {
        globalIsPanicMode = true;
        set({ isPanicMode: true });
        // Panic also navigates active tab to settings as a safety
        get().navigate('settings');
    },

    exitPanic: () => {
        globalIsPanicMode = false;
        set({ isPanicMode: false });
    },

    setIsProcessing: (isProcessing) => {
        globalIsProcessing = isProcessing;
        set({ isProcessing });
    },

    setThumbnailScrollPosition: (folderPath, position) => {
        const activeTab = useTabStore.getState().getActiveTab();
        useTabStore.getState().updateActiveTab({
            thumbnailScrollPositions: {
                ...activeTab.thumbnailScrollPositions,
                [folderPath]: position,
            }
        });
        set({});
    },

    setFolders: (folders) => {
        if (typeof folders === 'function') {
            globalFolders = folders(globalFolders);
        } else {
            globalFolders = folders;
        }
        set({ folders: globalFolders });
    },

    setExplorerState: (state) => {
        useTabStore.getState().updateActiveTab({ explorerState: state });
        set({});
    },
}));

// Subscribe to tabStore changes to trigger re-renders in navigationStore consumers
useTabStore.subscribe((tabState) => {
    const activeTab = tabState.tabs.find(t => t.id === tabState.activeTabId) || tabState.tabs[0];

    if (activeTab) {
        useNavigationStore.setState({
            currentPage: activeTab.page,
            previousPage: activeTab.history.length > 1
                ? activeTab.history[activeTab.history.length - 2].page
                : null,
            params: activeTab.params,
            history: activeTab.history,
            activeMenuPage: activeTab.activeMenuPage,
            thumbnailScrollPositions: activeTab.thumbnailScrollPositions,
            explorerState: activeTab.explorerState,
            fromPage: activeTab.fromPage || null,
        });
    }
});
