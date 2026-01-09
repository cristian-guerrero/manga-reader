/**
 * Navigation Store - Manages app navigation state with proper history stack
 */

import { create } from 'zustand';
import { PageType, NavigationState, FolderInfo } from '../types';

interface HistoryEntry {
    page: PageType;
    params: Record<string, string>;
}

interface NavigationStoreState extends NavigationState {
    // History stack
    history: HistoryEntry[];

    // Library State
    folders: FolderInfo[];
    setFolders: (folders: FolderInfo[] | ((prev: FolderInfo[]) => FolderInfo[])) => void;

    // Active menu page - tracks which menu item should be highlighted
    // This can be different from currentPage (e.g., when viewing 'viewer' or 'series-details')
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
}

export const useNavigationStore = create<NavigationStoreState>((set, get) => ({
    // Initial state
    currentPage: 'home',
    previousPage: null,
    params: {},
    history: [{ page: 'home', params: {} }],
    activeMenuPage: 'home',
    isPanicMode: false,
    isProcessing: false,
    folders: [],

    // Actions
    navigate: (page, params = {}, activeMenuPageOverride = null) => {
        const { currentPage, history } = get();

        // Determine active menu page
        // If override is provided, use it
        // Otherwise, if page is a main menu page, use it
        // For viewer/series-details, keep current activeMenuPage if no override
        let activeMenuPage: PageType | null;
        const mainPages: PageType[] = ['home', 'explorer', 'history', 'oneShot', 'series', 'download', 'settings'];
        
        if (activeMenuPageOverride !== null) {
            activeMenuPage = activeMenuPageOverride;
        } else if (mainPages.includes(page)) {
            activeMenuPage = page;
        } else {
            // For viewer, series-details, thumbnails, etc., keep the current activeMenuPage
            activeMenuPage = get().activeMenuPage || null;
        }

        // Add current page to history before navigating
        const newHistory = [
            ...history,
            { page, params }
        ];

        set({
            currentPage: page,
            previousPage: currentPage,
            params,
            history: newHistory,
            activeMenuPage,
        });

        // Save main pages to settings for startup restore
        const mainPagesToSave = ['home', 'oneShot', 'series', 'history', 'download', 'settings'];
        if (mainPagesToSave.includes(page)) {
            // @ts-ignore - Dynamic import to avoid circular dependency
            import('./settingsStore').then(({ useSettingsStore }) => {
                useSettingsStore.getState().setLastPage(page);
            });
        }
    },

    goBack: () => {
        const { history } = get();

        if (history.length > 1) {
            // Remove current page from history
            const newHistory = history.slice(0, -1);
            const previous = newHistory[newHistory.length - 1];

            // Determine active menu page for the previous page
            const mainPages: PageType[] = ['home', 'explorer', 'history', 'oneShot', 'series', 'download', 'settings'];
            let activeMenuPage: PageType | null = previous.page;
            if (!mainPages.includes(previous.page)) {
                // If going back to a non-main page, try to find the last main page in history
                const lastMainPage = newHistory.slice().reverse().find(h => mainPages.includes(h.page));
                activeMenuPage = lastMainPage ? lastMainPage.page : get().activeMenuPage || 'home';
            }

            set({
                currentPage: previous.page,
                previousPage: history.length > 2 ? newHistory[newHistory.length - 2].page : null,
                params: previous.params,
                history: newHistory,
                activeMenuPage,
            });
        } else {
            // No history, go to home
            set({
                currentPage: 'home',
                previousPage: null,
                params: {},
                history: [{ page: 'home', params: {} }],
                activeMenuPage: 'home',
            });
        }
    },

    setParams: (params) => {
        const { history, currentPage } = get();

        // Update params in current history entry
        const newHistory = [...history];
        if (newHistory.length > 0) {
            newHistory[newHistory.length - 1] = {
                page: currentPage,
                params,
            };
        }

        set({ params, history: newHistory });
    },

    clearHistory: () => {
        set({
            history: [{ page: 'home', params: {} }],
            currentPage: 'home',
            previousPage: null,
            params: {},
            activeMenuPage: 'home',
        });
    },

    // Panic mode - instantly clears the screen
    triggerPanic: () => {
        set({
            isPanicMode: true,
            currentPage: 'settings',
            previousPage: null,
            params: {},
            history: [{ page: 'settings', params: {} }],
            activeMenuPage: 'settings',
        });
    },

    exitPanic: () => {
        set({ isPanicMode: false });
    },

    setIsProcessing: (isProcessing) => {
        set({ isProcessing });
    },

    // Thumbnail scroll state
    thumbnailScrollPositions: {},
    setThumbnailScrollPosition: (folderPath, position) => {
        set((state) => ({
            thumbnailScrollPositions: {
                ...state.thumbnailScrollPositions,
                [folderPath]: position,
            },
        }));
    },

    setFolders: (folders) => {
        if (typeof folders === 'function') {
            set((state) => ({ folders: folders(state.folders) }));
        } else {
            set({ folders });
        }
    },
}));
