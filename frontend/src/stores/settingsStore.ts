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

    // Persistence - Will be connected to Go backend
    loadSettings: async () => {
        try {
            // TODO: Load from Go backend
            // const settings = await GetSettings();
            // set(settings);

            // For now, apply default theme
            const theme = getThemeById(get().theme) || darkTheme;
            applyTheme(theme);
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    },

    saveSettings: async () => {
        try {
            // TODO: Save to Go backend
            // const state = get();
            // await SaveSettings(state);
            console.log('Settings saved:', get());
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
