/**
 * useTabPersistence - Hook for managing tab persistence to localStorage
 */

import { useEffect } from 'react';
import { useTabStore } from '../stores/tabStore';
import { useSettingsStore } from '../stores/settingsStore';
import { saveTabsToLocalStorage, loadTabsFromLocalStorage } from '../utils/storage';
import { DEBOUNCE_DELAYS } from '../constants';

/**
 * Hook to handle tab persistence (save/restore tabs from localStorage)
 */
export function useTabPersistence() {
    useEffect(() => {
        // Save tabs REACTIVELY when store changes (not on a blind interval)
        let lastSavedTabsJson = '';
        let saveTabsDebounce: ReturnType<typeof setTimeout> | null = null;

        const unsubscribeTabStore = useTabStore.subscribe((state) => {
            const { restoreTabs } = useSettingsStore.getState();
            if (!restoreTabs || !state.isReady) return; // Only save if ready

            // Debounce saving to avoid excessive backend calls
            if (saveTabsDebounce) {
                clearTimeout(saveTabsDebounce);
            }
            saveTabsDebounce = setTimeout(() => {
                const tabsData = state.saveTabsForBackend();
                const tabsJson = JSON.stringify(tabsData);
                if (tabsJson !== lastSavedTabsJson) {
                    lastSavedTabsJson = tabsJson;
                    try {
                        saveTabsToLocalStorage(tabsData);
                    } catch (error) {
                        console.error('[useTabPersistence] Failed to save tabs:', error);
                    }
                }
            }, DEBOUNCE_DELAYS.TAB_SAVE);
        });

        // Also save on beforeunload
        const handleBeforeUnload = () => {
            const { restoreTabs } = useSettingsStore.getState();
            if (restoreTabs) {
                const tabsData = useTabStore.getState().saveTabsForBackend();
                try {
                    saveTabsToLocalStorage(tabsData);
                } catch (error) {
                    console.error('[useTabPersistence] Failed to save tabs on unload:', error);
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (saveTabsDebounce) {
                clearTimeout(saveTabsDebounce);
            }
            unsubscribeTabStore();
        };
    }, []);
}
