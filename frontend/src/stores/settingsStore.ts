/**
 * Settings Store - Manages application settings
 */

import { create } from 'zustand';
import { Settings } from '../types';
import { applyTheme, getThemeById, darkTheme } from '../themes';
import { AppAPI } from '../services/api/appAPI';
import { errorService } from '../services/errorService';
import { DEBOUNCE_DELAYS } from '../constants';

// Debounce timer for accent color updates
let accentColorDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Bootstrap initial state (overwritten by backend loadSettings before any render)
const INITIAL_STATE: Settings = {
  language: 'en',
  theme: 'dark',
  viewerMode: 'vertical',
  verticalWidth: 80,
  scrollSpeed: 50,
  lateralMode: 'single',
  readingDirection: 'ltr',
  panicKey: 'Escape',
  lastFolder: '',
  sidebarCollapsed: false,
  showImageInfo: false,
  preloadImages: true,
  preloadCount: 3,
  enableHistory: true,
  minImageSize: 0,
  processDroppedFolders: true,
  lastPage: 'home',
  enabledMenuItems: {
    'home': true,
    'history': true,
    'oneShot': true,
    'series': true,
    'explorer': true,
    'download': true,
    'colorizer': true,
    'settings': true,
    'library-manager': true
  },
  downloadPath: '',
  clipboardAutoMonitor: true,
  autoResumeDownloads: false,
  themeAccents: {},
  tabMemorySaving: false,
  restoreTabs: false,
  generateThumbnails: true,
  autoUpdate: true,
  localNetworkServer: false,
};

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
  setGenerateThumbnails: (enable: boolean) => void;
  setAutoUpdate: (enable: boolean) => void;
  setLocalNetworkServer: (enable: boolean) => void;

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
  // Bootstrap initial state (overwritten by loadSettings from backend)
  ...INITIAL_STATE,

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

    // Apply theme immediately for responsive UI
    applyTheme(theme, effectiveAccent);
    set({ themeAccents: newAccents });

    // Debounce backend update to avoid excessive API calls
    if (accentColorDebounceTimer) {
      clearTimeout(accentColorDebounceTimer);
    }

    accentColorDebounceTimer = setTimeout(() => {
      get().updateBackend('themeAccents', newAccents);
      accentColorDebounceTimer = null;
    }, DEBOUNCE_DELAYS.SETTINGS_UPDATE);
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
  setGenerateThumbnails: (generateThumbnails) => {
    set({ generateThumbnails });
    get().updateBackend('generateThumbnails', generateThumbnails);
  },

  setAutoUpdate: (autoUpdate) => {
    set({ autoUpdate });
    get().updateBackend('autoUpdate', autoUpdate);
  },

  setLocalNetworkServer: async (localNetworkServer) => {
    set({ localNetworkServer });
    try {
      await AppAPI.toggleLocalNetworkServer(localNetworkServer);
    } catch (error) {
      errorService.handle(error, {
        component: 'SettingsStore',
        action: 'setLocalNetworkServer',
      }, { showToast: true });
      set({ localNetworkServer: !localNetworkServer });
    }
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
    const currentItems = enabledMenuItems;

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
        applyTheme(darkTheme);
      }
    } catch (error) {
      errorService.handle(error, {
        component: 'SettingsStore',
        action: 'loadSettings'
      }, { showToast: false });
      applyTheme(darkTheme);
    }
  },

  saveSettings: async () => {
    try {
      const state = get();
      const filteredSettings: Record<string, unknown> = {};
      const keys: (keyof Settings)[] = [
        'language', 'theme', 'viewerMode', 'verticalWidth', 'scrollSpeed',
        'lateralMode', 'readingDirection', 'panicKey', 'lastFolder',
        'sidebarCollapsed', 'showImageInfo', 'preloadImages', 'preloadCount',
        'enableHistory', 'minImageSize', 'processDroppedFolders', 'lastPage',
        'enabledMenuItems', 'downloadPath', 'clipboardAutoMonitor',
        'autoResumeDownloads', 'themeAccents', 'tabMemorySaving', 'restoreTabs',
        'generateThumbnails', 'autoUpdate',
      ];

      keys.forEach(key => {
        filteredSettings[key] = state[key];
      });

      await AppAPI.saveSettings(filteredSettings as unknown as Settings);
    } catch (error) {
      errorService.handle(error, {
        component: 'SettingsStore',
        action: 'saveSettings'
      }, { showToast: false });
    }
  },


  resetSettings: async () => {
    try {
      await AppAPI.resetSettings();
      await get().loadSettings();
    } catch (error) {
      errorService.handle(error, {
        component: 'SettingsStore',
        action: 'resetSettings'
      }, { showToast: false });
    }
  },
}));
