/**
 * Tab Persistence Service
 * Centralized service for managing tab persistence to localStorage
 */

import { STORAGE_KEYS, DEBOUNCE_DELAYS } from '../../constants';
import { Tab } from '../../stores/tabStore';

export interface SavedTab {
    id: string;
    title: string;
    page: string;
    fromPage?: string | null;
    params: Record<string, string>;
    explorerState?: any;
    thumbnailScrollPositions?: Record<string, number>;
}

export interface SavedTabsData {
    activeTabId: string;
    tabs: SavedTab[];
}

/**
 * Service for managing tab persistence
 */
export class TabPersistenceService {
    private static lastSavedTabsJson = '';
    private static saveTabsDebounce: ReturnType<typeof setTimeout> | null = null;

    /**
     * Save tabs to localStorage
     */
    static save(data: SavedTabsData): void {
        try {
            localStorage.setItem(STORAGE_KEYS.TABS, JSON.stringify(data));
            console.log('[TabPersistenceService] Saved tabs to localStorage:', data.tabs.length);
        } catch (error) {
            console.error('[TabPersistenceService] Failed to save tabs to localStorage:', error);
            // Handle quota exceeded errors
            if (error instanceof Error && error.name === 'QuotaExceededError') {
                console.warn('[TabPersistenceService] localStorage quota exceeded');
                throw error; // Let caller handle retry logic if needed
            }
        }
    }

    /**
     * Save tabs with debouncing (for reactive updates)
     */
    static saveDebounced(data: SavedTabsData, callback?: () => void): void {
        if (this.saveTabsDebounce) {
            clearTimeout(this.saveTabsDebounce);
        }

        this.saveTabsDebounce = setTimeout(() => {
            const tabsJson = JSON.stringify(data);
            if (tabsJson !== this.lastSavedTabsJson) {
                this.lastSavedTabsJson = tabsJson;
                try {
                    this.save(data);
                    callback?.();
                } catch (error) {
                    console.error('[TabPersistenceService] Failed to save tabs (debounced):', error);
                }
            }
        }, DEBOUNCE_DELAYS.TAB_SAVE);
    }

    /**
     * Clear debounce timer
     */
    static clearDebounce(): void {
        if (this.saveTabsDebounce) {
            clearTimeout(this.saveTabsDebounce);
            this.saveTabsDebounce = null;
        }
    }

    /**
     * Load tabs from localStorage
     */
    static load(): SavedTabsData | null {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.TABS);
            if (!data) return null;
            const parsed = JSON.parse(data) as SavedTabsData;
            console.log('[TabPersistenceService] Loaded tabs from localStorage:', parsed.tabs.length);
            return parsed;
        } catch (error) {
            console.error('[TabPersistenceService] Failed to load tabs from localStorage:', error);
            return null;
        }
    }

    /**
     * Clear saved tabs
     */
    static clear(): void {
        try {
            localStorage.removeItem(STORAGE_KEYS.TABS);
            console.log('[TabPersistenceService] Cleared saved tabs');
        } catch (error) {
            console.error('[TabPersistenceService] Failed to clear tabs:', error);
        }
    }

    /**
     * Convert Tab[] to SavedTabsData format
     */
    static serializeTabs(tabs: Tab[], activeTabId: string): SavedTabsData {
        return {
            activeTabId,
            tabs: tabs.map(tab => ({
                id: tab.id,
                title: tab.title,
                page: tab.page,
                fromPage: tab.fromPage,
                params: tab.params,
                explorerState: tab.explorerState,
                thumbnailScrollPositions: tab.thumbnailScrollPositions,
            }))
        };
    }
}
