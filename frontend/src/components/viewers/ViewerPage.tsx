/**
 * ViewerPage - Main viewer page that manages vertical and lateral modes
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { VerticalViewer } from './VerticalViewer';
import { LateralViewer } from './LateralViewer';
import { useViewerStore } from '../../stores/viewerStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNavigationStore } from '../../stores/navigationStore';
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

interface ViewerPageProps {
    folderPath?: string;
}

export function ViewerPage({ folderPath }: ViewerPageProps) {
    const { t } = useTranslation();
    const { goBack, navigate } = useNavigationStore();
    const { viewerMode, setViewerMode, verticalWidth, setVerticalWidth } = useSettingsStore();
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

    // Load folder and images
    useEffect(() => {
        if (!folderPath) return;

        const loadFolder = async () => {
            setIsLoading(true);
            try {
                // @ts-ignore - Wails generated bindings
                const folderInfo = await window.go?.main?.App?.GetFolderInfo(folderPath);
                // @ts-ignore - Wails generated bindings
                const imageList = await window.go?.main?.App?.GetImages(folderPath);

                if (folderInfo) {
                    setCurrentFolder(folderInfo as FolderInfo);
                }
                if (imageList) {
                    setImages(imageList as ImageInfo[]);
                }
            } catch (error) {
                console.error('Failed to load folder:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadFolder();
    }, [folderPath, setCurrentFolder, setImages, setIsLoading]);

    // Sync viewer mode with settings
    useEffect(() => {
        setMode(viewerMode);
    }, [viewerMode, setMode]);

    // Save reading progress
    const saveProgress = useCallback(async () => {
        if (!currentFolder || images.length === 0) return;

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
    }, [currentFolder, images, currentIndex]);

    // Save progress when leaving
    useEffect(() => {
        return () => {
            saveProgress();
        };
    }, [saveProgress]);

    // Auto-hide controls
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;

        const handleMouseMove = () => {
            setShowControls(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setShowControls(false), 3000);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            clearTimeout(timeout);
        };
    }, []);

    // Toggle viewer mode
    const toggleMode = () => {
        const newMode = mode === 'vertical' ? 'lateral' : 'vertical';
        setMode(newMode);
        setViewerMode(newMode);
    };

    if (isLoading) {
        return (
            <div
                className="flex items-center justify-center h-full"
                style={{ backgroundColor: 'var(--color-surface-primary)' }}
            >
                <motion.div
                    className="flex flex-col items-center gap-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <motion.div
                        className="w-16 h-16 border-4 rounded-full"
                        style={{
                            borderColor: 'var(--color-accent)',
                            borderTopColor: 'transparent',
                        }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                        {t('common.loading')}
                    </span>
                </motion.div>
            </div>
        );
    }

    if (!currentFolder || images.length === 0) {
        return (
            <div
                className="flex flex-col items-center justify-center h-full gap-4"
                style={{ backgroundColor: 'var(--color-surface-primary)' }}
            >
                <motion.div
                    className="text-6xl"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                >
                    📂
                </motion.div>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                    {t('errors.noImages')}
                </span>
                <motion.button
                    onClick={goBack}
                    className="btn-primary"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {t('common.back')}
                </motion.button>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full overflow-hidden">
            {/* Viewer */}
            <AnimatePresence mode="wait">
                {mode === 'vertical' ? (
                    <motion.div
                        key="vertical"
                        className="h-full w-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <VerticalViewer
                            images={images}
                            onScrollPositionChange={saveProgress}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="lateral"
                        className="h-full w-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <LateralViewer
                            images={images}
                            onPageChange={saveProgress}
                            initialIndex={currentIndex}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top control bar */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 z-50"
                        style={{
                            background: 'linear-gradient(to bottom, var(--color-surface-overlay), transparent)',
                        }}
                    >
                        {/* Left side */}
                        <div className="flex items-center gap-2">
                            <motion.button
                                onClick={goBack}
                                className="btn-icon btn-ghost"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title={t('common.back')}
                            >
                                <BackIcon />
                            </motion.button>
                            <span
                                className="text-sm font-medium truncate max-w-xs"
                                style={{ color: 'var(--color-text-primary)' }}
                            >
                                {currentFolder.name}
                            </span>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-2">
                            {/* Width slider (vertical mode only) */}
                            {mode === 'vertical' && (
                                <div className="relative">
                                    <motion.button
                                        onClick={() => setShowWidthSlider(!showWidthSlider)}
                                        className="btn-icon btn-ghost"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        title={t('viewer.width')}
                                    >
                                        <span className="text-xs font-bold">{verticalWidth}%</span>
                                    </motion.button>

                                    <AnimatePresence>
                                        {showWidthSlider && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute top-full right-0 mt-2 p-4 rounded-lg"
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
                                                    className="w-32"
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Thumbnails */}
                            <motion.button
                                onClick={() => navigate('thumbnails', { folder: currentFolder.path })}
                                className="btn-icon btn-ghost"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title={t('viewer.thumbnails')}
                            >
                                <GridIcon />
                            </motion.button>

                            {/* Toggle mode */}
                            <motion.button
                                onClick={toggleMode}
                                className="btn-icon btn-ghost"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title={mode === 'vertical' ? t('viewer.lateral') : t('viewer.vertical')}
                            >
                                {mode === 'vertical' ? <LateralIcon /> : <VerticalIcon />}
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ViewerPage;
