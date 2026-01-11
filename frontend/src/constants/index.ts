/**
 * Application Constants
 * Centralized constants for the application
 */

import { PageType } from '../types';

/**
 * Storage keys for localStorage
 */
export const STORAGE_KEYS = {
    TABS: 'manga-visor2-tabs',
    VIEWER_STATES: 'manga-visor2-viewer-states',
    EXPLORER_SORT_PREFERENCES: 'explorer_sortPreferences',
} as const;

/**
 * Debounce delays in milliseconds
 */
export const DEBOUNCE_DELAYS = {
    TAB_SAVE: 500,
    VIEWER_STATE_SAVE: 500,
    SCROLL_POSITION: 100,
    WINDOW_RESIZE: 200,
} as const;

/**
 * Main navigation pages (pages that should be saved for startup restore)
 */
export const MAIN_PAGES: PageType[] = [
    'home',
    'explorer',
    'history',
    'oneShot',
    'series',
    'download',
    'settings',
] as const;

/**
 * Main pages that should be saved to settings for startup restore
 */
export const MAIN_PAGES_TO_SAVE: PageType[] = [
    'home',
    'oneShot',
    'series',
    'history',
    'download',
    'settings',
] as const;

/**
 * Viewer default values and limits
 */
export const VIEWER_DEFAULTS = {
    ZOOM_MIN: 0.1,
    ZOOM_MAX: 5,
    ZOOM_STEP: 0.25,
    VERTICAL_WIDTH_MIN: 10,
    VERTICAL_WIDTH_MAX: 100,
} as const;

/**
 * Viewer state storage limits
 */
export const VIEWER_STATE_LIMITS = {
    MAX_STORED_STATES: 100,
} as const;
