/**
 * Settings Store - Manages application settings
 */

import { create } from 'zustand';
import { Settings, DEFAULT_SETTINGS } from '../types';
import { applyTheme, getThemeById, darkTheme } from '../themes';

interface SettingsState extends Settings {
    // Actions
    setLanguage: (language: string) => void;
    setTheme: (themeId: string) => void;
    setViewerMode: (mode: Settings['viewerMode']) => void;
    setVerticalWidth: (width: number) => void;
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
        get().saveSettings();
    },

    setTheme: (themeId) => {
        const theme = getThemeById(themeId) || darkTheme;
        applyTheme(theme);
        set({ theme: themeId });
        get().saveSettings();
    },

    setViewerMode: (viewerMode) => {
        set({ viewerMode });
        get().saveSettings();
    },

    setVerticalWidth: (verticalWidth) => {
        const clampedWidth = Math.min(100, Math.max(10, verticalWidth));
        set({ verticalWidth: clampedWidth });
        get().saveSettings();
    },

    setLateralMode: (lateralMode) => {
        set({ lateralMode });
        get().saveSettings();
    },

    setReadingDirection: (readingDirection) => {
        set({ readingDirection });
        get().saveSettings();
    },

    setPanicKey: (panicKey) => {
        set({ panicKey });
        get().saveSettings();
    },

    setLastFolder: (lastFolder) => {
        set({ lastFolder });
        get().saveSettings();
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


    // Persistence - Will be connected to Go backend
    loadSettings: async () => {
        try {
            // @ts-ignore
            const settings = await window.go?.main?.App?.GetSettings();
            if (settings) {
                set(settings);

                // Apply theme
                const theme = getThemeById(settings.theme) || darkTheme;
                applyTheme(theme);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    },

    saveSettings: async () => {
        try {
            const state = get();
            // Create a clean object with only settings properties to avoid sending store functions
            const filteredSettings: any = {};
            const keys = Object.keys(DEFAULT_SETTINGS);

            // @ts-ignore
            keys.forEach(key => filteredSettings[key] = state[key]);

            // @ts-ignore
            await window.go?.main?.App?.SaveSettings(filteredSettings);
            // console.log('Settings saved');
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    },


    resetSettings: () => {
        set(DEFAULT_SETTINGS);
        const theme = getThemeById(DEFAULT_SETTINGS.theme) || darkTheme;
        applyTheme(theme);
        get().saveSettings();
    },
}));
