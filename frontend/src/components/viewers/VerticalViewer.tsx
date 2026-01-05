/**
 * VerticalViewer - Native scroll vertical image viewer
 */

import { useEffect, useRef, useCallback, useState } from 'react';

import { useViewerStore } from '../../stores/viewerStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface VerticalViewerProps {
    images: Array<{
        path: string;
        name: string;
        index: number;
        imageUrl?: string;
        thumbnailUrl?: string;
    }>;
    onScrollPositionChange?: (position: number) => void;
    initialScrollPosition?: number;
    initialIndex?: number;
    showControls?: boolean;
    hasChapterButtons?: boolean;
}

export function VerticalViewer({
    images,
    onScrollPositionChange,
    initialScrollPosition = 0,
    initialIndex = 0,
    showControls = false,
    hasChapterButtons = false,
}: VerticalViewerProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const { verticalWidth } = useSettingsStore();
    const { setScrollPosition, setCurrentIndex } = useViewerStore();

    // State to track if initial scroll has been applied
    const [hasAppliedInitialScroll, setHasAppliedInitialScroll] = useState(false);

    // Track intersection to update current index
    useEffect(() => {
        if (!parentRef.current) return;

        const observerOptions = {
            root: parentRef.current,
            rootMargin: '-10% 0px -10% 0px', // Trigger when image is roughly in the middle 80%
            threshold: [0, 0.1, 0.5]
        };

        const observer = new IntersectionObserver((entries) => {
            let mostVisible: IntersectionObserverEntry | undefined;

            for (const entry of entries) {
                if (entry.isIntersecting) {
                    if (!mostVisible || entry.intersectionRatio > mostVisible.intersectionRatio) {
                        mostVisible = entry;
                    }
                }
            }

            if (mostVisible) {
                const target = mostVisible.target as HTMLElement;
                const index = target.dataset.index;
                if (index) {
                    setCurrentIndex(parseInt(index));
                }
            }
        }, observerOptions);

        // Observe all image containers
        const currentRefs = itemRefs.current;
        Object.values(currentRefs).forEach(ref => {
            if (ref) observer.observe(ref);
        });

        return () => {
            observer.disconnect();
        };
    }, [images.length, setCurrentIndex]);

    // Handle initial scroll/resume
    useEffect(() => {
        if (!parentRef.current || hasAppliedInitialScroll || images.length === 0) return;

        const timer = setTimeout(() => {
            if (initialIndex > 0 && initialIndex < images.length) {
                const target = itemRefs.current[initialIndex];
                if (target) {
                    console.log(`[VerticalViewer] Scrolling to initial index: ${initialIndex}`);
                    target.scrollIntoView({ block: 'start' });
                }
            } else if (initialScrollPosition > 0) {
                const node = parentRef.current;
                if (node) {
                    const { scrollHeight, clientHeight } = node;
                    const scrollTop = initialScrollPosition * (scrollHeight - clientHeight);
                    node.scrollTop = scrollTop;
                }
            }
            setHasAppliedInitialScroll(true);
        }, 100); // Small delay to ensure DOM is ready

        return () => clearTimeout(timer);
    }, [initialIndex, initialScrollPosition, images.length, hasAppliedInitialScroll]);

    // Track scroll for progress bar
    const handleScroll = useCallback(() => {
        if (!parentRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
        const position = scrollTop / (scrollHeight - clientHeight || 1);
        setScrollPosition(position);
        onScrollPositionChange?.(position);
    }, [setScrollPosition, onScrollPositionChange]);

    // Handle wheel zoom (Pinch to zoom usually maps to Ctrl+Wheel)
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY * -0.05;
            const newWidth = Math.min(Math.max(verticalWidth + delta, 10), 100);
            if (Math.abs(newWidth - verticalWidth) > 0.5) {
                useSettingsStore.getState().setVerticalWidth(Math.round(newWidth));
            }
        }
    }, [verticalWidth]);

    return (
        <div
            ref={parentRef}
            className="h-full w-full overflow-y-auto"
            onScroll={handleScroll}
            onWheel={handleWheel}
            style={{
                backgroundColor: 'var(--color-surface-primary)',
                overflowX: 'hidden',
                scrollBehavior: hasAppliedInitialScroll ? 'smooth' : 'auto'
            }}
        >
            <div className="flex flex-col items-center w-full py-8 gap-4">
                {images.map((image, index) => (
                    <div
                        key={`${image.path}-${index}`}
                        ref={el => itemRefs.current[index] = el}
                        data-index={index}
                        className="flex justify-center w-full min-h-[200px]"
                        style={{ width: '100%' }}
                    >
                        <div
                            style={{
                                width: `${verticalWidth}%`,
                                maxWidth: '100%',
                                transition: 'width 0.2s ease-out'
                            }}
                            className="relative"
                        >
                            <img
                                src={image.imageUrl || `/images?path=${encodeURIComponent(image.path)}`}
                                alt={image.name}
                                loading="lazy"
                                className="w-full h-auto shadow-2xl rounded-lg bg-zinc-900/50"
                                onLoad={() => {
                                    // If we just loaded the initial index image, ensure we are still there
                                    if (index === initialIndex && !hasAppliedInitialScroll) {
                                        itemRefs.current[index]?.scrollIntoView({ block: 'start' });
                                    }
                                }}
                            />
                            <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white/50 opacity-0 hover:opacity-100 transition-opacity">
                                Page {index + 1}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Image counter */}
            <div
                className="fixed left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium z-[60] pointer-events-none shadow-lg animate-slide-up"
                style={{
                    bottom: (showControls && hasChapterButtons) ? '6.5rem' : '2rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(12px)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    transition: 'bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                {useViewerStore((state) => state.currentIndex) + 1} / {images.length}
            </div>
        </div>
    );
}

export default VerticalViewer;
