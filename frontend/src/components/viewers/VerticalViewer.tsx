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
    isAutoScrolling?: boolean;
    scrollSpeed?: number;
    onAutoScrollStateChange?: (isScrolling: boolean) => void;
}

export function VerticalViewer({
    images,
    onScrollPositionChange,
    initialScrollPosition = 0,
    initialIndex = 0,
    showControls = false,
    hasChapterButtons = false,
    isAutoScrolling = false,
    scrollSpeed = 50,
    onAutoScrollStateChange,
}: VerticalViewerProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const { verticalWidth } = useSettingsStore();
    const { setScrollPosition, setCurrentIndex } = useViewerStore();

    // State to track if initial scroll has been applied
    const [hasAppliedInitialScroll, setHasAppliedInitialScroll] = useState(false);
    // Track which initialIndex was applied so we can re-apply if it changes
    const appliedInitialIndexRef = useRef<number>(-1);

    // Auto-scroll state
    const animationFrameIdRef = useRef<number | null>(null);
    const lastScrollTimeRef = useRef<number>(0);
    const lastScrollTopRef = useRef<number>(0);
    const userScrollingRef = useRef<boolean>(false);

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
        if (!parentRef.current || images.length === 0) return;

        // Skip if we already applied THIS specific initialIndex
        // But re-apply if initialIndex changed (e.g., from 0 to 20)
        if (hasAppliedInitialScroll && appliedInitialIndexRef.current === initialIndex) return;

        // Apply scroll immediately via requestAnimationFrame (minimal delay, just wait for paint)
        const applyScroll = () => {
            if (initialIndex >= 0 && initialIndex < images.length) {
                const target = itemRefs.current[initialIndex];
                if (target) {
                    console.log(`[VerticalViewer] Scrolling to initial index: ${initialIndex}`);
                    target.scrollIntoView({ block: 'start', behavior: 'instant' });
                    appliedInitialIndexRef.current = initialIndex;
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
        };

        // Use double requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
            requestAnimationFrame(applyScroll);
        });
    }, [initialIndex, initialScrollPosition, images.length, hasAppliedInitialScroll]);

    // Convert scroll speed (0-100) to pixels per second
    // Range 0-33: 10-50 px/s (slow reading)
    // Range 34-66: 50-100 px/s (normal reading)
    // Range 67-100: 100-200 px/s (fast reading)
    // Minimum 10 px/s to ensure visible movement even at speed 0
    const getPixelsPerSecond = useCallback((speed: number): number => {
        if (speed <= 33) {
            // Slow: 10-50 px/s (ensuring minimum of 10 even at 0)
            return 10 + (speed / 33) * 40;
        } else if (speed <= 66) {
            // Normal: 50-100 px/s
            return 50 + ((speed - 33) / 33) * 50;
        } else {
            // Fast: 100-200 px/s
            return 100 + ((speed - 66) / 34) * 100;
        }
    }, []);

    // Auto-scroll logic
    useEffect(() => {
        if (!isAutoScrolling || !parentRef.current) {
            // Clean up animation frame if scrolling stopped
            if (animationFrameIdRef.current !== null) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
            return;
        }

        const pixelsPerSecond = getPixelsPerSecond(scrollSpeed);
        let lastTime = performance.now();
        let accumulatedScroll = 0; // Accumulate fractional pixels

        const scrollStep = (currentTime: number) => {
            if (!parentRef.current || !isAutoScrolling) {
                animationFrameIdRef.current = null;
                accumulatedScroll = 0;
                return;
            }

            const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
            lastTime = currentTime;

            const container = parentRef.current;
            const { scrollTop, scrollHeight, clientHeight } = container;

            // Check if we've reached the bottom
            const maxScroll = scrollHeight - clientHeight;
            if (scrollTop >= maxScroll - 1) {
                // Reached the end, stop auto-scrolling
                if (onAutoScrollStateChange) {
                    onAutoScrollStateChange(false);
                }
                animationFrameIdRef.current = null;
                accumulatedScroll = 0;
                return;
            }

            // Only scroll if user hasn't manually scrolled
            if (!userScrollingRef.current) {
                // Accumulate scroll delta to handle very small values
                accumulatedScroll += pixelsPerSecond * deltaTime;

                // Apply accumulated scroll when it reaches at least 0.5 pixels
                if (Math.abs(accumulatedScroll) >= 0.5) {
                    const scrollToApply = accumulatedScroll;
                    accumulatedScroll = 0; // Reset accumulator

                    const newScrollTop = Math.min(scrollTop + scrollToApply, maxScroll);
                    container.scrollTop = newScrollTop;
                    lastScrollTimeRef.current = currentTime; // Mark when we last scrolled via auto-scroll
                    lastScrollTopRef.current = newScrollTop;
                }
            } else {
                // Reset accumulator if user is scrolling manually
                accumulatedScroll = 0;
            }

            animationFrameIdRef.current = requestAnimationFrame(scrollStep);
        };

        animationFrameIdRef.current = requestAnimationFrame(scrollStep);
        lastScrollTimeRef.current = performance.now();

        return () => {
            if (animationFrameIdRef.current !== null) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
        };
    }, [isAutoScrolling, scrollSpeed, getPixelsPerSecond, onAutoScrollStateChange]);

    // Detect manual scrolling and pause auto-scroll
    useEffect(() => {
        if (!parentRef.current || !isAutoScrolling) return;

        const container = parentRef.current;
        let lastUserScrollTime = 0;
        let scrollTimeout: ReturnType<typeof setTimeout>;

        const handleManualScroll = () => {
            const currentTime = performance.now();
            const currentScrollTop = container.scrollTop;

            // If scroll happened when auto-scroll is active, check if it was user-initiated
            // Auto-scroll updates scrollTop frequently, so we detect sudden large changes
            // or scroll events that happen outside of our auto-scroll animation frame
            const timeSinceLastAutoScroll = currentTime - lastScrollTimeRef.current;
            const scrollDelta = Math.abs(currentScrollTop - lastScrollTopRef.current);

            // If scroll delta is significant and it's been a while since auto-scroll updated,
            // or if the scroll was in the opposite direction of auto-scroll, it's likely manual
            if (scrollDelta > 10 && timeSinceLastAutoScroll > 50) {
                lastUserScrollTime = currentTime;
                userScrollingRef.current = true;
                if (onAutoScrollStateChange) {
                    onAutoScrollStateChange(false);
                }
            }

            lastScrollTopRef.current = currentScrollTop;

            // Reset user scrolling flag after a delay if no more manual scrolling detected
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const timeSinceLastUserScroll = performance.now() - lastUserScrollTime;
                if (timeSinceLastUserScroll > 200) {
                    userScrollingRef.current = false;
                }
            }, 200);
        };

        container.addEventListener('scroll', handleManualScroll, { passive: true });

        return () => {
            container.removeEventListener('scroll', handleManualScroll);
            clearTimeout(scrollTimeout);
        };
    }, [isAutoScrolling, onAutoScrollStateChange]);

    // Track scroll for progress bar
    const handleScroll = useCallback(() => {
        if (!parentRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
        const position = scrollTop / (scrollHeight - clientHeight || 1);
        setScrollPosition(position);
        onScrollPositionChange?.(position);
        lastScrollTopRef.current = scrollTop;
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
