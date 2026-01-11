/**
 * LocalStorage utilities for persisting app state
 */

const STORAGE_KEYS = {
    TABS: 'manga-visor2-tabs',
    VIEWER_STATES: 'manga-visor2-viewer-states',
} as const;

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

export interface ViewerState {
    currentIndex: number;
    verticalWidth: number;
}

/**
 * Save tabs to localStorage
 */
export function saveTabsToLocalStorage(data: SavedTabsData): void {
    try {
        localStorage.setItem(STORAGE_KEYS.TABS, JSON.stringify(data));
        console.log('[Storage] Saved tabs to localStorage:', data.tabs.length);
    } catch (error) {
        console.error('[Storage] Failed to save tabs to localStorage:', error);
        // Handle quota exceeded errors
        if (error instanceof Error && error.name === 'QuotaExceededError') {
            console.warn('[Storage] localStorage quota exceeded, clearing old viewer states');
            // Try clearing old viewer states to free space
            clearOldViewerStates();
            try {
                localStorage.setItem(STORAGE_KEYS.TABS, JSON.stringify(data));
            } catch (retryError) {
                console.error('[Storage] Failed to save tabs after clearing old states:', retryError);
            }
        }
    }
}

/**
 * Load tabs from localStorage
 */
export function loadTabsFromLocalStorage(): SavedTabsData | null {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.TABS);
        if (!data) return null;
        const parsed = JSON.parse(data) as SavedTabsData;
        console.log('[Storage] Loaded tabs from localStorage:', parsed.tabs.length);
        return parsed;
    } catch (error) {
        console.error('[Storage] Failed to load tabs from localStorage:', error);
        return null;
    }
}

/**
 * Save viewer state for a specific folder path
 */
export function saveViewerStateToLocalStorage(folderPath: string, currentIndex: number, verticalWidth: number): void {
    try {
        const states = loadAllViewerStates();
        states[folderPath] = {
            currentIndex,
            verticalWidth,
        };
        localStorage.setItem(STORAGE_KEYS.VIEWER_STATES, JSON.stringify(states));
        console.log(`[Storage] Saved viewer state to localStorage: index=${currentIndex}, width=${verticalWidth} for ${folderPath}`);
    } catch (error) {
        console.error('[Storage] Failed to save viewer state to localStorage:', error);
        // Handle quota exceeded errors
        if (error instanceof Error && error.name === 'QuotaExceededError') {
            console.warn('[Storage] localStorage quota exceeded, clearing old viewer states');
            clearOldViewerStates();
            try {
                const states = loadAllViewerStates();
                states[folderPath] = { currentIndex, verticalWidth };
                localStorage.setItem(STORAGE_KEYS.VIEWER_STATES, JSON.stringify(states));
            } catch (retryError) {
                console.error('[Storage] Failed to save viewer state after clearing old states:', retryError);
            }
        }
    }
}

/**
 * Load viewer state for a specific folder path
 */
export function loadViewerStateFromLocalStorage(folderPath: string): ViewerState | null {
    try {
        const states = loadAllViewerStates();
        const state = states[folderPath];
        if (state) {
            console.log(`[Storage] Loaded viewer state from localStorage: index=${state.currentIndex}, width=${state.verticalWidth} for ${folderPath}`);
            return state;
        }
        return null;
    } catch (error) {
        console.error('[Storage] Failed to load viewer state from localStorage:', error);
        return null;
    }
}

/**
 * Load all viewer states from localStorage (internal helper)
 */
function loadAllViewerStates(): Record<string, ViewerState> {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.VIEWER_STATES);
        if (!data) return {};
        return JSON.parse(data) as Record<string, ViewerState>;
    } catch (error) {
        console.error('[Storage] Failed to load all viewer states from localStorage:', error);
        return {};
    }
}

/**
 * Clear old viewer states to free up space (keeps only last 100 entries)
 */
function clearOldViewerStates(): void {
    try {
        const states = loadAllViewerStates();
        const entries = Object.entries(states);
        if (entries.length <= 100) return; // Don't clear if under limit
        
        // Sort by most recent (assuming folder paths contain timestamps or use insertion order)
        // For now, keep the last 100 entries
        const sorted = entries.slice(-100);
        const cleaned: Record<string, ViewerState> = {};
        for (const [path, state] of sorted) {
            cleaned[path] = state;
        }
        localStorage.setItem(STORAGE_KEYS.VIEWER_STATES, JSON.stringify(cleaned));
        console.log(`[Storage] Cleared ${entries.length - 100} old viewer states`);
    } catch (error) {
        console.error('[Storage] Failed to clear old viewer states:', error);
    }
}

/**
 * Clear all stored data (useful for debugging or reset)
 */
export function clearAllStorage(): void {
    try {
        localStorage.removeItem(STORAGE_KEYS.TABS);
        localStorage.removeItem(STORAGE_KEYS.VIEWER_STATES);
        console.log('[Storage] Cleared all stored data');
    } catch (error) {
        console.error('[Storage] Failed to clear storage:', error);
    }
}