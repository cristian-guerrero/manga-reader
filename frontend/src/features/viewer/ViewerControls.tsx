/**
 * ViewerControls - Top control bar for the viewer
 */

import { FolderInfo, ViewerMode } from '../../types';
import { Tooltip } from '../../components/ui/Tooltip';

// Icons
const BackIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
    </svg>
);

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

const GridIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
    </svg>
);

const SkipBackIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 19V5M5 12l7-7 7 7" />
        <line x1="5" y1="2" x2="19" y2="2" />
    </svg>
);

interface ChapterNavInfo {
    seriesName?: string;
    chapterIndex?: number;
    totalChapters?: number;
}

interface ViewerControlsProps {
    folderName: string;
    chapterNav?: ChapterNavInfo | null;
    mode: ViewerMode;
    showControls: boolean;
    onBack: () => void;
    onModeToggle: () => void;
    onThumbnails: () => void;
    onGoToStart: () => void;
    onWidthSliderToggle: () => void;
    showWidthSlider: boolean;
    verticalWidth: number;
    onWidthChange: (width: number) => void;
    t: (key: string) => string;
    children?: React.ReactNode; // For auto-scroll controls in vertical mode
}

export function ViewerControls({
    folderName,
    chapterNav,
    mode,
    showControls,
    onBack,
    onModeToggle,
    onThumbnails,
    onGoToStart,
    onWidthSliderToggle,
    showWidthSlider,
    verticalWidth,
    onWidthChange,
    t,
    children,
}: ViewerControlsProps) {
    return (
        <div
            className={`absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 z-50 transition-all duration-300 ${
                showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
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
                            onClick={onBack}
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
                        {folderName}
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
            {mode === 'vertical' && children && (
                <div className="flex items-center gap-2 flex-shrink-0 px-4">
                    {children}
                </div>
            )}

            {/* Right side */}
            <div className="flex items-center gap-2 flex-1 justify-end">
                {/* Thumbnails */}
                <div className="relative z-20">
                    <Tooltip content={t('viewer.thumbnails') || 'Thumbnails'} placement="bottom">
                        <button
                            onClick={onThumbnails}
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
                            onClick={onModeToggle}
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
                            onClick={onGoToStart}
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
                                    onClick={onWidthSliderToggle}
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
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                            {t('viewer.width')}
                                        </span>
                                        <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                            {verticalWidth}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="30"
                                        max="100"
                                        value={verticalWidth}
                                        onChange={(e) => onWidthChange(Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
