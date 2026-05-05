/**
 * useNavigation - Hook for navigation operations
 * Replaces navigationStore proxy, uses tabStore directly
 */

import { useCallback } from 'react';
import { useTabStore } from '../stores/tabStore';
import { useGlobalNavigationStore } from '../stores/globalNavigationStore';
import { PageType } from '../types';
import { MAIN_PAGES, MAIN_PAGES_TO_SAVE } from '../constants';

/**
 * Hook to access navigation state and operations for the active tab
 */
export function useNavigation() {
    const activeTabId = useTabStore(state => state.activeTabId);
    const activeTab = useTabStore(state => state.tabs.find(t => t.id === activeTabId));
    const updateActiveTab = useTabStore(state => state.updateActiveTab);

    // Get state from active tab
    const currentPage = activeTab?.page || 'home';
    const previousPage = (activeTab?.history && activeTab.history.length > 1)
        ? activeTab.history[activeTab.history.length - 2].page 
        : null;
    const fromPage = activeTab?.fromPage || null;
    const params = activeTab?.params || {};
    const history = activeTab?.history || [];
    const activeMenuPage = activeTab?.activeMenuPage || null;
    const explorerState = activeTab?.explorerState || null;
    const thumbnailScrollPositions = activeTab?.thumbnailScrollPositions || {};

    // Navigation operations
    const navigate = useCallback((page: PageType, params: Record<string, string> = {}, activeMenuPageOverride?: PageType) => {
        if (!activeTab) return;

        let activeMenuPage: PageType | null;

        if (activeMenuPageOverride !== undefined) {
            activeMenuPage = activeMenuPageOverride;
        } else if (MAIN_PAGES.includes(page)) {
            activeMenuPage = page;
        } else {
            activeMenuPage = activeTab.activeMenuPage || null;
        }

        const newHistory = [...activeTab.history, { page, params }];

        // Determine the title - use folder name for viewer pages
        let newTitle = page.charAt(0).toUpperCase() + page.slice(1);
        if (page === 'viewer' && params.folder) {
            const folderPath = params.folder;
            const folderName = folderPath.split(/[\\/]/).pop() || 'Viewer';
            newTitle = folderName;
        }

        // Preserve fromPage from params if provided, otherwise set from current page
        const fromPage = params.from ? params.from as PageType : activeTab.page;
        console.log('[useNavigation] navigate called - page:', page, 'params:', params, 'fromPage:', fromPage);

        updateActiveTab({
            page,
            fromPage,
            params,
            history: newHistory,
            activeMenuPage,
            title: newTitle
        });

        // Save main pages to settings for startup restore
        if (MAIN_PAGES_TO_SAVE.includes(page)) {
            import('../stores/settingsStore').then(({ useSettingsStore }) => {
                useSettingsStore.getState().setLastPage(page);
            });
        }
    }, [activeTab, updateActiveTab]);

    const goBack = useCallback(() => {
        if (!activeTab) return;

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
    }, [activeTab, updateActiveTab]);

    const setParams = useCallback((newParams: Record<string, string>) => {
        if (!activeTab) return;

        const { history, page } = activeTab;
        const newHistory = [...history];
        if (newHistory.length > 0) {
            newHistory[newHistory.length - 1] = { page, params: newParams };
        }

        updateActiveTab({ params: newParams, history: newHistory });
    }, [activeTab, updateActiveTab]);

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
        if (!activeTab) return;

        updateActiveTab({
            thumbnailScrollPositions: {
                ...activeTab.thumbnailScrollPositions,
                [folderPath]: position,
            }
        });
    }, [activeTab, updateActiveTab]);

    const setExplorerState = useCallback((state: { currentPath: string | null; pathHistory: string[] } | null) => {
        updateActiveTab({ explorerState: state });
    }, [updateActiveTab]);

    // Global state from globalNavigationStore - must be called at hook level
    const globalNav = useGlobalNavigationStore();
    const isPanicMode = globalNav.isPanicMode;
    const isProcessing = globalNav.isProcessing;
    const folders = globalNav.folders;

    return {
        // State
        currentPage,
        previousPage,
        fromPage,
        params,
        history,
        activeMenuPage,
        explorerState,
        thumbnailScrollPositions,
        // Global state
        isPanicMode,
        isProcessing,
        folders,
        // Operations
        navigate,
        goBack,
        setParams,
        clearHistory,
        setThumbnailScrollPosition,
        setExplorerState,
        triggerPanic: globalNav.triggerPanic,
        exitPanic: globalNav.exitPanic,
        setIsProcessing: globalNav.setIsProcessing,
        setFolders: globalNav.setFolders,
    };
}
