import { useEffect, useRef } from 'react';
import { useTabStore } from '../stores/tabStore';
import { useSettingsStore } from '../stores/settingsStore';
import { TabsAPI } from '../services/api/tabsAPI';

export function useTabPersistence() {
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const unsubscribeTabStore = useTabStore.subscribe((state) => {
            const { restoreTabs } = useSettingsStore.getState();
            if (!restoreTabs || !state.isReady) return;

            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            debounceRef.current = setTimeout(() => {
                const tabsData = state.saveTabsForBackend();
                TabsAPI.saveTabs(tabsData).catch(err => {
                    console.error('[useTabPersistence] Failed to save tabs:', err);
                });
            }, 500);
        });

        const handleBeforeUnload = () => {
            const { restoreTabs } = useSettingsStore.getState();
            if (restoreTabs) {
                if (debounceRef.current) {
                    clearTimeout(debounceRef.current);
                }
                const tabsData = useTabStore.getState().saveTabsForBackend();
                TabsAPI.saveTabs(tabsData).catch(err => {
                    console.error('[useTabPersistence] Failed to save tabs on unload:', err);
                });
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
            unsubscribeTabStore();
        };
    }, []);
}
