/**
 * AutoScrollControls - Controls for auto-scrolling in vertical mode
 */

import { Tooltip } from '../../components/ui/Tooltip';

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

interface AutoScrollControlsProps {
    isAutoScrolling: boolean;
    scrollSpeed: number;
    showSpeedSlider: boolean;
    onToggle: () => void;
    onSpeedSliderToggle: () => void;
    onSpeedChange: (speed: number) => void;
    t: (key: string) => string;
}

export function AutoScrollControls({
    isAutoScrolling,
    scrollSpeed,
    showSpeedSlider,
    onToggle,
    onSpeedSliderToggle,
    onSpeedChange,
    t,
}: AutoScrollControlsProps) {
    return (
        <>
            {/* Play/Pause button */}
            <div className="relative z-20">
                <Tooltip content={isAutoScrolling ? t('viewer.pause') : t('viewer.play')} placement="bottom">
                    <button
                        onClick={onToggle}
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
                            onClick={onSpeedSliderToggle}
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
                                onChange={(e) => onSpeedChange(Number(e.target.value))}
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
        </>
    );
}
