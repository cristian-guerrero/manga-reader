/**
 * VerticalViewer - Native scroll vertical image viewer
 */

import { useEffect, useRef, useCallback, useState } from 'react';

import { useSettingsStore } from '../../stores/settingsStore';

interface VerticalViewerProps {
    images: Array<{
        path: string;
        name: string;
        index: number;
        imageUrl?: string;
        thumbnailUrl?: string;
    }>;
    initialIndex?: number;
    showControls?: boolean;
    hasChapterButtons?: boolean;
    isAutoScrolling?: boolean;
    scrollSpeed?: number;
    onAutoScrollStateChange?: (isScrolling: boolean) => void;
    onRestorationComplete?: () => void;
    onIndexChange?: (index: number) => void;
    verticalWidth: number;
    onWidthChange?: (width: number) => void;
}

export function VerticalViewer({
    images,
    initialIndex = 0,
    showControls = false,
    hasChapterButtons = false,
    isAutoScrolling = false,
    scrollSpeed = 50,
    onAutoScrollStateChange,
    onRestorationComplete,
    onIndexChange,
    verticalWidth,
    onWidthChange,
}: VerticalViewerProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

    // Track which initialIndex was applied so we can re-apply if it changes
    const appliedInitialIndexRef = useRef<number>(-1);

    // LOCAL state for display index - decoupled from global store
    const [displayIndex, setDisplayIndex] = useState(initialIndex);

    // Windowing state - only render images near the current view
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
    const buffer = 5; // Number of images to render above/below the visible area

    // Auto-scroll state
    const animationFrameIdRef = useRef<number | null>(null);
    const lastScrollTimeRef = useRef<number>(0);
    const lastScrollTopRef = useRef<number>(0);
    const userScrollingRef = useRef<boolean>(false);

    // Update visible range and displayIndex based on initial index
    useEffect(() => {
        const start = Math.max(0, initialIndex - buffer);
        const end = Math.min(images.length - 1, initialIndex + buffer);
        setVisibleRange({ start, end });
        setDisplayIndex(initialIndex);
    }, [initialIndex, images.length]);

    // Handle scroll - Updates local display index and notifies parent via callback
    const handleScroll = useCallback(() => {
        if (!parentRef.current) return;

        const container = parentRef.current;
        const children = container.querySelectorAll('[data-index]');

        // Find the image at the top of the viewport
        let topIndex = 0;
        children.forEach(child => {
            const rect = child.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            // Check if this image covers the top area of the container
            if (rect.top <= containerRect.top + 50 && rect.bottom > containerRect.top + 50) {
                topIndex = parseInt((child as HTMLElement).dataset.index || '0');
            }
        });

        // Update local display state
        setDisplayIndex(topIndex);

        // Notify parent via callback (parent handles persistence)
        onIndexChange?.(topIndex);

        // Update visible range for windowing
        const newStart = Math.max(0, topIndex - buffer);
        const newEnd = Math.min(images.length - 1, topIndex + buffer);
        if (newStart !== visibleRange.start || newEnd !== visibleRange.end) {
            setVisibleRange({ start: newStart, end: newEnd });
        }
    }, [onIndexChange, images.length, visibleRange.start, visibleRange.end]);

    // Handle initial scroll/resume - SIMPLIFIED like Yomikiru
    // Using useEffect with a small delay to ensure DOM is ready
    useEffect(() => {
        if (!parentRef.current || images.length === 0) return;
        if (appliedInitialIndexRef.current === initialIndex) return;

        // Small delay to ensure DOM is painted (same as Yomikiru's 100ms approach)
        const timeoutId = setTimeout(() => {
            if (initialIndex >= 0 && initialIndex < images.length) {
                // Ensure the target is in the visible range first
                const start = Math.max(0, initialIndex - buffer);
                const end = Math.min(images.length - 1, initialIndex + buffer);
                setVisibleRange({ start, end });

                const target = itemRefs.current[initialIndex];
                if (target && parentRef.current) {
                    console.log(`[VerticalViewer] Scrolling to index: ${initialIndex}`);
                    target.scrollIntoView({ block: 'start', behavior: 'instant' });
                    appliedInitialIndexRef.current = initialIndex;
                    onRestorationComplete?.();
                }
            } else {
                onRestorationComplete?.();
            }
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [initialIndex, images.length, onRestorationComplete]);

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

    // Track wheel for zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY * -0.05;
            const newWidth = Math.min(Math.max(verticalWidth + delta, 10), 100);
            if (Math.abs(newWidth - verticalWidth) > 0.5) {
                onWidthChange?.(Math.round(newWidth));
            }
        }
    }, [verticalWidth, onWidthChange]);

    return (
        <div
            ref={parentRef}
            className="h-full w-full overflow-y-auto"
            onScroll={handleScroll}
            onWheel={handleWheel}
            style={{
                backgroundColor: 'var(--color-surface-primary)',
                overflowX: 'hidden',
                // We use 'auto' to ensure instant restoration works perfectly. 
                // Smooth scrolling for users is often handled by the browser or smooth scroll libraries,
                // but 'smooth' css here can interfere with instant scrollIntoView on some browsers.
                scrollBehavior: 'auto'
            }}
        >
            <div className="flex flex-col items-center w-full py-8 gap-4">
                {images.map((image, index) => {
                    const isVisible = index >= visibleRange.start && index <= visibleRange.end;

                    return (
                        <div
                            key={`${image.path}-${index}`}
                            ref={el => itemRefs.current[index] = el}
                            data-index={index}
                            className="flex justify-center w-full"
                            style={{
                                width: '100%',
                                minHeight: `calc(80vh * ${verticalWidth} / 100)`,
                                // Use visibility: hidden for items out of range to keep their space? 
                                // Actually, if we don't render the image, we can't know the height.
                                // But keeping the placeholder height helps.
                            }}
                        >
                            <div
                                style={{
                                    width: `${verticalWidth}%`,
                                    maxWidth: '100%',
                                    transition: 'width 0.2s ease-out'
                                }}
                                className="relative flex justify-center items-center"
                            >
                                {isVisible ? (
                                    <img
                                        src={image.imageUrl || `/images?path=${encodeURIComponent(image.path)}`}
                                        alt={image.name}
                                        loading="lazy"
                                        className="w-full h-auto shadow-2xl rounded-lg bg-zinc-900/50"
                                        onLoad={() => {
                                            // Restoration is handled by the main useEffect now.
                                            // No need for per-image onload hacks.
                                        }}
                                        onError={(e) => {
                                            // Fallback if imageUrl fails
                                            const target = e.currentTarget;
                                            const fallback = `/images?path=${encodeURIComponent(image.path)}`;
                                            if (target.src !== fallback) {
                                                console.log(`[VerticalViewer] Image load failed for ${image.name}, trying fallback`);
                                                target.src = fallback;
                                            }
                                        }}
                                    />
                                ) : (
                                    <div
                                        className="w-full aspect-[2/3] flex items-center justify-center bg-zinc-900/20 rounded-lg animate-pulse"
                                        style={{ maxHeight: `calc(80vh * ${verticalWidth} / 100)` }}
                                    >
                                        <span className="text-zinc-700 font-bold text-4xl">{index + 1}</span>
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white/50 opacity-0 hover:opacity-100 transition-opacity">
                                    Page {index + 1}
                                </div>
                            </div>
                        </div>
                    );
                })}
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
                {displayIndex + 1} / {images.length}
            </div>
        </div>
    );
}

export default VerticalViewer;
