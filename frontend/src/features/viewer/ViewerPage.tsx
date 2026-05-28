/**
 * ViewerPage - Main viewer page that manages vertical and lateral modes
 * Refactored to use custom hooks for better separation of concerns
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ViewerControls } from './ViewerControls';
import { AutoScrollControls } from './AutoScrollControls';
import { ChapterNavigation } from './ChapterNavigation';
import { ViewerContent } from './components/ViewerContent';
import { ViewerLoadingState } from './ViewerLoadingState';
import { ViewerEmptyState } from './ViewerEmptyState';
import { useViewer, useNavigation } from '@hooks';
import { useSettingsStore, useTabStore } from '@stores';
import { AppAPI } from '@services/api/appAPI';
import {
    useViewerState,
    useViewerFolderLoading,
    useViewerTabSync,
    useViewerNavigationSeek,
    useViewerControls,
    useChapterNavigation,
    useFolderNavigation,
    useViewerHistory,
} from './hooks';
import { ContextMenu } from '../../components/ui/ContextMenu';
import type { ContextMenuItem, PageType } from '@types';

interface ViewerPageProps {
    folderPath?: string;
    isActive?: boolean;
    tabId?: string;
}

export function ViewerPage({ folderPath, isActive = true, tabId }: ViewerPageProps) {
    const { t } = useTranslation();
    const { goBack, navigate, params, fromPage: navFromPage, history } = useNavigation();
    const fromPage = navFromPage || params.from || 'series';
    const isExplorerMode = fromPage === 'explorer';
    console.log('[ViewerPage] fromPage:', fromPage, 'isExplorer:', isExplorerMode, 'folderPath:', folderPath);
    console.log('[ViewerPage] fromPage:', fromPage, 'isExplorerMode:', isExplorerMode, 'folderPath:', folderPath, 'navFromPage:', navFromPage, 'params.from:', params.from);
    const { scrollSpeed, setScrollSpeed } = useSettingsStore();
    const { setViewerState: updateTabState } = useViewer(tabId);
    const tabState = useTabStore((state) => state.tabs.find((t) => t.id === tabId)?.viewerState);

    // Use viewer state hook
    const viewerState = useViewerState({
        folderPath,
        tabId,
        isActive,
        params,
    });

    // Use controls hook
    const controls = useViewerControls();

    // Session flag state
    const [isNoHistorySession, setIsNoHistorySession] = useState(params.noHistory === 'true');

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

    // Sort preferences from navigation params (when opened from Explorer)
    const sortBy = params.sortBy;
    const sortOrder = params.sortOrder;

    // Use custom hook for chapter navigation (series) or folder navigation (explorer)
    const chapterNav = !isExplorerMode ? useChapterNavigation(folderPath, isActive || false) : null;
    const navRoot = params.navRoot;
    const folderNav = isExplorerMode ? useFolderNavigation(folderPath, isActive || false, navRoot, sortBy, sortOrder) : null;

    // Callbacks
    const handleRestorationComplete = useCallback(() => {
        if (tabId) {
            useTabStore.getState().completeRestoration(tabId);
        }
    }, [tabId]);

    const handleScrollPositionChange = useCallback((scrollTop: number) => {
        updateTabState({ scrollPosition: scrollTop });
    }, [updateTabState]);

    // Use custom hook for history management
    const { saveProgress: saveProgressHook } = useViewerHistory({
        currentFolder: viewerState.currentFolder,
        images: viewerState.images,
        currentIndex: viewerState.currentIndex,
        scrollPosition: tabState?.scrollPosition || 0,
        isNoHistorySession,
        verticalWidth: viewerState.currentVerticalWidth,
    });

    // Ref para trackear el estado actual
    const currentStateRef = useRef({
        folderPath: viewerState.currentFolder?.path || '',
        currentIndex: viewerState.currentIndex,
        scrollPosition: 0,
        isNoHistorySession
    });

    // Actualizar ref cuando cambien los valores
    useEffect(() => {
        currentStateRef.current = {
            folderPath: viewerState.currentFolder?.path || '',
            currentIndex: viewerState.currentIndex,
            scrollPosition: tabState?.scrollPosition || 0,
            isNoHistorySession
        };
    }, [viewerState.currentFolder, viewerState.currentIndex, tabState?.scrollPosition, isNoHistorySession]);

    // Guardar progreso con el estado del ref
    const saveProgress = useCallback(async () => {
        const state = currentStateRef.current;
        if (!state.folderPath || state.isNoHistorySession) return;

        const historyScrollPos = state.scrollPosition >= 0 && state.scrollPosition <= 1 ? state.scrollPosition : 0;

        try {
            await saveProgressHook(historyScrollPos);
        } catch (error) {
            console.error('[ViewerPage] Failed to save progress:', error);
        }
    }, [saveProgressHook]);

    // Use folder loading hook - DEBE estar después de saveProgress
    const { isLoading: folderLoading } = useViewerFolderLoading({
        folderPath,
        tabId,
        isActive,
        params,
        isNoHistorySession,
        currentFolder: viewerState.currentFolder,
        images: viewerState.images,
        currentIndex: viewerState.currentIndex,
        resumeIndex: viewerState.resumeIndex,
        setResumeIndex: viewerState.setResumeIndex,
        setResumeScrollPos: viewerState.setResumeScrollPos,
        lastSyncedIndexRef: viewerState.lastSyncedIndexRef,
        updateTabState: viewerState.updateTabState,
        onRestorationComplete: handleRestorationComplete,
        saveProgress,
        sortBy,
        sortOrder,
    });

    // Use tab sync hook
    useViewerTabSync({
        tabId,
        isActive,
        folderPath,
        images: viewerState.images,
        resumeIndex: viewerState.resumeIndex,
        setResumeIndex: viewerState.setResumeIndex,
        setResumeScrollPos: viewerState.setResumeScrollPos,
        lastSyncedIndexRef: viewerState.lastSyncedIndexRef,
        lastProcessedParamsRef: viewerState.lastProcessedParamsRef,
    });

    // Use navigation seek hook
    useViewerNavigationSeek({
        tabId,
        isActive,
        folderPath,
        currentFolder: viewerState.currentFolder,
        images: viewerState.images,
        currentIndex: viewerState.currentIndex,
        resumeIndex: viewerState.resumeIndex,
        setResumeIndex: viewerState.setResumeIndex,
        setResumeScrollPos: viewerState.setResumeScrollPos,
        setResetKey: viewerState.setResetKey,
        lastProcessedParamsRef: viewerState.lastProcessedParamsRef,
        updateTabState: viewerState.updateTabState,
    });

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

    // Update session flag when navigation params change
    useEffect(() => {
        const noHistory = params.noHistory === 'true';
        console.log(`[ViewerPage] Updating isNoHistorySession for ${folderPath} to: ${noHistory}`);
        setIsNoHistorySession(noHistory);
    }, [folderPath, params.noHistory]);

    // Guardar antes de cerrar/recargar
    useEffect(() => {
        const handleBeforeUnload = () => {
            saveProgress();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [saveProgress]);

    // Toggle viewer mode (per-tab only, doesn't affect global default)
    const toggleMode = () => {
        const newMode = viewerState.mode === 'vertical' ? 'lateral' : 'vertical';
        updateTabState({ mode: newMode });
    };

// Chapter navigation handlers (series)
const handlePrevChapter = useCallback(async () => {
    if (chapterNav?.prevChapter) {
        await saveProgress();
        navigate('viewer', { folder: chapterNav.prevChapter.path, shallow: 'true', from: fromPage }, 'series');
    }
}, [chapterNav, navigate, saveProgress, fromPage]);

const handleNextChapter = useCallback(async () => {
    if (chapterNav?.nextChapter) {
        await saveProgress();
        navigate('viewer', { folder: chapterNav.nextChapter.path, shallow: 'true', from: fromPage }, 'series');
    }
}, [chapterNav, navigate, saveProgress, fromPage]);

// Folder navigation handlers (explorer)
const handlePrevFolder = useCallback(async () => {
    if (folderNav?.prevFolder) {
        await saveProgress();
        navigate('viewer', { folder: folderNav.prevFolder.path, shallow: 'true', from: fromPage, navRoot: params.navRoot, sortBy, sortOrder }, 'explorer');
    }
}, [folderNav, navigate, saveProgress, fromPage, params.navRoot, sortBy, sortOrder]);

const handleNextFolder = useCallback(async () => {
    if (folderNav?.nextFolder) {
        await saveProgress();
        navigate('viewer', { folder: folderNav.nextFolder.path, shallow: 'true', from: fromPage, navRoot: params.navRoot, sortBy, sortOrder }, 'explorer');
    }
}, [folderNav, navigate, saveProgress, fromPage, params.navRoot, sortBy, sortOrder]);

// Boundary handlers for automatic chapter/folder transition
const handleNextBoundary = useCallback(() => {
    saveProgress();
    if (!isExplorerMode && chapterNav?.nextChapter) {
        navigate('viewer', {
            folder: chapterNav.nextChapter.path,
            shallow: 'true',
            from: fromPage,
            startIndex: '0'
        }, 'series');
    } else if (isExplorerMode && folderNav?.nextFolder) {
        navigate('viewer', {
            folder: folderNav.nextFolder.path,
            shallow: 'true',
            from: fromPage,
            navRoot: params.navRoot,
            sortBy,
            sortOrder,
            startIndex: '0'
        }, 'explorer');
    }
}, [chapterNav, folderNav, navigate, saveProgress, fromPage, params.navRoot, sortBy, sortOrder, isExplorerMode]);

const handlePrevBoundary = useCallback(() => {
    saveProgress();
    if (!isExplorerMode && chapterNav?.prevChapter) {
        navigate('viewer', {
            folder: chapterNav.prevChapter.path,
            shallow: 'true',
            from: fromPage,
            endOfChapter: 'true'
        }, 'series');
    } else if (isExplorerMode && folderNav?.prevFolder) {
        navigate('viewer', {
            folder: folderNav.prevFolder.path,
            shallow: 'true',
            from: fromPage,
            navRoot: params.navRoot,
            sortBy,
            sortOrder,
            endOfChapter: 'true'
        }, 'explorer');
    }
}, [chapterNav, folderNav, navigate, saveProgress, fromPage, params.navRoot, sortBy, sortOrder, isExplorerMode]);

// Custom back handler - navigates to the last non-viewer entry in history to preserve params
const handleBack = useCallback(() => {
    // Walk backwards through history (skip current entry) to find the originating page
    const entries = history;
    for (let i = entries.length - 2; i >= 0; i--) {
        if (entries[i].page !== 'viewer') {
            navigate(entries[i].page as PageType, entries[i].params);
            return;
        }
    }
    navigate(fromPage as PageType, {});
}, [navigate, fromPage, history]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY });
    }, []);

    const handleCloseContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    const handleGoToStart = useCallback(async () => {
        viewerState.setResumeIndex(0);
        viewerState.lastSyncedIndexRef.current = 0;
        viewerState.setResumeScrollPos(0);
        viewerState.setResetKey((prev) => prev + 1);

        updateTabState({
            currentIndex: 0,
            scrollPosition: 0
        });

        // Save progress at start
        if (viewerState.currentFolder && !isNoHistorySession) {
            try {
                await AppAPI.addHistory({
                    folderPath: viewerState.currentFolder.path,
                    folderName: viewerState.currentFolder.name,
                    lastImage: viewerState.images[0]?.name || '',
                    lastImageIndex: 0,
                    scrollPosition: 0,
                    totalImages: viewerState.images.length,
                    lastRead: new Date().toISOString(),
                });
            } catch (error) {
                console.error('Failed to reset progress in history:', error);
            }
        }
    }, [viewerState, isNoHistorySession, updateTabState]);

    const hasChapterButtons = !!(
    isExplorerMode 
        ? (folderNav && (folderNav.prevFolder || folderNav.nextFolder)) 
        : (chapterNav && (chapterNav.prevChapter || chapterNav.nextChapter))
);

    // Loading state - usar folderLoading del hook
    if (folderLoading || viewerState.isLoading || (folderPath && viewerState.images.length === 0)) {
        return <ViewerLoadingState />;
    }

    // Empty state
    if (!viewerState.currentFolder || viewerState.images.length === 0) {
        return <ViewerEmptyState onBack={handleBack} />;
    }

    return (
        <div className="relative h-full w-full overflow-hidden" onContextMenu={handleContextMenu}>
            {/* Viewer */}
            <div className="relative h-full w-full">
                <ViewerContent
                    mode={viewerState.mode}
                    images={viewerState.images}
                    initialIndex={viewerState.resumeIndex}
                    initialScrollPosition={viewerState.resumeScrollPos > 0 ? viewerState.resumeScrollPos : undefined}
                    showControls={controls.showControls}
                    hasChapterButtons={hasChapterButtons}
                    isAutoScrolling={controls.isAutoScrolling}
                    scrollSpeed={scrollSpeed}
                    onAutoScrollStateChange={controls.setIsAutoScrolling}
                    onRestorationComplete={handleRestorationComplete}
                    onScrollPositionChange={handleScrollPositionChange}
                    onIndexChange={viewerState.handleIndexChange}
                    verticalWidth={viewerState.currentVerticalWidth}
                    onWidthChange={viewerState.handleWidthChange}
                    isActive={isActive}
                    onPageChange={saveProgress}
                    tabId={tabId}
                    onNextBoundary={handleNextBoundary}
                    onPrevBoundary={handlePrevBoundary}
                />
            </div>

            {/* Top control bar */}
            <ViewerControls
                folderName={viewerState.currentFolder.name}
                chapterNav={chapterNav}
                mode={viewerState.mode}
                showControls={controls.showControls}
                onBack={handleBack}
                onModeToggle={toggleMode}
                onThumbnails={() => navigate('thumbnails', { folder: viewerState.currentFolder!.path })}
                onGoToStart={handleGoToStart}
                onWidthSliderToggle={() => controls.setShowWidthSlider(!controls.showWidthSlider)}
                showWidthSlider={controls.showWidthSlider}
                verticalWidth={viewerState.currentVerticalWidth}
                onWidthChange={(width) => viewerState.handleWidthChange(width)}
                t={t}
            >
                {/* Auto-scroll controls (vertical mode only) */}
                {viewerState.mode === 'vertical' && (
                    <AutoScrollControls
                        isAutoScrolling={controls.isAutoScrolling}
                        scrollSpeed={scrollSpeed}
                        showSpeedSlider={controls.showSpeedSlider}
                        onToggle={() => controls.setIsAutoScrolling(!controls.isAutoScrolling)}
                        onSpeedSliderToggle={() => controls.setShowSpeedSlider(!controls.showSpeedSlider)}
                        onSpeedChange={setScrollSpeed}
                        t={t}
                    />
                )}
            </ViewerControls>

            {/* Click outside handler for speed slider */}
            {controls.showSpeedSlider && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => controls.setShowSpeedSlider(false)}
                />
            )}

            {/* Bottom navigation bar (chapter for series, folder for explorer) */}
            {(isExplorerMode && folderNav && (folderNav.prevFolder || folderNav.nextFolder)) || 
             (!isExplorerMode && chapterNav && (chapterNav.prevChapter || chapterNav.nextChapter)) ? (
                <ChapterNavigation
                    prevChapter={isExplorerMode ? folderNav?.prevFolder : chapterNav?.prevChapter}
                    nextChapter={isExplorerMode ? folderNav?.nextFolder : chapterNav?.nextChapter}
                    showControls={controls.showControls}
                    onPrevChapter={isExplorerMode ? handlePrevFolder : handlePrevChapter}
                    onNextChapter={isExplorerMode ? handleNextFolder : handleNextChapter}
                    t={t}
                />
            ) : null}

            {contextMenu && (
                <ContextMenu
                    position={{ x: contextMenu.x, y: contextMenu.y }}
                    onClose={handleCloseContextMenu}
                    items={[
                        {
                            id: 'play-pause',
                            label: controls.isAutoScrolling ? t('viewer.pause') : t('viewer.play'),
                            onClick: () => controls.setIsAutoScrolling(!controls.isAutoScrolling),
                        },
                        {
                            id: 'go-to-start',
                            label: t('viewer.goToStart'),
                            onClick: handleGoToStart,
                        },
                        {
                            id: 'go-back',
                            label: t('viewer.goBack'),
                            onClick: handleBack,
                        },
                    ]}
                />
            )}
        </div>
    );
}
