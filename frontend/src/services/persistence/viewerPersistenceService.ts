/**
 * Viewer Persistence Service
 * Centralized service for managing viewer state persistence to localStorage
 */

import { STORAGE_KEYS, VIEWER_STATE_LIMITS } from '../../constants';

export interface SavedViewerState {
    currentIndex: number;
    verticalWidth: number;
}

/**
 * Service for managing viewer state persistence
 */
export class ViewerPersistenceService {
    /**
     * Save viewer state for a specific folder path
     */
    static save(folderPath: string, state: SavedViewerState): void {
        try {
            const states = this.loadAll();
            states[folderPath] = state;
            localStorage.setItem(STORAGE_KEYS.VIEWER_STATES, JSON.stringify(states));
            console.log(`[ViewerPersistenceService] Saved viewer state: index=${state.currentIndex}, width=${state.verticalWidth} for ${folderPath}`);
        } catch (error) {
            console.error('[ViewerPersistenceService] Failed to save viewer state:', error);
            // Handle quota exceeded errors
            if (error instanceof Error && error.name === 'QuotaExceededError') {
                console.warn('[ViewerPersistenceService] localStorage quota exceeded, clearing old states');
                this.clearOldStates();
                try {
                    const states = this.loadAll();
                    states[folderPath] = state;
                    localStorage.setItem(STORAGE_KEYS.VIEWER_STATES, JSON.stringify(states));
                } catch (retryError) {
                    console.error('[ViewerPersistenceService] Failed to save viewer state after clearing:', retryError);
                }
            }
        }
    }

    /**
     * Load viewer state for a specific folder path
     */
    static load(folderPath: string): SavedViewerState | null {
        try {
            const states = this.loadAll();
            const state = states[folderPath];
            if (state) {
                console.log(`[ViewerPersistenceService] Loaded viewer state: index=${state.currentIndex}, width=${state.verticalWidth} for ${folderPath}`);
                return state;
            }
            return null;
        } catch (error) {
            console.error('[ViewerPersistenceService] Failed to load viewer state:', error);
            return null;
        }
    }

    /**
     * Load all viewer states (internal)
     */
    private static loadAll(): Record<string, SavedViewerState> {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.VIEWER_STATES);
            if (!data) return {};
            return JSON.parse(data) as Record<string, SavedViewerState>;
        } catch (error) {
            console.error('[ViewerPersistenceService] Failed to load all viewer states:', error);
            return {};
        }
    }

    /**
     * Clear old viewer states to free up space (keeps only last N entries)
     */
    private static clearOldStates(): void {
        try {
            const states = this.loadAll();
            const entries = Object.entries(states);
            const maxStates = VIEWER_STATE_LIMITS.MAX_STORED_STATES;
            if (entries.length <= maxStates) return; // Don't clear if under limit
            
            // Keep the last N entries
            const sorted = entries.slice(-maxStates);
            const cleaned: Record<string, SavedViewerState> = {};
            for (const [path, state] of sorted) {
                cleaned[path] = state;
            }
            localStorage.setItem(STORAGE_KEYS.VIEWER_STATES, JSON.stringify(cleaned));
            console.log(`[ViewerPersistenceService] Cleared ${entries.length - maxStates} old viewer states`);
        } catch (error) {
            console.error('[ViewerPersistenceService] Failed to clear old viewer states:', error);
        }
    }

    /**
     * Clear all viewer states
     */
    static clear(): void {
        try {
            localStorage.removeItem(STORAGE_KEYS.VIEWER_STATES);
            console.log('[ViewerPersistenceService] Cleared all viewer states');
        } catch (error) {
            console.error('[ViewerPersistenceService] Failed to clear viewer states:', error);
        }
    }

    /**
     * Clear viewer state for a specific folder path
     */
    static clearForFolder(folderPath: string): void {
        try {
            const states = this.loadAll();
            delete states[folderPath];
            localStorage.setItem(STORAGE_KEYS.VIEWER_STATES, JSON.stringify(states));
            console.log(`[ViewerPersistenceService] Cleared viewer state for ${folderPath}`);
        } catch (error) {
            console.error('[ViewerPersistenceService] Failed to clear viewer state for folder:', error);
        }
    }
}
