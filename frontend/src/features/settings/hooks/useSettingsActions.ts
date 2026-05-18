import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@shared/components';
import { useSettingsStore, useTabStore } from '@stores';
import { AppAPI } from '@services/api/appAPI';
import { TabsAPI } from '@services/api/tabsAPI';
import { changeLanguage } from '@i18n';

export function useSettingsActions() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { resetSettings } = useSettingsStore();

    const handleLanguageChange = useCallback((newLang: string, setLanguage: (lang: string) => void) => {
        setLanguage(newLang);
        changeLanguage(newLang as any);
    }, []);

    const handleResetSettings = useCallback(() => {
        resetSettings();
        showToast(t('settings.resetSuccess') || 'Settings restored to defaults', 'success');
    }, [resetSettings, showToast, t]);

    const handleClearCache = useCallback(async () => {
        try {
            await AppAPI.clearAllData();

            const homeTabId = Math.random().toString(36).substring(2, 9);
            useTabStore.setState({
                tabs: [{
                    id: homeTabId,
                    title: 'Home',
                    page: 'home' as const,
                    fromPage: null,
                    params: {},
                    history: [{ page: 'home' as const, params: {} }],
                    activeMenuPage: 'home' as const,
                    explorerState: null,
                    thumbnailScrollPositions: {},
                    viewerState: null,
                }],
                activeTabId: homeTabId,
            });

            try {
                const tabsData = useTabStore.getState().saveTabsForBackend();
                await TabsAPI.saveTabs(tabsData);
            } catch {
            }

            showToast(t('settings.clearCacheSuccess') || 'Cache cleared successfully', 'success');
        } catch (error) {
            console.error("Failed to clear cache:", error);
            showToast(t('settings.clearCacheError') || 'Failed to clear cache', 'error');
        }
    }, [showToast, t]);

    return {
        handleLanguageChange,
        handleResetSettings,
        handleClearCache,
    };
}
