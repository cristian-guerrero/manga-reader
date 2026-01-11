/**
 * useAppInitialization - Hook for initializing the application
 * Handles settings loading, tab restoration, and last page restoration
 */

import { useEffect } from 'react';
import { EventsOn } from '../../wailsjs/runtime';
import { useSettingsStore } from '../stores/settingsStore';
import { useTabStore } from '../stores/tabStore';
import { useNavigationStore } from '../stores/navigationStore';
import { loadTabsFromLocalStorage } from '../utils/storage';
import { MAIN_PAGES_TO_SAVE } from '../constants';

/**
 * Hook to initialize the application on mount
 */
export function useAppInitialization() {
    const { loadSettings } = useSettingsStore();

    useEffect(() => {
        let unsubscribeAppReady: (() => void) | undefined;

        const initApp = async () => {
            try {
                await loadSettings();

                // Restore tabs if enabled (using localStorage)
                const { restoreTabs } = useSettingsStore.getState();
                if (restoreTabs) {
                    try {
                        const tabsData = loadTabsFromLocalStorage();
                        if (tabsData && tabsData.tabs && tabsData.tabs.length > 0) {
                            // Convert localStorage format to tabStore format
                            useTabStore.getState().restoreTabsFromBackend({
                                activeTabId: tabsData.activeTabId || tabsData.tabs[0]?.id || '',
                                tabs: tabsData.tabs.map(tab => ({
                                    ...tab,
                                    fromPage: tab.fromPage as any // Cast to PageType | null | undefined
                                }))
                            });
                        }
                    } catch (error) {
                        console.error('[useAppInitialization] Failed to restore tabs:', error);
                    } finally {
                        // Mark as ready after restoration attempt (success or failure)
                        useTabStore.getState().setReady(true);
                    }
                } else {
                    // Not restoring, mark as ready immediately
                    useTabStore.getState().setReady(true);
                }

                // Restore last page after settings load (only if tabs weren't restored)
                const lastPage = useSettingsStore.getState().lastPage;
                if (!restoreTabs && lastPage && lastPage !== 'home') {
                    // Only restore main pages, not viewer or other temporary pages
                    if (MAIN_PAGES_TO_SAVE.includes(lastPage as any)) {
                        useNavigationStore.getState().navigate(lastPage as any);
                    }
                }
            } catch (error) {
                console.error('[useAppInitialization] Failed to initialize app:', error);
                // App can continue with defaults even if settings load fails

                // Try again when app_ready event fires as backup
                unsubscribeAppReady = EventsOn('app_ready', async () => {
                    console.log('[useAppInitialization] Received app_ready event, retrying settings load');
                    try {
                        await loadSettings();
                    } catch (retryError) {
                        console.error('[useAppInitialization] Failed to load settings on app_ready:', retryError);
                    }
                });
            }
        };

        initApp();

        return () => {
            if (unsubscribeAppReady) {
                unsubscribeAppReady();
            }
        };
    }, [loadSettings]);
}
