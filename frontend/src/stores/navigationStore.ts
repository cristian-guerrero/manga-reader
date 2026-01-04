/**
 * Navigation Store - Manages app navigation state with proper history stack
 */

import { create } from 'zustand';
import { PageType, NavigationState } from '../types';

interface HistoryEntry {
    page: PageType;
    params: Record<string, string>;
}

interface NavigationStoreState extends NavigationState {
    // History stack
    history: HistoryEntry[];

    // Actions
    navigate: (page: PageType, params?: Record<string, string>) => void;
    goBack: () => void;
    setParams: (params: Record<string, string>) => void;
    clearHistory: () => void;

    // Panic mode
    isPanicMode: boolean;
    triggerPanic: () => void;
    exitPanic: () => void;
}

export const useNavigationStore = create<NavigationStoreState>((set, get) => ({
    // Initial state
    currentPage: 'home',
    previousPage: null,
    params: {},
    history: [{ page: 'home', params: {} }],
    isPanicMode: false,

    // Actions
    navigate: (page, params = {}) => {
        const { currentPage, params: currentParams, history } = get();

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
        });
    },

    goBack: () => {
        const { history } = get();

        if (history.length > 1) {
            // Remove current page from history
            const newHistory = history.slice(0, -1);
            const previous = newHistory[newHistory.length - 1];

            set({
                currentPage: previous.page,
                previousPage: history.length > 2 ? newHistory[newHistory.length - 2].page : null,
                params: previous.params,
                history: newHistory,
            });
        } else {
            // No history, go to home
            set({
                currentPage: 'home',
                previousPage: null,
                params: {},
                history: [{ page: 'home', params: {} }],
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
        });
    },

    // Panic mode - instantly clears the screen
    triggerPanic: () => {
        set({
            isPanicMode: true,
            currentPage: 'home',
            previousPage: null,
            params: {},
            history: [{ page: 'home', params: {} }],
        });
    },

    exitPanic: () => {
        set({ isPanicMode: false });
    },
}));
