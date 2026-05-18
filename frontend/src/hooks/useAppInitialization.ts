import { useEffect } from 'react';
import { EventsOn } from '../../wailsjs/runtime';
import { useSettingsStore } from '../stores/settingsStore';
import { useTabStore } from '../stores/tabStore';
import { useNavigation } from './useNavigation';
import { TabsAPI } from '../services/api/tabsAPI';
import { MAIN_PAGES_TO_SAVE } from '../constants';

export function useAppInitialization() {
    const { loadSettings } = useSettingsStore();

    useEffect(() => {
        let unsubscribeAppReady: (() => void) | undefined;

        const initApp = async () => {
            try {
                await loadSettings();

                const { restoreTabs } = useSettingsStore.getState();
                if (restoreTabs) {
                    try {
                        const tabsData = await TabsAPI.getTabs();
                        if (tabsData && tabsData.tabs && tabsData.tabs.length > 0) {
                            useTabStore.getState().restoreTabsFromBackend({
                                activeTabId: tabsData.activeTabId || tabsData.tabs[0]?.id || '',
                                tabs: tabsData.tabs.map(tab => ({
                                    ...tab,
                                    fromPage: tab.fromPage as any
                                }))
                            });
                        }
                    } catch (error) {
                        console.error('[useAppInitialization] Failed to restore tabs:', error);
                    } finally {
                        useTabStore.getState().setReady(true);
                    }
                } else {
                    useTabStore.getState().setReady(true);
                }

                const lastPage = useSettingsStore.getState().lastPage;
                if (!restoreTabs && lastPage && lastPage !== 'home') {
                    if (MAIN_PAGES_TO_SAVE.includes(lastPage as any)) {
                        console.log('[useAppInitialization] Last page restoration should be handled by component');
                    }
                }
            } catch (error) {
                console.error('[useAppInitialization] Failed to initialize app:', error);

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
