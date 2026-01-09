/**
 * ViewerPage - Main viewer page that manages vertical and lateral modes
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { VerticalViewer } from './VerticalViewer';
import { LateralViewer } from './LateralViewer';
import { useViewerStore } from '../../stores/viewerStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { Tooltip } from '../common/Tooltip';
import { ImageInfo, FolderInfo } from '../../types';

// Icons
const VerticalIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <line x1="6" y1="9" x2="18" y2="9" />
        <line x1="6" y1="15" x2="18" y2="15" />
    </svg>
);

const LateralIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <line x1="12" y1="5" x2="12" y2="19" />
    </svg>
);

const BackIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
    </svg>
);

const GridIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
    </svg>
);

const SettingsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.85 1 1.51 1H21a2 2 0 0 1 0 4h-.09c-.66 0-1.25.39-1.51 1z" />
    </svg>
);

const ChevronLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

const SkipBackIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 19V5M5 12l7-7 7 7" />
        <line x1="5" y1="2" x2="19" y2="2" />
    </svg>
);

const PlayIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
);

const PauseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
    </svg>
);

interface ViewerPageProps {
    folderPath?: string;
}

export function ViewerPage({ folderPath }: ViewerPageProps) {
    const { t } = useTranslation();
    const { goBack, navigate } = useNavigationStore();
    const { viewerMode, setViewerMode, verticalWidth, setVerticalWidth, scrollSpeed, setScrollSpeed } = useSettingsStore();
    const {
        currentFolder,
        setCurrentFolder,
        images,
        setImages,
        isLoading,
        setIsLoading,
        mode,
        setMode,
        currentIndex,
    } = useViewerStore();

    const [showControls, setShowControls] = useState(true);
    const [showWidthSlider, setShowWidthSlider] = useState(false);
    // Local state for resume position - avoids timing issues with store
    const [resumeIndex, setResumeIndex] = useState(0);
    const [resumeScrollPos, setResumeScrollPos] = useState(0);
    const [resetKey, setResetKey] = useState(0);
    const controlsTimeoutRef = useRef<any>(null);
    // Auto-scroll state
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const [showSpeedSlider, setShowSpeedSlider] = useState(false);
    // Session flag state that can be updated during component reuse
    const [isNoHistorySession, setIsNoHistorySession] = useState(useNavigationStore.getState().params.noHistory === 'true');
    // Chapter navigation state for series
    const [chapterNav, setChapterNav] = useState<{
        prevChapter?: { path: string; name: string };
        nextChapter?: { path: string; name: string };
        seriesName?: string;
        chapterIndex?: number;
        totalChapters?: number;
    } | null>(null);

    // Update session flag when navigation params change (handles component reuse)
    useEffect(() => {
        const noHistory = useNavigationStore.getState().params.noHistory === 'true';
        console.log(`[ViewerPage] Updating isNoHistorySession for ${folderPath} to: ${noHistory}`);
        setIsNoHistorySession(noHistory);
    }, [folderPath]);

    // Load folder and images
    useEffect(() => {
        if (!folderPath) return;

        const loadFolder = async () => {
            // Save current progress before switching if not a no-history session
            if (currentFolder && !isNoHistorySession) {
                await saveProgress();
            }

            setIsLoading(true);
            try {
                // Check if we should use shallow loading (non-recursive)
                const navParams = useNavigationStore.getState().params;
                const useShallow = navParams && navParams.shallow === 'true';
                
                // @ts-ignore
                const folderInfo = useShallow
                    ? await window.go?.main?.App?.GetFolderInfoShallow(folderPath)
                    : await window.go?.main?.App?.GetFolderInfo(folderPath);
                
                // @ts-ignore
                const imageList = useShallow 
                    ? await window.go?.main?.App?.GetImagesShallow(folderPath)
                    : await window.go?.main?.App?.GetImages(folderPath);

                // Fetch history for this folder
                // @ts-ignore
                const historyEntry = await window.go?.main?.App?.GetHistoryEntry(folderPath);

                if (folderInfo) {
                    setCurrentFolder(folderInfo as FolderInfo);
                }
                if (imageList) {
                    // Update images
                    // Important: setImages resets index to 0 usually, so we need to override if history exists
                    // We need a way to set images AND index atomically or sequentially without trigger saveProgress(0)

                    const imgs = imageList as ImageInfo[];
                    let targetIndex = 0;
                    let targetScroll = 0;

                    // Check for explicit start index from navigation params (e.g. from Thumbnails)
                    const navParams = useNavigationStore.getState().params;
                    const explicitStartIndex = navParams && navParams.startIndex ? parseInt(navParams.startIndex, 10) : -1;

                    if (explicitStartIndex >= 0 && explicitStartIndex < imgs.length) {
                        targetIndex = explicitStartIndex;
                        console.log(`[ViewerPage] Starting from requested index: ${targetIndex}`);
                    } else if (historyEntry) {
                        // Fallback to history if no explicit start index
                        if (historyEntry.lastImageIndex < imgs.length) {
                            targetIndex = historyEntry.lastImageIndex;
                            console.log(`[ViewerPage] Resuming from history index: ${targetIndex}`);
                        }
                        if (historyEntry.scrollPosition > 0) {
                            targetScroll = historyEntry.scrollPosition;
                            console.log(`[ViewerPage] Resuming from scroll position: ${targetScroll}`);
                        }
                    }

                    // Set local state FIRST before store update
                    console.log(`[ViewerPage] Setting resumeIndex=${targetIndex}, resumeScrollPos=${targetScroll}`);
                    setResumeIndex(targetIndex);
                    setResumeScrollPos(targetScroll);

                    // Update store with new images and index
                    useViewerStore.setState({
                        images: imgs,
                        currentIndex: targetIndex,
                        scrollPosition: targetScroll,
                        currentFolder: folderInfo as FolderInfo,
                        isLoading: false
                    });
                    // setIsLoading(false) moved here implicitly by store update? No, local state.
                }

                // Fetch chapter navigation info (for series)
                // @ts-ignore
                const navInfo = await window.go?.main?.App?.GetChapterNavigation(folderPath);
                if (navInfo) {
                    console.log(`[ViewerPage] Chapter navigation found:`, navInfo);
                    setChapterNav(navInfo);
                } else {
                    setChapterNav(null);
                }

            } catch (error) {
                console.error('Failed to load folder:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadFolder();
        // loadFolder(); // Removed duplicate call
    }, [folderPath]); // Removed other dependencies to avoid re-triggering loops


    // Initial history save when folder is loaded
    // Initial history save removed to prevent overwriting resume index
    // useEffect(() => {
    //     if (currentFolder && images.length > 0) {
    //         saveProgress();
    //     }
    // }, [currentFolder, images.length]);



    // Sync viewer mode with settings
    useEffect(() => {
        setMode(viewerMode);
    }, [viewerMode, setMode]);

    // Save reading progress
    const saveProgress = useCallback(async () => {
        if (!currentFolder || images.length === 0) return;

        if (isNoHistorySession) {
            return;
        }

        try {
            // @ts-ignore - Wails generated bindings
            await window.go?.main?.App?.AddHistory({
                id: '',
                folderPath: currentFolder.path,
                folderName: currentFolder.name,
                lastImage: images[currentIndex]?.name || '',
                lastImageIndex: currentIndex,
                scrollPosition: useViewerStore.getState().scrollPosition,
                totalImages: images.length,
                lastRead: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Failed to save progress:', error);
        }
    }, [currentFolder, images, currentIndex, isNoHistorySession]);

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
        setMode(newMode);
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
        setResumeScrollPos(0);
        setResetKey(prev => prev + 1);

        // Force store update to trigger re-renders in children
        useViewerStore.setState({
            currentIndex: 0,
            scrollPosition: 0
        });
        // Save progress at start
        if (currentFolder && !isNoHistorySession) {
            try {
                // @ts-ignore
                await window.go?.main?.App?.AddHistory({
                    id: '',
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

    if (isLoading) {
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
                            key={`${currentFolder.path}-${resumeIndex}-${resetKey}`}
                            images={images}
                            onScrollPositionChange={saveProgress}
                            initialIndex={resumeIndex}
                            initialScrollPosition={resumeScrollPos}
                            showControls={showControls}
                            hasChapterButtons={hasChapterButtons}
                            isAutoScrolling={isAutoScrolling}
                            scrollSpeed={scrollSpeed}
                            onAutoScrollStateChange={setIsAutoScrolling}
                        />
                    </div>
                ) : (
                    <div
                        key={`lateral-${currentFolder.path}-${resetKey}`}
                        className={`h-full w-full transition-opacity duration-300 ${mode === 'lateral' ? 'opacity-100' : 'opacity-0'}`}
                    >
                        <LateralViewer
                            key={`${currentFolder.path}-${resumeIndex}-${resetKey}`}
                            images={images}
                            onPageChange={saveProgress}
                            initialIndex={resumeIndex}
                            showControls={showControls}
                            hasChapterButtons={hasChapterButtons}
                        />
                    </div>
                )}
            </div>

            {/* Top control bar */}
            <div
                className={`absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 z-50 transition-all duration-300 ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
                    }`}
                style={{
                    background: 'linear-gradient(to bottom, var(--color-surface-overlay), transparent)',
                }}
            >
                {/* Left side */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="relative z-20">
                        <Tooltip content={t('common.back')} placement="bottom">
                            <button
                                onClick={goBack}
                                className="btn-icon btn-ghost hover:scale-110 active:scale-90 transition-transform"
                            >
                                <BackIcon />
                            </button>
                        </Tooltip>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span
                            className="text-sm font-medium truncate max-w-xs"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            {currentFolder.name}
                        </span>
                        {chapterNav && (
                            <span
                                className="text-xs truncate max-w-xs"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                {chapterNav.seriesName} • Cap. {(chapterNav.chapterIndex ?? 0) + 1}/{chapterNav.totalChapters}
                            </span>
                        )}
                    </div>
                </div>

                {/* Center - Auto-scroll controls (vertical mode only) */}
                {mode === 'vertical' && (
                    <div className="flex items-center gap-2 flex-shrink-0 px-4">
                        {/* Play/Pause button */}
                        <div className="relative z-20">
                            <Tooltip content={isAutoScrolling ? t('viewer.pause') : t('viewer.play')} placement="bottom">
                                <button
                                    onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                                    className="btn-icon btn-ghost hover:scale-110 active:scale-90 transition-transform"
                                >
                                    {isAutoScrolling ? <PauseIcon /> : <PlayIcon />}
                                </button>
                            </Tooltip>
                        </div>

                        {/* Speed slider */}
                        <div className="relative z-20">
                            <div className="relative">
                                <Tooltip content={t('viewer.scrollSpeed')} placement="bottom">
                                    <button
                                        onClick={() => setShowSpeedSlider(!showSpeedSlider)}
                                        className="btn-icon btn-ghost hover:scale-110 active:scale-90 transition-transform"
                                    >
                                        <span className="text-xs font-bold">{scrollSpeed}</span>
                                    </button>
                                </Tooltip>

                                {showSpeedSlider && (
                                    <div
                                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-4 rounded-lg animate-slide-down w-64 z-50"
                                        style={{
                                            backgroundColor: 'var(--color-surface-elevated)',
                                            border: '1px solid var(--color-border)',
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                                {t('viewer.scrollSpeed')}
                                            </span>
                                            <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                                {scrollSpeed}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={scrollSpeed}
                                            onChange={(e) => setScrollSpeed(Number(e.target.value))}
                                            className="w-full"
                                        />
                                        <div className="flex justify-between mt-2 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                                            <span>{t('viewer.slow')}</span>
                                            <span>{t('viewer.medium')}</span>
                                            <span>{t('viewer.fast')}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Right side */}
                <div className="flex items-center gap-2 flex-1 justify-end">
                    {/* Thumbnails */}
                    <div className="relative z-20">
                        <Tooltip content={t('viewer.thumbnails') || 'Thumbnails'} placement="bottom">
                            <button
                                onClick={() => navigate('thumbnails', { folder: currentFolder.path })}
                                className="btn-icon btn-ghost hover:scale-110 active:scale-90 transition-transform"
                            >
                                <GridIcon />
                            </button>
                        </Tooltip>
                    </div>

                    {/* Mode Toggle */}
                    <div className="relative z-20">
                        <Tooltip content={mode === 'vertical' ? t('viewer.lateral') : t('viewer.vertical')} placement="bottom">
                            <button
                                onClick={toggleMode}
                                className="btn-icon btn-ghost hover:scale-110 active:scale-90 transition-transform"
                            >
                                {mode === 'vertical' ? <LateralIcon /> : <VerticalIcon />}
                            </button>
                        </Tooltip>
                    </div>

                    {/* Go to Start */}
                    <div className="relative z-20">
                        <Tooltip content={t('viewer.goToStart') || 'Go to Start'} placement="bottom">
                            <button
                                onClick={handleGoToStart}
                                className="btn-icon btn-ghost hover:scale-110 active:scale-90 transition-transform"
                            >
                                <SkipBackIcon />
                            </button>
                        </Tooltip>
                    </div>

                    {/* Width slider (vertical mode only) */}
                    {mode === 'vertical' && (
                        <div className="relative z-20">
                            <div className="relative">
                                <Tooltip content={t('viewer.width')} placement="bottom">
                                    <button
                                        onClick={() => setShowWidthSlider(!showWidthSlider)}
                                        className="btn-icon btn-ghost hover:scale-110 active:scale-90 transition-transform"
                                    >
                                        <span className="text-xs font-bold">{verticalWidth}%</span>
                                    </button>
                                </Tooltip>

                                {showWidthSlider && (
                                    <div
                                        className="absolute top-full right-0 mt-2 p-4 rounded-lg animate-slide-down w-80 z-50"
                                        style={{
                                            backgroundColor: 'var(--color-surface-elevated)',
                                            border: '1px solid var(--color-border)',
                                        }}
                                    >
                                        <input
                                            type="range"
                                            min="30"
                                            max="100"
                                            value={verticalWidth}
                                            onChange={(e) => setVerticalWidth(Number(e.target.value))}
                                            className="w-full"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Click outside handler for speed slider */}
            {showSpeedSlider && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSpeedSlider(false)}
                />
            )}

            {/* Bottom chapter navigation bar */}
            {chapterNav && (chapterNav.prevChapter || chapterNav.nextChapter) && (
                <div
                    className={`absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-50 transition-all duration-300 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
                        }`}
                    style={{
                        background: 'linear-gradient(to top, var(--color-surface-overlay), transparent)',
                    }}
                >
                    {/* Previous chapter */}
                    <button
                        onClick={handlePrevChapter}
                        disabled={!chapterNav.prevChapter}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 active:scale-95"
                        style={{
                            backgroundColor: chapterNav.prevChapter ? 'var(--color-surface-elevated)' : 'transparent',
                            color: chapterNav.prevChapter ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                            border: '1px solid var(--color-border)',
                            opacity: chapterNav.prevChapter ? 1 : 0.4,
                            cursor: chapterNav.prevChapter ? 'pointer' : 'not-allowed',
                        }}
                    >
                        <ChevronLeftIcon />
                        <div className="flex flex-col items-start">
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                {t('viewer.prevChapter')}
                            </span>
                            <span className="text-sm font-medium truncate max-w-[150px]">
                                {chapterNav.prevChapter?.name || '—'}
                            </span>
                        </div>
                    </button>

                    {/* Next chapter */}
                    <button
                        onClick={handleNextChapter}
                        disabled={!chapterNav.nextChapter}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 active:scale-95"
                        style={{
                            backgroundColor: chapterNav.nextChapter ? 'var(--color-surface-elevated)' : 'transparent',
                            color: chapterNav.nextChapter ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                            border: '1px solid var(--color-border)',
                            opacity: chapterNav.nextChapter ? 1 : 0.4,
                            cursor: chapterNav.nextChapter ? 'pointer' : 'not-allowed',
                        }}
                    >
                        <div className="flex flex-col items-end">
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                {t('viewer.nextChapter')}
                            </span>
                            <span className="text-sm font-medium truncate max-w-[150px]">
                                {chapterNav.nextChapter?.name || '—'}
                            </span>
                        </div>
                        <ChevronRightIcon />
                    </button>
                </div>
            )}
        </div>
    );
}

export default ViewerPage;
