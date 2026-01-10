import { useEffect, useState, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useTranslation } from 'react-i18next';
import { useViewerStore } from '../../stores/viewerStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useKeyboardNav } from '../../hooks/useKeyboardNav';
import { Tooltip } from '../common/Tooltip';

interface LateralViewerProps {
    images: Array<{
        path: string;
        name: string;
        index: number;
        imageUrl?: string;
        thumbnailUrl?: string;
    }>;
    onPageChange?: (index: number) => void;
    initialIndex?: number;
    showControls?: boolean;
    hasChapterButtons?: boolean;
}

export function LateralViewer({
    images,
    onPageChange,
    initialIndex = 0,
    showControls = false,
    hasChapterButtons = false,
}: LateralViewerProps) {
    const [loadedImages, setLoadedImages] = useState<Record<number, string>>({});
    const [direction, setDirection] = useState(0); // -1 for prev, 1 for next
    const { lateralMode, readingDirection } = useSettingsStore();
    const { currentIndex, setCurrentIndex } = useViewerStore();

    // Enable keyboard navigation
    useKeyboardNav({ enabled: true });

    // Initialize current index
    useEffect(() => {
        setCurrentIndex(initialIndex);
    }, [initialIndex, setCurrentIndex]);

    // Load image
    const loadImage = useCallback(async (index: number, path: string) => {
        if (loadedImages[index] || index < 0 || index >= images.length) return;

        try {
            const imageUrl = images[index]?.imageUrl || `/images?path=${encodeURIComponent(path)}`;
            setLoadedImages((prev) => ({ ...prev, [index]: imageUrl }));
        } catch (error) {
            console.error(`Failed to load image ${path}:`, error);
        }
    }, [loadedImages, images.length]);

    // Preload current, previous, and next images
    useEffect(() => {
        const indicesToLoad = [
            currentIndex - 1,
            currentIndex,
            currentIndex + 1,
        ];

        if (lateralMode === 'double') {
            indicesToLoad.push(currentIndex + 2, currentIndex - 2);
        }

        indicesToLoad.forEach((index) => {
            if (index >= 0 && index < images.length) {
                loadImage(index, images[index].path);
            }
        });
    }, [currentIndex, images, loadImage, lateralMode]);

    // Handle page navigation
    const goToPage = useCallback((newIndex: number) => {
        if (newIndex < 0 || newIndex >= images.length) return;

        setDirection(newIndex > currentIndex ? 1 : -1);
        setCurrentIndex(newIndex);
        onPageChange?.(newIndex);
    }, [currentIndex, images.length, setCurrentIndex, onPageChange]);

    const handlePrev = useCallback(() => {
        const step = lateralMode === 'double' ? 2 : 1;
        const newIndex = readingDirection === 'rtl'
            ? Math.min(currentIndex + step, images.length - 1)
            : Math.max(currentIndex - step, 0);
        goToPage(newIndex);
    }, [currentIndex, lateralMode, readingDirection, images.length, goToPage]);

    const handleNext = useCallback(() => {
        const step = lateralMode === 'double' ? 2 : 1;
        const newIndex = readingDirection === 'rtl'
            ? Math.max(currentIndex - step, 0)
            : Math.min(currentIndex + step, images.length - 1);
        goToPage(newIndex);
    }, [currentIndex, lateralMode, readingDirection, images.length, goToPage]);

    // Handle click navigation (left/right side of image)
    const handleClick = useCallback((e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const isLeftSide = x < rect.width / 2;

        if (isLeftSide) {
            handlePrev();
        } else {
            handleNext();
        }
    }, [handlePrev, handleNext]);

    // Get images to display (1 or 2 based on mode)
    const displayImages = lateralMode === 'double'
        ? [images[currentIndex], images[currentIndex + 1]].filter(Boolean)
        : [images[currentIndex]].filter(Boolean);

    return (
        <div
            className="relative h-full w-full flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            {/* Navigation buttons */}
            <NavigationButton
                direction="prev"
                onClick={handlePrev}
                disabled={readingDirection === 'rtl'
                    ? currentIndex >= images.length - 1
                    : currentIndex <= 0
                }
            />

            {/* Image display area */}
            <div
                className="flex-1 h-full flex items-center justify-center cursor-pointer"
                onClick={handleClick}
            >
                <div
                    key={currentIndex}
                    className={`h-full flex items-center justify-center gap-2 animate-fade-in ${lateralMode === 'double' ? 'flex-row' : ''
                        }`}
                >
                    {displayImages.map((image, idx) => {
                        const imageIndex = currentIndex + idx;
                        const loadedSrc = loadedImages[imageIndex];

                        return (
                            <TransformWrapper
                                key={imageIndex}
                                initialScale={1}
                                minScale={0.5}
                                maxScale={5}
                                doubleClick={{ mode: 'reset' }}
                                wheel={{ step: 0.1 }}
                            >
                                <TransformComponent
                                    wrapperStyle={{
                                        width: lateralMode === 'double' ? '50%' : '100%',
                                        height: '100%',
                                    }}
                                    contentStyle={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {loadedSrc ? (
                                        <img
                                            src={loadedSrc}
                                            alt={image.name}
                                            className="max-h-full max-w-full object-contain"
                                            draggable={false}
                                            onError={(e) => {
                                                // Fallback if imageUrl fails
                                                const target = e.currentTarget;
                                                if (target.src !== `/images?path=${encodeURIComponent(image.path)}`) {
                                                    target.src = `/images?path=${encodeURIComponent(image.path)}`;
                                                }
                                            }}
                                        />
                                    ) : (
                                        <div
                                            className="flex items-center justify-center shimmer"
                                            style={{
                                                width: '60%',
                                                height: '80%',
                                                backgroundColor: 'var(--color-surface-secondary)',
                                                borderRadius: 'var(--radius-lg)',
                                            }}
                                        >
                                            <div
                                                className="w-8 h-8 border-2 rounded-full animate-spin"
                                                style={{
                                                    borderColor: 'var(--color-accent)',
                                                    borderTopColor: 'transparent',
                                                }}
                                            />
                                        </div>
                                    )}
                                </TransformComponent>
                            </TransformWrapper>
                        );
                    })}
                </div>
            </div>

            <NavigationButton
                direction="next"
                onClick={handleNext}
                disabled={readingDirection === 'rtl'
                    ? currentIndex <= 0
                    : currentIndex >= images.length - 1
                }
            />

            {/* Page indicator */}
            <div
                className="absolute left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium shadow-lg z-[60] animate-slide-up"
                style={{
                    bottom: (showControls && hasChapterButtons) ? '6.5rem' : '2rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(12px)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    transition: 'bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                {lateralMode === 'double' && currentIndex + 1 < images.length
                    ? `${currentIndex + 1}-${currentIndex + 2}`
                    : currentIndex + 1}{' '}
                / {images.length}
            </div>
        </div>
    );
}

// Navigation button component
interface NavigationButtonProps {
    direction: 'prev' | 'next';
    onClick: () => void;
    disabled: boolean;
}

function NavigationButton({ direction, onClick, disabled }: NavigationButtonProps) {
    const { t } = useTranslation();
    const isPrev = direction === 'prev';
    const tooltipContent = isPrev ? (t('shortcuts.prevPage') || 'Previous Page') : (t('shortcuts.nextPage') || 'Next Page');

    return (
        <div className="absolute z-20" style={{ [isPrev ? 'left' : 'right']: '1rem' }}>
            <Tooltip content={tooltipContent} placement={isPrev ? 'right' : 'left'}>
                <button
                    onClick={onClick}
                    disabled={disabled}
                    className="flex items-center justify-center w-12 h-24 rounded-lg transition-all hover:scale-105 hover:bg-accent active:scale-95"
                    style={{
                        backgroundColor: 'var(--color-surface-overlay)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border)',
                        opacity: disabled ? 0.3 : 1,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ transform: isPrev ? 'none' : 'rotate(180deg)' }}
                    >
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
            </Tooltip>
        </div>
    );
}

export default LateralViewer;
