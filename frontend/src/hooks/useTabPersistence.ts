/**
 * useTabPersistence - Hook for managing tab persistence to localStorage
 */

import { useEffect } from 'react';
import { useTabStore } from '../stores/tabStore';
import { useSettingsStore } from '../stores/settingsStore';
import { TabPersistenceService } from '../services/persistence';

/**
 * Hook to handle tab persistence (save/restore tabs from localStorage)
 */
export function useTabPersistence() {
    useEffect(() => {
        const unsubscribeTabStore = useTabStore.subscribe((state) => {
            const { restoreTabs } = useSettingsStore.getState();
            if (!restoreTabs || !state.isReady) return; // Only save if ready

            // Use service's debounced save
            const tabsData = state.saveTabsForBackend();
            TabPersistenceService.saveDebounced(tabsData);
        });

        // Also save on beforeunload
        const handleBeforeUnload = () => {
            const { restoreTabs } = useSettingsStore.getState();
            if (restoreTabs) {
                TabPersistenceService.clearDebounce(); // Clear debounce and save immediately
                const tabsData = useTabStore.getState().saveTabsForBackend();
                try {
                    TabPersistenceService.save(tabsData);
                } catch (error) {
                    console.error('[useTabPersistence] Failed to save tabs on unload:', error);
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            TabPersistenceService.clearDebounce();
            unsubscribeTabStore();
        };
    }, []);
}
