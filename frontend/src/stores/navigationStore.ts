/**
 * Navigation Store - Compatibility wrapper
 * DEPRECATED: Use useNavigation hook instead for new code
 * This store is maintained for backward compatibility
 */

import { create } from 'zustand';
import { PageType, NavigationState, FolderInfo } from '../types';
import { useTabStore } from './tabStore';
import { useGlobalNavigationStore } from './globalNavigationStore';
import { MAIN_PAGES, MAIN_PAGES_TO_SAVE } from '../constants';

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

    // Panic mode (from globalNavigationStore)
    isPanicMode: boolean;
    triggerPanic: () => void;
    exitPanic: () => void;

    // Processing mode (from globalNavigationStore)
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

    // Global state from globalNavigationStore
    isPanicMode: useGlobalNavigationStore.getState().isPanicMode,
    isProcessing: useGlobalNavigationStore.getState().isProcessing,
    folders: useGlobalNavigationStore.getState().folders,

    // Actions
    navigate: (page, params = {}, activeMenuPageOverride = undefined) => {
        const activeTab = useTabStore.getState().getActiveTab();
        const { history } = activeTab;

        let activeMenuPage: PageType | null;

        if (activeMenuPageOverride !== undefined) {
            activeMenuPage = activeMenuPageOverride;
        } else if (MAIN_PAGES.includes(page)) {
            activeMenuPage = page;
        } else {
            activeMenuPage = activeTab.activeMenuPage || null;
        }

        const newHistory = [...history, { page, params }];

        // Determine the title - use folder name for viewer pages
        let newTitle = page.charAt(0).toUpperCase() + page.slice(1);
        if (page === 'viewer' && params.folder) {
            const folderPath = params.folder;
            const folderName = folderPath.split(/[\\/]/).pop() || 'Viewer';
            newTitle = folderName;
        }

        useTabStore.getState().updateActiveTab({
            page,
            fromPage: activeTab.page,
            params,
            history: newHistory,
            activeMenuPage,
            title: newTitle
        });

        // Save main pages to settings for startup restore
        if (MAIN_PAGES_TO_SAVE.includes(page)) {
            import('./settingsStore').then(({ useSettingsStore }) => {
                useSettingsStore.getState().setLastPage(page);
            });
        }

        // Force a re-render by setting a dummy value
        set({});
    },

    goBack: () => {
        const activeTab = useTabStore.getState().getActiveTab();
        const { history } = activeTab;

        if (history.length > 1) {
            const newHistory = history.slice(0, -1);
            const previous = newHistory[newHistory.length - 1];

            let activeMenuPage: PageType | null = previous.page;
            if (!MAIN_PAGES.includes(previous.page)) {
                const lastMainPage = newHistory.slice().reverse().find(h => MAIN_PAGES.includes(h.page));
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
        useGlobalNavigationStore.getState().triggerPanic();
        set({ isPanicMode: useGlobalNavigationStore.getState().isPanicMode });
    },

    exitPanic: () => {
        useGlobalNavigationStore.getState().exitPanic();
        set({ isPanicMode: useGlobalNavigationStore.getState().isPanicMode });
    },

    setIsProcessing: (isProcessing) => {
        useGlobalNavigationStore.getState().setIsProcessing(isProcessing);
        set({ isProcessing: useGlobalNavigationStore.getState().isProcessing });
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
        useGlobalNavigationStore.getState().setFolders(folders);
        set({ folders: useGlobalNavigationStore.getState().folders });
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

// Subscribe to globalNavigationStore changes
useGlobalNavigationStore.subscribe((state) => {
    useNavigationStore.setState({
        isPanicMode: state.isPanicMode,
        isProcessing: state.isProcessing,
        folders: state.folders,
    });
});
