/**
 * ViewerPage - Main viewer page that manages vertical and lateral modes
 * Refactored to use custom hooks and extracted components for better separation of concerns
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { VerticalViewer } from './VerticalViewer';
import { LateralViewer } from './LateralViewer';
import { ViewerControls } from './ViewerControls';
import { AutoScrollControls } from './AutoScrollControls';
import { ChapterNavigation } from './ChapterNavigation';
import { useViewerStore } from '../../stores/viewerStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { useTabStore } from '../../stores/tabStore';
import { ImageInfo, FolderInfo, ViewerMode } from '../../types';
import { saveViewerStateToLocalStorage, loadViewerStateFromLocalStorage } from '../../utils/storage';
import { useChapterNavigation } from '../../hooks/viewer/useChapterNavigation';
import { useViewerHistory } from '../../hooks/viewer/useViewerHistory';
import { AppAPI } from '../../services/api/appAPI';

// Icons removed - now in component files

interface ViewerPageProps {
    folderPath?: string;
    isActive?: boolean;
    tabId?: string;
}

export function ViewerPage({ folderPath, isActive = true, tabId }: ViewerPageProps) {
    const { t } = useTranslation();
    const { goBack, navigate } = useNavigationStore();
    const { viewerMode, setViewerMode, verticalWidth, setVerticalWidth, scrollSpeed, setScrollSpeed } = useSettingsStore();
    const {
        _updateTabStateById,
        setViewerState: globalSetViewerState
    } = useViewerStore();

    // Helper to update the correct tab
    const updateTabState = useCallback((updates: any) => {
        if (tabId) {
            _updateTabStateById(tabId, updates);
        } else {
            globalSetViewerState(updates);
        }
    }, [tabId, _updateTabStateById, globalSetViewerState]);

    // Get current state for this specific tab - single source of truth
    const tabState = useTabStore(state => state.tabs.find(t => t.id === tabId)?.viewerState);

    // Use tabState directly for both active and inactive tabs (no longer use viewerStore state)
    const currentFolder = tabState?.currentFolder || null;
    const images = tabState?.images || [];
    const currentIndex = tabState?.currentIndex || 0;
    const mode = tabState?.mode || 'vertical';
    const isLoading = tabState?.isLoading || false;

    // Per-manga zoom state (defaults to settings level if store doesn't have it)
    const currentVerticalWidth = (tabState?.verticalWidth || 0) !== 0 ? (tabState?.verticalWidth || verticalWidth) : verticalWidth;

    const [showControls, setShowControls] = useState(true);
    const [showWidthSlider, setShowWidthSlider] = useState(false);
    // Local state for resume position - initialize from tabState or params to avoid showing index 0 on restore
    const [resumeIndex, setResumeIndex] = useState(() => {
        // Initialize from tabState if available (for restore scenarios)
        const initialTab = useTabStore.getState().tabs.find(t => t.id === tabId);
        const initialTabState = initialTab?.viewerState;
        if (initialTabState?.currentIndex !== undefined && initialTabState.currentIndex >= 0) {
            return initialTabState.currentIndex;
        }
        // If viewerState is null but we have params with targetPath or startIndex, try to use those
        // This helps on restore when viewerState is null but params have the navigation info
        const params = initialTab?.params;
        if (params?.startIndex) {
            const startIndex = parseInt(params.startIndex, 10);
            if (!isNaN(startIndex) && startIndex >= 0) {
                return startIndex;
            }
        }
        return 0;
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [resumeScrollPos, setResumeScrollPos] = useState(0);
    const [resetKey, setResetKey] = useState(0);
    const controlsTimeoutRef = useRef<any>(null);
    // Debounce timer for saving viewer state to backend
    const saveViewerStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Track last synced index to avoid loops when syncing resumeIndex
    const lastSyncedIndexRef = useRef<number>(-1);
    // Track last processed navigation params to avoid reprocessing old params when switching tabs
    const lastProcessedParamsRef = useRef<{ targetPath?: string; startIndex?: string } | null>(null);
    // Store exact scrollTop in pixels for precise restoration when switching tabs
    const currentScrollTopRef = useRef<number>(0);
    // Auto-scroll state
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const [showSpeedSlider, setShowSpeedSlider] = useState(false);
    // Session flag state that can be updated during component reuse
    const [isNoHistorySession, setIsNoHistorySession] = useState(useNavigationStore.getState().params.noHistory === 'true');
    
    // Use custom hook for chapter navigation
    const chapterNav = useChapterNavigation(folderPath, isActive || false);

    // Prioritize viewer by pausing background thumbnail generation when active
    useEffect(() => {
        if (isActive && folderPath) {
            console.log(`[ViewerPage] Pausing thumbnails for ${folderPath}`);
            AppAPI.setThumbnailsPaused(true);
            return () => {
                console.log(`[ViewerPage] Resuming thumbnails`);
                AppAPI.setThumbnailsPaused(false);
            };
        }
    }, [isActive, folderPath]);

    // Unified handler for viewer state changes (index and zoom) - saves to backend with debounce
    const handleViewerStateChange = useCallback((updates: { index?: number, width?: number }) => {
        if (!folderPath) return;

        // Update local tab state immediately for UI responsiveness
        if (updates.width !== undefined) {
            updateTabState({ verticalWidth: updates.width });
        }
        if (updates.index !== undefined) {
            updateTabState({ currentIndex: updates.index });
        }

        // Clear existing timer
        if (saveViewerStateTimerRef.current) {
            clearTimeout(saveViewerStateTimerRef.current);
        }

        // Debounce save to backend
        saveViewerStateTimerRef.current = setTimeout(async () => {
            try {
                // Get current state from tabStore (single source of truth)
                const tab = useTabStore.getState().tabs.find(t => t.id === tabId);
                const tabViewerState = tab?.viewerState;
                const targetIndex = updates.index !== undefined ? updates.index : (tabViewerState?.currentIndex ?? 0);
                const targetWidth = updates.width !== undefined ? updates.width : ((tabViewerState?.verticalWidth || 0) !== 0 ? (tabViewerState?.verticalWidth || verticalWidth) : verticalWidth);

                // Save to localStorage instead of backend
                saveViewerStateToLocalStorage(folderPath, targetIndex, targetWidth);
                console.log(`[ViewerPage] Saved viewer state to localStorage: index=${targetIndex}, width=${targetWidth}`);
            } catch (error) {
                console.error('[ViewerPage] Failed to save viewer state:', error);
            }
        }, 500);
    }, [folderPath, verticalWidth, updateTabState, tabId]);

    // Callbacks for viewer components moved to top level to obey Rules of Hooks
    const handleRestorationComplete = useCallback(() => {
        if (tabId) {
            useTabStore.getState().completeRestoration(tabId);
        }
    }, [tabId]);

    const handleIndexChange = useCallback((index: number) => {
        handleViewerStateChange({ index });
    }, [handleViewerStateChange]);

    const handleWidthChange = useCallback((width: number) => {
        handleViewerStateChange({ width });
    }, [handleViewerStateChange]);

    // Handle scroll position change - debounced to avoid excessive updates
    const scrollPositionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleScrollPositionChange = useCallback((scrollTop: number) => {
        // Always store the exact scrollTop in a ref for precise restoration when switching tabs
        currentScrollTopRef.current = scrollTop;
        
        // Debounce scroll position updates to avoid excessive state updates
        if (scrollPositionDebounceRef.current) {
            clearTimeout(scrollPositionDebounceRef.current);
        }
        scrollPositionDebounceRef.current = setTimeout(() => {
            // Calculate scroll position as percentage (0-1) for history storage
            const container = document.querySelector('.overflow-y-scroll') as HTMLElement;
            let scrollPercentage = 0;
            if (container) {
                const { scrollHeight, clientHeight } = container;
                const maxScroll = scrollHeight - clientHeight;
                if (maxScroll > 0) {
                    scrollPercentage = scrollTop / maxScroll;
                }
            }

            // Store percentage in scrollPosition for history
            updateTabState({ 
                scrollPosition: scrollPercentage // Store as percentage (0-1) for history
            });

            // DON'T update resumeScrollPos during normal scrolling - this causes the initialScrollPosition
            // prop to change continuously, triggering restoration and causing "tirones"
            // resumeScrollPos should only be set when explicitly restoring (on tab activation or folder load)
        }, 100); // Debounce 100ms
    }, [updateTabState]);


    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (saveViewerStateTimerRef.current) {
                clearTimeout(saveViewerStateTimerRef.current);
            }
        };
    }, []);

    // Update session flag when navigation params change (handles component reuse)
    useEffect(() => {
        const noHistory = useNavigationStore.getState().params.noHistory === 'true';
        console.log(`[ViewerPage] Updating isNoHistorySession for ${folderPath} to: ${noHistory}`);
        setIsNoHistorySession(noHistory);
    }, [folderPath]);

    // Sync resumeIndex with currentIndex when tab becomes active
    // This ensures the viewer scrolls to the correct position when switching tabs
    // This is critical for tabs, explorer, oneshot, and restore on startup
    useEffect(() => {
        if (!isActive) {
            // When tab becomes inactive, save the current scrollTop for precise restoration later
            // This ensures we restore the exact scroll position when returning to this tab
            if (currentScrollTopRef.current > 0) {
                setResumeScrollPos(currentScrollTopRef.current);
                console.log(`[ViewerPage] Tab inactive: Saved scrollTop ${currentScrollTopRef.current}px for tab ${tabId}`);
            }
            // Reset lastSyncedIndexRef when tab becomes inactive so we sync again when it becomes active
            lastSyncedIndexRef.current = -1;
            // Also reset last processed params
            lastProcessedParamsRef.current = null;
            return;
        }
        if (images.length === 0) return;
        if (!folderPath) return;

        // Read currentIndex directly from tabState to ensure we have the latest value
        const tab = useTabStore.getState().tabs.find(t => t.id === tabId);
        const tabCurrentIndex = tab?.viewerState?.currentIndex ?? 0;
        
        // When tab becomes active, sync resumeIndex and resumeScrollPos with tabState
        // This ensures we resume at the correct position when switching tabs
        // Always sync if currentIndex is valid and different from resumeIndex, regardless of lastSynced
        // because lastSynced might be updated by navigation seek which runs later
        // Also reset lastProcessedParamsRef to allow processing new navigation params when switching tabs
        const tabScrollPosition = tab?.viewerState?.scrollPosition;
        
        if (tabCurrentIndex >= 0 && tabCurrentIndex < images.length && tabCurrentIndex !== resumeIndex) {
            console.log(`[ViewerPage] Tab activated: Syncing resumeIndex from ${resumeIndex} to ${tabCurrentIndex} for tab ${tabId} (currentIndex from store: ${currentIndex}, lastSynced: ${lastSyncedIndexRef.current})`);
            setResumeIndex(tabCurrentIndex);
            lastSyncedIndexRef.current = tabCurrentIndex;
            
            // Restore scroll position: use resumeScrollPos if available (exact pixels), otherwise convert percentage
            if (resumeScrollPos > 0) {
                // We have exact scrollTop in pixels from when tab was inactive - use it directly
                console.log(`[ViewerPage] Tab activated: Restoring exact scrollTop ${resumeScrollPos}px`);
            } else if (tabScrollPosition && tabScrollPosition > 0 && tabScrollPosition <= 1) {
                // Only have percentage, will be converted by VerticalViewer
                console.log(`[ViewerPage] Tab activated: Will restore scroll position percentage: ${tabScrollPosition}`);
                setResumeScrollPos(tabScrollPosition); // Set percentage, VerticalViewer will convert
            }
            
            // Mark current params as processed to prevent navigation seek from applying old params
            // This is important when switching tabs - we want to use the saved state, not old navigation params
            const currentParams = tab?.params;
            if (currentParams && (currentParams.targetPath || currentParams.startIndex)) {
                lastProcessedParamsRef.current = { 
                    targetPath: currentParams.targetPath, 
                    startIndex: currentParams.startIndex 
                };
                console.log(`[ViewerPage] Tab activated: Marked current params as processed to prevent applying old navigation`);
            } else {
                lastProcessedParamsRef.current = null;
            }
        } else if (tabCurrentIndex === resumeIndex) {
            console.log(`[ViewerPage] Tab activated: Already synced (resumeIndex=${resumeIndex}, tabCurrentIndex=${tabCurrentIndex})`);
            // Update lastSynced even if already synced to prevent duplicate work
            lastSyncedIndexRef.current = tabCurrentIndex;
            
            // Still check for scroll position updates if resumeScrollPos is 0
            if (resumeScrollPos === 0 && tabScrollPosition && tabScrollPosition > 0 && tabScrollPosition <= 1) {
                console.log(`[ViewerPage] Tab activated: Will restore scroll position percentage: ${tabScrollPosition}`);
                setResumeScrollPos(tabScrollPosition); // Set percentage, VerticalViewer will convert
            }
            
            // Mark current params as processed to prevent navigation seek from applying old params
            // This is important when switching tabs - we want to use the saved state, not old navigation params
            const currentParams = tab?.params;
            if (currentParams && (currentParams.targetPath || currentParams.startIndex)) {
                lastProcessedParamsRef.current = { 
                    targetPath: currentParams.targetPath, 
                    startIndex: currentParams.startIndex 
                };
                console.log(`[ViewerPage] Tab activated: Marked current params as processed to prevent applying old navigation`);
            } else {
                lastProcessedParamsRef.current = null;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, tabId, folderPath]); // Include tabId and folderPath to re-sync when switching tabs

    // Load folder and images
    useEffect(() => {
        if (!folderPath) return;
        if (!isActive) return; // Don't load if tab is not active - prevents content bleeding between tabs

        // Read tab state to check if we are in restoration
        const activeTabFromState = useTabStore.getState().tabs.find(t => t.id === tabId);
        const isRestoredFromState = activeTabFromState?.restored;

        if (!isRestoredFromState && images.length > 0 && currentFolder?.path === folderPath) {
            console.log(`[ViewerPage] Eager check: Using existing images for ${folderPath}. Resuming at index ${currentIndex} (resumeIndex: ${resumeIndex}, lastSynced: ${lastSyncedIndexRef.current})`);
            // Important: ensure resumeIndex is updated to our last known position
            // so child components like VerticalViewer re-scroll correctly
            // Always update if resumeIndex doesn't match currentIndex, regardless of lastSynced
            // because resumeIndex might not have been updated yet due to React state batching
            if (currentIndex !== resumeIndex) {
                console.log(`[ViewerPage] Eager check: Updating resumeIndex from ${resumeIndex} to ${currentIndex}`);
                setResumeIndex(currentIndex);
                lastSyncedIndexRef.current = currentIndex;
            } else {
                console.log(`[ViewerPage] Eager check: Already synced (resumeIndex=${resumeIndex}, currentIndex=${currentIndex})`);
            }
            return;
        }

        const loadFolder = async () => {
            const activeTab = useTabStore.getState().tabs.find(t => t.id === tabId);
            const isRestored = activeTab?.restored;

            if (isRestored) {
                console.log(`[ViewerPage] Restored tab detected for ${folderPath}. Forcing refresh to update stale URLs.`);
                // Clear restored flag so we don't force refresh every time we switch back to this tab
                useTabStore.getState().updateTab(tabId!, { restored: false });
            }

            // Save current progress before switching if not a no-history session
            if (currentFolder && !isNoHistorySession) {
                await saveProgress();
            }

            updateTabState({ isLoading: true });
            try {
                // Check if we should use shallow loading (non-recursive)
                const navParams = useNavigationStore.getState().params;
                const useShallow = navParams && navParams.shallow === 'true';

                // Use AppAPI service instead of direct window.go calls
                const folderInfo = useShallow
                    ? await AppAPI.getFolderInfoShallow(folderPath)
                    : await AppAPI.getFolderInfo(folderPath);

                const imageList = useShallow
                    ? await AppAPI.getImagesShallow(folderPath)
                    : await AppAPI.getImages(folderPath);

                // Fetch history for this folder (legacy fallback)
                const historyEntry = await AppAPI.getHistoryEntry(folderPath);

                // NEW: Fetch viewer state from localStorage (primary source for restoration)
                const savedViewerState = loadViewerStateFromLocalStorage(folderPath);

                if (folderInfo) {
                    updateTabState({ currentFolder: folderInfo as FolderInfo });
                }
                if (imageList) {
                    // Update images
                    // Important: setImages resets index to 0 usually, so we need to override if history exists
                    // We need a way to set images AND index atomically or sequentially without trigger saveProgress(0)

                    const imgs = imageList as ImageInfo[];
                    let targetIndex = 0;
                    let targetScroll = 0;

                    // Check for targetPath or explicit start index from navigation params
                    // Use tab-specific params instead of global navigation params for restoration consistency
                    const tabParams = activeTab?.params || {};
                    const targetPath = tabParams.targetPath;
                    const explicitStartIndex = tabParams.startIndex ? parseInt(tabParams.startIndex, 10) : -1;

                    // PRIORITIZATION LOGIC:
                    // If tab is being restored, ignore params.targetPath and use backend state instead
                    // This ensures we use the latest scroll position, not the initial click position
                    // 1. savedViewerState from backend (Resume from last session) - PRIORITY when restoring
                    // 2. targetPath specified in navigation params (Explicit user click) - Only if NOT restoring
                    // 3. explicitStartIndex in navigation params (Explicit user click) - Only if NOT restoring
                    // 4. history entry (Legacy fallback)

                    // First, try to get scroll position from current tabState if available
                    const currentTabScroll = activeTab?.viewerState?.scrollPosition;
                    if (currentTabScroll && currentTabScroll > 0 && currentTabScroll <= 1) {
                        // Convert percentage to approximate pixels (will be refined after DOM loads)
                        // We'll use the stored scrollTop directly if available in resumeScrollPos
                        // For now, we'll calculate it after DOM is ready
                        targetScroll = currentTabScroll; // Store percentage for now
                    }

                    if (isRestored && savedViewerState && savedViewerState.currentIndex > 0 && savedViewerState.currentIndex < imgs.length) {
                        // When restoring, prioritize backend state over params
                        targetIndex = savedViewerState.currentIndex;
                        console.log(`[ViewerPage] Restoring from BACKEND state (ignoring params): index=${targetIndex}`);
                    } else if (targetPath && !isRestored) {
                        // Only use targetPath if NOT restoring (new navigation)
                        const pathIndex = imgs.findIndex(img => img.path === targetPath);
                        if (pathIndex >= 0) {
                            targetIndex = pathIndex;
                            console.log(`[ViewerPage] Starting from TARGET PATH: ${targetIndex} (${targetPath})`);
                        }
                    } else if (explicitStartIndex >= 0 && explicitStartIndex < imgs.length && !isRestored) {
                        // Only use startIndex if NOT restoring (new navigation)
                        targetIndex = explicitStartIndex;
                        console.log(`[ViewerPage] Starting from EXPLICIT INDEX: ${targetIndex}`);
                    } else if (savedViewerState && savedViewerState.currentIndex > 0 && savedViewerState.currentIndex < imgs.length) {
                        // Fallback to backend state if no explicit navigation
                        targetIndex = savedViewerState.currentIndex;
                        console.log(`[ViewerPage] Resuming from BACKEND state: index=${targetIndex}`);
                    } else if (historyEntry && historyEntry.lastImageIndex > 0 && historyEntry.lastImageIndex < imgs.length) {
                        // Fallback to history if no saved state
                        targetIndex = historyEntry.lastImageIndex;
                        console.log(`[ViewerPage] Resuming from history index: ${targetIndex}`);
                        if (historyEntry.scrollPosition > 0 && !targetScroll) {
                            targetScroll = historyEntry.scrollPosition;
                        }
                    }

                    // Set local state FIRST before store update
                    // targetScroll is a percentage (0-1) from history or tabState
                    // We need to convert it to pixels, but that requires DOM to be ready
                    // For now, pass the percentage and let VerticalViewer convert it after DOM loads
                    console.log(`[ViewerPage] Setting resumeIndex=${targetIndex}, resumeScrollPos=${targetScroll} (percentage)`);
                    setResumeIndex(targetIndex);
                    lastSyncedIndexRef.current = targetIndex; // Update last synced index
                    // Store percentage - VerticalViewer will convert to pixels when DOM is ready
                    setResumeScrollPos(targetScroll);

                    // Update store with new images and index via the new setViewerState action
                    // which correctly updates the tabStore as well
                    updateTabState({
                        images: imgs,
                        currentIndex: targetIndex,
                        scrollPosition: targetScroll,
                        verticalWidth: savedViewerState?.verticalWidth || 0, // 0 = use global
                        currentFolder: folderInfo as FolderInfo,
                        isLoading: false
                    });
                    // setIsLoading(false) moved here implicitly by store update? No, local state.
                }

                // Chapter navigation is now handled by useChapterNavigation hook

            } catch (error) {
                console.error('Failed to load folder:', error);
                updateTabState({ isLoading: false });
            }
        };

        loadFolder();
    }, [folderPath, isActive, tabId]); // REMOVED resetKey to prevent infinite loop

    // Separate effect for "Seeks" (navigation within the same folder)
    const currentParams = useTabStore(state => state.tabs.find(t => t.id === tabId)?.params);
    useEffect(() => {
        if (!isActive || !folderPath || images.length === 0) return;
        if (currentFolder?.path !== folderPath) return;

        const targetPath = currentParams?.targetPath;
        const explicitStartIndex = currentParams?.startIndex ? parseInt(currentParams.startIndex, 10) : -1;

        // Check if these params have already been processed
        const currentParamsKey = `${targetPath || ''}_${currentParams?.startIndex || ''}`;
        const lastParamsKey = lastProcessedParamsRef.current ? 
            `${lastProcessedParamsRef.current.targetPath || ''}_${lastProcessedParamsRef.current.startIndex || ''}` : 
            null;

        let targetIndex = -1;
        if (targetPath) {
            targetIndex = images.findIndex(img => img.path === targetPath);
        } else if (explicitStartIndex >= 0) {
            targetIndex = explicitStartIndex;
        }

        // Only process if params are new or different
        if (currentParamsKey === lastParamsKey && lastParamsKey !== '') {
            console.log(`[ViewerPage] Navigation seek: Skipping - already processed params`);
            return;
        }

        if (targetIndex >= 0) {
            // Calculate diff based on currentIndex, not resumeIndex (which may not be updated yet)
            const indexDiffFromCurrent = Math.abs(targetIndex - currentIndex);
            
            // If targetIndex matches currentIndex, these are old params that should be ignored
            if (targetIndex === currentIndex) {
                console.log(`[ViewerPage] Navigation seek: Ignoring old params - targetIndex ${targetIndex} matches currentIndex ${currentIndex}`);
                lastProcessedParamsRef.current = { targetPath, startIndex: currentParams?.startIndex };
                return;
            }
            
            // Only apply if it's significantly different from currentIndex (user navigation)
            // BUT if currentIndex is already set and targetIndex is very different, it's likely old params
            // We should only apply if:
            // 1. targetIndex is close to currentIndex (within 5), OR
            // 2. currentIndex is not set (0 or initial state)
            // If currentIndex is already set and targetIndex is very different (>5), ignore as old params
            const isCurrentIndexSet = currentIndex > 0 && currentIndex < images.length;
            const isCloseToCurrent = indexDiffFromCurrent <= 5;
            const shouldApply = targetIndex !== currentIndex && 
                (isCloseToCurrent || !isCurrentIndexSet);
            
            if (shouldApply) {
                console.log(`[ViewerPage] Navigation seek detected: ${targetIndex} (currentIndex: ${currentIndex}, resumeIndex: ${resumeIndex}, diffFromCurrent: ${indexDiffFromCurrent}, isCurrentIndexSet: ${isCurrentIndexSet})`);
                setResumeIndex(targetIndex);
                lastSyncedIndexRef.current = targetIndex;
                lastProcessedParamsRef.current = { targetPath, startIndex: currentParams?.startIndex };
                // Updating resetKey here is safe because the main effect NO LONGER depends on it
                setResetKey(prev => prev + 1);
                updateTabState({ currentIndex: targetIndex });
            } else {
                console.log(`[ViewerPage] Navigation seek: Ignoring ${targetIndex} (currentIndex: ${currentIndex}, resumeIndex: ${resumeIndex}, diffFromCurrent: ${indexDiffFromCurrent}, isCurrentIndexSet: ${isCurrentIndexSet}, likely old params)`);
                // Mark as processed even if we skip to avoid reprocessing
                lastProcessedParamsRef.current = { targetPath, startIndex: currentParams?.startIndex };
            }
        } else {
            // No valid target index, but mark params as processed if they exist
            if (targetPath || currentParams?.startIndex) {
                lastProcessedParamsRef.current = { targetPath, startIndex: currentParams?.startIndex };
            }
        }
    }, [currentParams?.targetPath, currentParams?.startIndex, isActive, folderPath, images.length, currentIndex, resumeIndex, updateTabState]);


    // Initial history save when folder is loaded
    // Initial history save removed to prevent overwriting resume index
    // useEffect(() => {
    //     if (currentFolder && images.length > 0) {
    //         saveProgress();
    //     }
    // }, [currentFolder, images.length]);



    // Sync viewer mode with settings
    useEffect(() => {
        if (isActive) {
            updateTabState({ mode: viewerMode });
        }
    }, [viewerMode, isActive, updateTabState]);

    // Use custom hook for history management
    const { saveProgress: saveProgressHook } = useViewerHistory({
        currentFolder,
        images,
        currentIndex,
        scrollPosition: tabState?.scrollPosition || 0,
        isNoHistorySession,
    });

    // Wrapper to maintain compatibility with existing code
    const saveProgress = useCallback(async (percentage?: any) => {
        if (!currentFolder || images.length === 0) return;
        if (isNoHistorySession) return;

        // Determine correct scroll position for history (must be 0-1)
        let historyScrollPos = 0;
        if (typeof percentage === 'number' && percentage >= 0 && percentage <= 1) {
            historyScrollPos = percentage;
        } else {
            // Get scroll position from tabState (single source of truth)
            const tab = useTabStore.getState().tabs.find(t => t.id === tabId);
            const storePos = tab?.viewerState?.scrollPosition ?? 0;
            if (storePos >= 0 && storePos <= 1) {
                historyScrollPos = storePos;
            }
        }

        // Update tab state with scroll position before saving
        updateTabState({ scrollPosition: historyScrollPos });
        
        // Use the hook's saveProgress
        await saveProgressHook(historyScrollPos);
    }, [currentFolder, images, currentIndex, isNoHistorySession, tabId, updateTabState, saveProgressHook]);

    // Save progress when leaving
    useEffect(() => {
        return () => {
            saveProgress();
        };
    }, [saveProgress]);

    // Auto-hide controls
    useEffect(() => {
        const handleMouseMove = () => {
            setShowControls(true);
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, []);

    // Toggle viewer mode
    const toggleMode = () => {
        const newMode = mode === 'vertical' ? 'lateral' : 'vertical';
        updateTabState({ mode: newMode });
        setViewerMode(newMode);
    };

    // Chapter navigation handlers
    const handlePrevChapter = useCallback(async () => {
        if (chapterNav?.prevChapter) {
            await saveProgress();
            // If navigating between chapters in a series, maintain 'series' as active menu page
            navigate('viewer', { folder: chapterNav.prevChapter.path }, 'series');
        }
    }, [chapterNav, navigate, saveProgress]);

    const handleNextChapter = useCallback(async () => {
        if (chapterNav?.nextChapter) {
            await saveProgress();
            // If navigating between chapters in a series, maintain 'series' as active menu page
            navigate('viewer', { folder: chapterNav.nextChapter.path }, 'series');
        }
    }, [chapterNav, navigate, saveProgress]);

    const handleGoToStart = useCallback(async () => {
        setResumeIndex(0);
        lastSyncedIndexRef.current = 0; // Update last synced index
        setResumeScrollPos(0);
        setResetKey(prev => prev + 1);

        // Force store update to trigger re-renders in children
        updateTabState({
            currentIndex: 0,
            scrollPosition: 0
        });
        // Save progress at start
        if (currentFolder && !isNoHistorySession) {
        try {
            await AppAPI.addHistory({
                folderPath: currentFolder.path,
                folderName: currentFolder.name,
                lastImage: images[0]?.name || '',
                lastImageIndex: 0,
                scrollPosition: 0,
                totalImages: images.length,
                lastRead: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Failed to reset progress in history:', error);
        }
        }
    }, [currentFolder, images, isNoHistorySession]);

    const hasChapterButtons = !!(chapterNav && (chapterNav.prevChapter || chapterNav.nextChapter));

    // If images is empty but we are loading OR we haven't even started loading a folderPath yet,
    // show the loading screen.
    if (isLoading || (folderPath && images.length === 0)) {
        return (
            <div
                className="flex items-center justify-center h-full"
                style={{ backgroundColor: 'var(--color-surface-primary)' }}
            >
                <div
                    className="flex flex-col items-center gap-4 animate-fade-in"
                >
                    <div
                        className="w-16 h-16 border-4 rounded-full animate-spin-slow"
                        style={{
                            borderColor: 'var(--color-accent)',
                            borderTopColor: 'transparent',
                        }}
                    />
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                        {t('common.loading')}
                    </span>
                </div>
            </div>
        );
    }

    if (!currentFolder || images.length === 0) {
        return (
            <div
                className="flex flex-col items-center justify-center h-full gap-4"
                style={{ backgroundColor: 'var(--color-surface-primary)' }}
            >
                <div
                    className="text-6xl animate-scale-in"
                >
                    📂
                </div>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                    {t('errors.noImages')}
                </span>
                <button
                    onClick={goBack}
                    className="btn-primary hover:scale-105 active:scale-95 transition-transform"
                >
                    {t('common.back')}
                </button>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full overflow-hidden">
            {/* Viewer */}
            <div className="relative h-full w-full">
                {mode === 'vertical' ? (
                    <div
                        key={`vertical-${currentFolder.path}-${resetKey}`}
                        className={`h-full w-full transition-opacity duration-300 ${mode === 'vertical' ? 'opacity-100' : 'opacity-0'}`}
                    >
                        <VerticalViewer
                            key={`${currentFolder.path}-${resetKey}`}
                            images={images}
                            initialIndex={resumeIndex}
                            initialScrollPosition={resumeScrollPos > 0 ? resumeScrollPos : undefined}
                            showControls={showControls}
                            hasChapterButtons={hasChapterButtons}
                            isAutoScrolling={isAutoScrolling}
                            scrollSpeed={scrollSpeed}
                            onAutoScrollStateChange={setIsAutoScrolling}
                            onRestorationComplete={handleRestorationComplete}
                            onIndexChange={handleIndexChange}
                            onScrollPositionChange={handleScrollPositionChange}
                            verticalWidth={currentVerticalWidth}
                            onWidthChange={handleWidthChange}
                            isActive={isActive}
                        />
                    </div>
                ) : (
                    <div
                        key={`lateral-${currentFolder.path}-${resetKey}`}
                        className={`h-full w-full transition-opacity duration-300 ${mode === 'lateral' ? 'opacity-100' : 'opacity-0'}`}
                    >
                        <LateralViewer
                            key={`${currentFolder.path}-${resetKey}`}
                            images={images}
                            onPageChange={saveProgress}
                            initialIndex={resumeIndex}
                            showControls={showControls}
                            hasChapterButtons={hasChapterButtons}
                            onRestorationComplete={handleRestorationComplete}
                        />

                    </div>
                )}
            </div>

            {/* Top control bar - using extracted component */}
            <ViewerControls
                folderName={currentFolder.name}
                chapterNav={chapterNav}
                mode={mode}
                showControls={showControls}
                onBack={goBack}
                onModeToggle={toggleMode}
                onThumbnails={() => navigate('thumbnails', { folder: currentFolder.path })}
                onGoToStart={handleGoToStart}
                onWidthSliderToggle={() => setShowWidthSlider(!showWidthSlider)}
                showWidthSlider={showWidthSlider}
                verticalWidth={currentVerticalWidth}
                onWidthChange={(width) => handleViewerStateChange({ width })}
                t={t}
            >
                {/* Auto-scroll controls (vertical mode only) */}
                {mode === 'vertical' && (
                    <AutoScrollControls
                        isAutoScrolling={isAutoScrolling}
                        scrollSpeed={scrollSpeed}
                        showSpeedSlider={showSpeedSlider}
                        onToggle={() => setIsAutoScrolling(!isAutoScrolling)}
                        onSpeedSliderToggle={() => setShowSpeedSlider(!showSpeedSlider)}
                        onSpeedChange={setScrollSpeed}
                        t={t}
                    />
                )}
            </ViewerControls>

            {/* Click outside handler for speed slider */}
            {showSpeedSlider && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSpeedSlider(false)}
                />
            )}

            {/* Bottom chapter navigation bar - using extracted component */}
            <ChapterNavigation
                prevChapter={chapterNav?.prevChapter}
                nextChapter={chapterNav?.nextChapter}
                showControls={showControls}
                onPrevChapter={handlePrevChapter}
                onNextChapter={handleNextChapter}
                t={t}
            />
        </div>
    );
}

export default ViewerPage;
