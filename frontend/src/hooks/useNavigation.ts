import { useCallback } from 'react';
import { useTabStore } from '../stores/tabStore';
import { useGlobalNavigationStore } from '../stores/globalNavigationStore';
import { PageType } from '../types';
import { MAIN_PAGES, MAIN_PAGES_TO_SAVE } from '../constants';

const EMPTY_PARAMS: Record<string, string> = {};
const EMPTY_HISTORY: Array<{ page: PageType; params: Record<string, string> }> = [];
const EMPTY_SCROLL_POSITIONS: Record<string, number> = {};

/**
 * Hook to access navigation state and operations for the active tab
 * Uses stable primitive selectors to prevent unnecessary re-renders.
 * Operations use getState() at call time instead of reactive subscription.
 */
export function useNavigation() {
    const updateActiveTab = useTabStore(state => state.updateActiveTab);

    // Selector helper: activeTabId is a primitive string — stable across unrelated updates
    const currentPage = useTabStore(state => {
        const tab = state.tabs.find(t => t.id === state.activeTabId);
        return tab?.page || 'home';
    });
    const previousPage = useTabStore(state => {
        const tab = state.tabs.find(t => t.id === state.activeTabId);
        return (tab?.history && tab.history.length > 1)
            ? tab.history[tab.history.length - 2].page
            : null;
    });
    const fromPage = useTabStore(state => {
        const tab = state.tabs.find(t => t.id === state.activeTabId);
        return tab?.fromPage || null;
    });
    const params = useTabStore(state => {
        const tab = state.tabs.find(t => t.id === state.activeTabId);
        return tab?.params ?? EMPTY_PARAMS;
    });
    const history = useTabStore(state => {
        const tab = state.tabs.find(t => t.id === state.activeTabId);
        return tab?.history ?? EMPTY_HISTORY;
    });
    const activeMenuPage = useTabStore(state => {
        const tab = state.tabs.find(t => t.id === state.activeTabId);
        return tab?.activeMenuPage || null;
    });
    const explorerState = useTabStore(state => {
        const tab = state.tabs.find(t => t.id === state.activeTabId);
        return tab?.explorerState || null;
    });
    const thumbnailScrollPositions = useTabStore(state => {
        const tab = state.tabs.find(t => t.id === state.activeTabId);
        return tab?.thumbnailScrollPositions ?? EMPTY_SCROLL_POSITIONS;
    });

    // Stable helper to read current tab at call-time via getState()
    const readActiveTab = useCallback(() => {
        const state = useTabStore.getState();
        return state.tabs.find(t => t.id === state.activeTabId);
    }, []);

    // Navigation operations
    const navigate = useCallback((page: PageType, navParams: Record<string, string> = {}, activeMenuPageOverride?: PageType) => {
        const activeTab = readActiveTab();
        if (!activeTab) return;

        let activeMenuPage: PageType | null;

        if (activeMenuPageOverride !== undefined) {
            activeMenuPage = activeMenuPageOverride;
        } else if (MAIN_PAGES.includes(page)) {
            activeMenuPage = page;
        } else {
            activeMenuPage = activeTab.activeMenuPage || null;
        }

        const newHistory = [...activeTab.history, { page, params: navParams }];

        let newTitle = page.charAt(0).toUpperCase() + page.slice(1);
        if (page === 'viewer' && navParams.folder) {
            const folderPath = navParams.folder;
            const folderName = folderPath.split(/[\\/]/).pop() || 'Viewer';
            newTitle = folderName;
        }

        const fromPage = navParams.from ? navParams.from as PageType : activeTab.page;
        console.log('[useNavigation] navigate called - page:', page, 'params:', navParams, 'fromPage:', fromPage);

        updateActiveTab({
            page,
            fromPage,
            params: navParams,
            history: newHistory,
            activeMenuPage,
            title: newTitle
        });

        if (MAIN_PAGES_TO_SAVE.includes(page)) {
            import('../stores/settingsStore').then(({ useSettingsStore }) => {
                useSettingsStore.getState().setLastPage(page);
            });
        }
    }, [readActiveTab, updateActiveTab]);

    const goBack = useCallback(() => {
        const activeTab = readActiveTab();
        if (!activeTab) return;

        const { history: tabHistory } = activeTab;

        if (tabHistory.length > 1) {
            const newHistory = tabHistory.slice(0, -1);
            const previous = newHistory[newHistory.length - 1];

            let activeMenuPage: PageType | null = previous.page;
            if (!MAIN_PAGES.includes(previous.page)) {
                const lastMainPage = newHistory.slice().reverse().find(h => MAIN_PAGES.includes(h.page));
                activeMenuPage = lastMainPage ? lastMainPage.page : activeTab.activeMenuPage || 'home';
            }

            let newTitle = previous.page.charAt(0).toUpperCase() + previous.page.slice(1);
            if (previous.page === 'viewer' && previous.params.folder) {
                const folderPath = previous.params.folder;
                const folderName = folderPath.split(/[\\/]/).pop() || 'Viewer';
                newTitle = folderName;
            }

            updateActiveTab({
                page: previous.page,
                params: previous.params,
                history: newHistory,
                activeMenuPage,
                title: newTitle
            });
        } else {
            updateActiveTab({
                page: 'home',
                params: {},
                history: [{ page: 'home', params: {} }],
                activeMenuPage: 'home',
                title: 'Home'
            });
        }
    }, [readActiveTab, updateActiveTab]);

    const setParams = useCallback((newParams: Record<string, string>) => {
        const activeTab = readActiveTab();
        if (!activeTab) return;

        const { history: tabHistory, page } = activeTab;
        const newHistory = [...tabHistory];
        if (newHistory.length > 0) {
            newHistory[newHistory.length - 1] = { page, params: newParams };
        }

        updateActiveTab({ params: newParams, history: newHistory });
    }, [readActiveTab, updateActiveTab]);

    const clearHistory = useCallback(() => {
        updateActiveTab({
            history: [{ page: 'home', params: {} }],
            page: 'home',
            params: {},
            activeMenuPage: 'home',
            title: 'Home'
        });
    }, [updateActiveTab]);

    const setThumbnailScrollPosition = useCallback((folderPath: string, position: number) => {
        const activeTab = readActiveTab();
        if (!activeTab) return;

        updateActiveTab({
            thumbnailScrollPositions: {
                ...activeTab.thumbnailScrollPositions,
                [folderPath]: position,
            }
        });
    }, [readActiveTab, updateActiveTab]);

    const setExplorerState = useCallback((state: { currentPath: string | null; pathHistory: string[]; forwardHistory: string[] } | null) => {
        updateActiveTab({ explorerState: state });
    }, [updateActiveTab]);

    // Global state from globalNavigationStore
    const isPanicMode = useGlobalNavigationStore(state => state.isPanicMode);
    const isProcessing = useGlobalNavigationStore(state => state.isProcessing);
    const folders = useGlobalNavigationStore(state => state.folders);
    const triggerPanic = useGlobalNavigationStore(state => state.triggerPanic);
    const exitPanic = useGlobalNavigationStore(state => state.exitPanic);
    const setIsProcessing = useGlobalNavigationStore(state => state.setIsProcessing);
    const setFolders = useGlobalNavigationStore(state => state.setFolders);

    return {
        currentPage,
        previousPage,
        fromPage,
        params,
        history,
        activeMenuPage,
        explorerState,
        thumbnailScrollPositions,
        isPanicMode,
        isProcessing,
        folders,
        navigate,
        goBack,
        setParams,
        clearHistory,
        setThumbnailScrollPosition,
        setExplorerState,
        triggerPanic,
        exitPanic,
        setIsProcessing,
        setFolders,
    };
}
