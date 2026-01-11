/**
 * Shared Utils - Re-export utility functions
 */

// Export functions only, not types to avoid conflicts
export {
    saveViewerStateToLocalStorage,
    loadViewerStateFromLocalStorage,
    saveTabsToLocalStorage,
    loadTabsFromLocalStorage,
    clearAllStorage,
} from '../../utils/storage';
export * from '../../utils/iconGenerator';
