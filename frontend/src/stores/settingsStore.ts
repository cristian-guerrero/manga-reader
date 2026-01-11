/**
 * Settings Store - Manages application settings
 */

import { create } from 'zustand';
import { Settings, DEFAULT_SETTINGS } from '../types';
import { applyTheme, getThemeById, darkTheme } from '../themes';
import { AppAPI } from '../services/api/appAPI';
import { errorService } from '../services/errorService';

export interface SettingsState extends Settings {
    // Actions
    setLanguage: (language: string) => void;
    setTheme: (themeId: string) => void;
    setAccentColor: (color: string) => void;
    setViewerMode: (mode: Settings['viewerMode']) => void;
    setVerticalWidth: (width: number) => void;
    setScrollSpeed: (speed: number) => void;
    setLateralMode: (mode: Settings['lateralMode']) => void;
    setReadingDirection: (direction: Settings['readingDirection']) => void;
    setPanicKey: (key: string) => void;
    setLastFolder: (path: string) => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    toggleSidebar: () => void;
    setShowImageInfo: (show: boolean) => void;
    setPreloadImages: (preload: boolean) => void;
    setPreloadCount: (count: number) => void;
    setEnableHistory: (enable: boolean) => void;
    setMinImageSize: (kb: number) => void;
    setProcessDroppedFolders: (process: boolean) => void;
    setTabMemorySaving: (enable: boolean) => void;
    setRestoreTabs: (enable: boolean) => void;

    setLastPage: (page: string) => void;
    setEnabledMenuItems: (items: Record<string, boolean>) => void;
    toggleMenuItem: (item: string) => void;
    updateBackend: (key: string, value: any) => Promise<void>;
    updateSettings: (updates: Partial<Settings>) => void;

    // Persistence
    loadSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;
    resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    // Initial state from defaults
    ...DEFAULT_SETTINGS,

    // Actions
    setLanguage: (language) => {
        set({ language });
        get().updateBackend('language', language);
    },

    setTheme: (themeId) => {
        const state = get();
        const theme = getThemeById(themeId) || darkTheme;

        // Get accent for this specific theme
        const themeAccent = state.themeAccents?.[themeId];

        applyTheme(theme, themeAccent);
        set({ theme: themeId });
        get().updateBackend('theme', themeId);
    },

    setAccentColor: (accentColor) => {
        const state = get();
        const currentThemeId = state.theme;
        const theme = getThemeById(currentThemeId) || darkTheme;

        // If empty string or 'default', assume they want the theme default (remove from map)
        const isDefault = (accentColor === '' || accentColor === 'default');

        const newAccents = { ...(state.themeAccents || {}) };
        if (isDefault) {
            delete newAccents[currentThemeId];
        } else {
            newAccents[currentThemeId] = accentColor;
        }

        const effectiveAccent = isDefault ? undefined : accentColor;

        applyTheme(theme, effectiveAccent);
        set({ themeAccents: newAccents });
        get().updateBackend('themeAccents', newAccents);
    },

    setViewerMode: (viewerMode) => {
        set({ viewerMode });
        get().updateBackend('viewerMode', viewerMode);
    },

    setVerticalWidth: (verticalWidth) => {
        const clampedWidth = Math.min(100, Math.max(10, verticalWidth));
        set({ verticalWidth: clampedWidth });
        get().updateBackend('verticalWidth', clampedWidth);
    },

    setScrollSpeed: (scrollSpeed) => {
        const clampedSpeed = Math.min(100, Math.max(0, scrollSpeed));
        set({ scrollSpeed: clampedSpeed });
        get().updateBackend('scrollSpeed', clampedSpeed);
    },

    setLateralMode: (lateralMode) => {
        set({ lateralMode });
        get().updateBackend('lateralMode', lateralMode);
    },

    setReadingDirection: (readingDirection) => {
        set({ readingDirection });
        get().updateBackend('readingDirection', readingDirection);
    },

    setPanicKey: (panicKey) => {
        set({ panicKey });
        get().updateBackend('panicKey', panicKey);
    },

    setLastFolder: (lastFolder) => {
        set({ lastFolder });
        get().updateBackend('lastFolder', lastFolder);
    },

    setSidebarCollapsed: (sidebarCollapsed) => {
        set({ sidebarCollapsed });
        get().saveSettings();
    },

    toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
        get().saveSettings();
    },

    setShowImageInfo: (showImageInfo) => {
        set({ showImageInfo });
        get().saveSettings();
    },

    setPreloadImages: (preloadImages) => {
        set({ preloadImages });
        get().saveSettings();
    },

    setPreloadCount: (preloadCount) => {
        set({ preloadCount });
        get().saveSettings();
    },

    setEnableHistory: (enableHistory) => {
        set({ enableHistory });
        get().saveSettings();
    },

    setMinImageSize: (minImageSize) => {
        set({ minImageSize });
        get().saveSettings();
    },

    setProcessDroppedFolders: (processDroppedFolders) => {
        set({ processDroppedFolders });
        get().updateBackend('processDroppedFolders', processDroppedFolders);
    },
    setTabMemorySaving: (tabMemorySaving) => {
        set({ tabMemorySaving });
        get().updateBackend('tabMemorySaving', tabMemorySaving);
    },
    setRestoreTabs: (restoreTabs) => {
        set({ restoreTabs });
        get().updateBackend('restoreTabs', restoreTabs);
    },

    setLastPage: (lastPage) => {
        set({ lastPage });
        get().saveSettings();
    },

    setEnabledMenuItems: (enabledMenuItems) => {
        set({ enabledMenuItems });
        get().saveSettings();
    },

    toggleMenuItem: (item) => {
        if (item === 'settings') return;

        const { enabledMenuItems, updateBackend } = get();
        const currentItems = enabledMenuItems || DEFAULT_SETTINGS.enabledMenuItems;

        const currentValue = currentItems[item] !== false;
        const newItems = { ...currentItems, [item]: !currentValue };

        console.log(`[SettingsStore] Toggling menu item: ${item} -> ${!currentValue}`);
        set({ enabledMenuItems: newItems });
        updateBackend('enabledMenuItems', newItems);
    },
    updateSettings: (updates) => {
        set(updates);
        Object.entries(updates).forEach(([key, value]) => {
            get().updateBackend(key, value);
        });
    },

    updateBackend: async (key: string, value: any) => {
        try {
            await AppAPI.updateSettings({ [key]: value });
            console.log(`[SettingsStore] Backend updated: ${key}`, value);
        } catch (error) {
            errorService.handle(error, {
                component: 'SettingsStore',
                action: 'updateBackend',
                details: { key, value }
            }, { showToast: false });
        }
    },
    loadSettings: async () => {
        try {
            const settings = await AppAPI.getSettings();

            if (settings) {
                set(settings);

                // Apply theme
                const theme = getThemeById(settings.theme) || darkTheme;
                const accent = settings.themeAccents?.[settings.theme];
                applyTheme(theme, accent);
            } else {
                // If settings is null/undefined, use defaults
                const theme = getThemeById(DEFAULT_SETTINGS.theme) || darkTheme;
                applyTheme(theme);
            }
        } catch (error) {
            errorService.handle(error, {
                component: 'SettingsStore',
                action: 'loadSettings'
            }, { showToast: false });
            // Apply default theme on error
            const theme = getThemeById(DEFAULT_SETTINGS.theme) || darkTheme;
            applyTheme(theme);
        }
    },

    saveSettings: async () => {
        try {
            const state = get();
            // Create a clean object with only settings properties to avoid sending store functions
            const filteredSettings: any = {};
            const keys = Object.keys(DEFAULT_SETTINGS);

            keys.forEach(key => {
                filteredSettings[key] = state[key as keyof Settings];
            });

            await AppAPI.saveSettings(filteredSettings as Settings);
        } catch (error) {
            errorService.handle(error, {
                component: 'SettingsStore',
                action: 'saveSettings'
            }, { showToast: false });
        }
    },


    resetSettings: () => {
        set(DEFAULT_SETTINGS);
        const theme = getThemeById(DEFAULT_SETTINGS.theme) || darkTheme;
        // Default settings has empty themeAccents
        applyTheme(theme);
        get().saveSettings();
    },
}));
