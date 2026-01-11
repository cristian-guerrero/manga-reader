/**
 * ViewerPage - Main viewer page that manages vertical and lateral modes
 * Refactored to use custom hooks for better separation of concerns
 */

import { useEffect, useCallback, useState } from 'react';
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
    useViewerHistory,
} from './hooks';

interface ViewerPageProps {
    folderPath?: string;
    isActive?: boolean;
    tabId?: string;
}

export function ViewerPage({ folderPath, isActive = true, tabId }: ViewerPageProps) {
    const { t } = useTranslation();
    const { goBack, navigate, params } = useNavigation();
    const { viewerMode, setViewerMode, scrollSpeed, setScrollSpeed } = useSettingsStore();
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

    // Use custom hook for chapter navigation
    const chapterNav = useChapterNavigation(folderPath, isActive || false);

    // Callbacks
    const handleRestorationComplete = useCallback(() => {
        if (tabId) {
            useTabStore.getState().completeRestoration(tabId);
        }
    }, [tabId]);

    // Use custom hook for history management
    const { saveProgress: saveProgressHook } = useViewerHistory({
        currentFolder: viewerState.currentFolder,
        images: viewerState.images,
        currentIndex: viewerState.currentIndex,
        scrollPosition: tabState?.scrollPosition || 0,
        isNoHistorySession,
    });

    // Wrapper to maintain compatibility with existing code
    const saveProgress = useCallback(async () => {
        if (!viewerState.currentFolder || viewerState.images.length === 0) return;
        if (isNoHistorySession) return;

        // Get scroll position from tabState (single source of truth)
        const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
        const storePos = tab?.viewerState?.scrollPosition ?? 0;
        const historyScrollPos = storePos >= 0 && storePos <= 1 ? storePos : 0;

        // Update tab state with scroll position before saving
        updateTabState({ scrollPosition: historyScrollPos });

        // Use the hook's saveProgress
        await saveProgressHook(historyScrollPos);
    }, [viewerState.currentFolder, viewerState.images, viewerState.currentIndex, isNoHistorySession, tabId, updateTabState, saveProgressHook]);

    // Use folder loading hook
    useViewerFolderLoading({
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
        currentScrollTopRef: viewerState.currentScrollTopRef,
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

    // Sync viewer mode with settings
    useEffect(() => {
        if (isActive) {
            updateTabState({ mode: viewerMode });
        }
    }, [viewerMode, isActive, updateTabState]);

    // Save progress when leaving
    useEffect(() => {
        return () => {
            saveProgress();
        };
    }, [saveProgress]);

    // Toggle viewer mode
    const toggleMode = () => {
        const newMode = viewerState.mode === 'vertical' ? 'lateral' : 'vertical';
        updateTabState({ mode: newMode });
        setViewerMode(newMode);
    };

    // Chapter navigation handlers
    const handlePrevChapter = useCallback(async () => {
        if (chapterNav?.prevChapter) {
            await saveProgress();
            navigate('viewer', { folder: chapterNav.prevChapter.path }, 'series');
        }
    }, [chapterNav, navigate, saveProgress]);

    const handleNextChapter = useCallback(async () => {
        if (chapterNav?.nextChapter) {
            await saveProgress();
            navigate('viewer', { folder: chapterNav.nextChapter.path }, 'series');
        }
    }, [chapterNav, navigate, saveProgress]);

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

    const hasChapterButtons = !!(chapterNav && (chapterNav.prevChapter || chapterNav.nextChapter));

    // Loading state
    if (viewerState.isLoading || (folderPath && viewerState.images.length === 0)) {
        return <ViewerLoadingState />;
    }

    // Empty state
    if (!viewerState.currentFolder || viewerState.images.length === 0) {
        return <ViewerEmptyState onBack={goBack} />;
    }

    return (
        <div className="relative h-full w-full overflow-hidden">
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
                    onIndexChange={viewerState.handleIndexChange}
                    onScrollPositionChange={viewerState.handleScrollPositionChange}
                    verticalWidth={viewerState.currentVerticalWidth}
                    onWidthChange={viewerState.handleWidthChange}
                    isActive={isActive}
                    resetKey={viewerState.resetKey}
                    folderPath={viewerState.currentFolder.path}
                    onPageChange={saveProgress}
                    tabId={tabId}
                />
            </div>

            {/* Top control bar */}
            <ViewerControls
                folderName={viewerState.currentFolder.name}
                chapterNav={chapterNav}
                mode={viewerState.mode}
                showControls={controls.showControls}
                onBack={goBack}
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

            {/* Bottom chapter navigation bar */}
            <ChapterNavigation
                prevChapter={chapterNav?.prevChapter}
                nextChapter={chapterNav?.nextChapter}
                showControls={controls.showControls}
                onPrevChapter={handlePrevChapter}
                onNextChapter={handleNextChapter}
                t={t}
            />
        </div>
    );
}

export default ViewerPage;
