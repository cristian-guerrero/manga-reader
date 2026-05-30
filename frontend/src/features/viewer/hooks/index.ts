/**
 * Viewer Hooks - Re-export all viewer-specific hooks
 */

// Hooks created during ViewerPage refactoring
export { useViewerState } from './useViewerState';
export { useViewerFolderLoading } from './useViewerFolderLoading';
export { useViewerTabSync } from './useViewerTabSync';
export { useViewerNavigationSeek } from './useViewerNavigationSeek';
export { useViewerControls } from './useViewerControls';

// Hooks moved from src/hooks/viewer/
export { useChapterNavigation } from './useChapterNavigation';
export { useFolderNavigation } from './useFolderNavigation';
export { useViewerHistory } from './useViewerHistory';