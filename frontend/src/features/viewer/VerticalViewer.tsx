/**
 * VerticalViewer - Native scroll vertical image viewer
 * Improved version with zero flicker and stable heights
 */

import React, { useEffect, useLayoutEffect, useRef, useCallback, useState, useMemo } from 'react';

interface VerticalViewerProps {
    images: Array<{
        path: string;
        name: string;
        index: number;
        imageUrl?: string;
        thumbnailUrl?: string;
        width?: number;
        height?: number;
    }>;
    initialIndex?: number;
    initialScrollPosition?: number; // absolute pixels from top
    showControls?: boolean;
    hasChapterButtons?: boolean;
    isAutoScrolling?: boolean;
    scrollSpeed?: number;
    onAutoScrollStateChange?: (isScrolling: boolean) => void;
    onRestorationComplete?: () => void;
    onIndexChange?: (index: number) => void;
    onScrollPositionChange?: (scrollTop: number) => void; // Callback to report scroll position (pixels)
    verticalWidth: number;
    onWidthChange?: (width: number) => void;
    isActive?: boolean;
}

// Memoized Single Image Component to prevent unnecessary re-renders of the entire list
const ImageItem = React.memo(({
    image,
    index,
    verticalWidth,
    itemRef
}: {
    image: any,
    index: number,
    verticalWidth: number,
    itemRef: (el: HTMLDivElement | null) => void
}) => {
    return (
        <div
            ref={itemRef}
            data-index={index}
            className="flex justify-center w-full"
            style={{
                width: '100%',
                // Use a default min-height based on verticalWidth to stabilize layout
                minHeight: `calc(80vh * ${verticalWidth} / 100)`,
                marginBottom: '1rem'
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
                <img
                    src={image.imageUrl || (image.path ? `/images?path=${encodeURIComponent(image.path)}` : '')}
                    alt={image.name}
                    loading="lazy"
                    className="w-full h-auto shadow-2xl rounded-lg bg-zinc-900"
                    style={{ minHeight: '200px' }} // Ensure it has some height even if empty
                    onLoad={(e) => {
                        const parent = e.currentTarget.parentElement?.parentElement;
                        if (parent) parent.style.minHeight = '0';
                    }}
                    onError={(e) => {
                        const target = e.currentTarget;
                        const fallback = `/images?path=${encodeURIComponent(image.path)}`;

                        // Prevent infinite loops if fallback also fails
                        if (target.getAttribute('data-tried-fallback') === 'true') {
                            console.error(`[VerticalViewer] Image load failed even with fallback: ${image.name}`);
                            return;
                        }

                        target.setAttribute('data-tried-fallback', 'true');
                        target.src = fallback;
                    }}
                />
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white/50 opacity-0 hover:opacity-100 transition-opacity">
                    Page {index + 1}
                </div>
            </div>
        </div>
    );
});

export const VerticalViewer = React.memo(({
    images,
    initialIndex = 0,
    initialScrollPosition,
    showControls = false,
    hasChapterButtons = false,
    isAutoScrolling = false,
    scrollSpeed = 50,
    onAutoScrollStateChange,
    onRestorationComplete,
    onIndexChange,
    onScrollPositionChange,
    verticalWidth,
    onWidthChange,
    isActive = true,
}: VerticalViewerProps) => {
    const parentRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const isUserScrollingRef = useRef<boolean>(false);
    const lastUserScrollTimeRef = useRef<number>(0);

    // LOCAL state for display index
    const [displayIndex, setDisplayIndex] = useState(initialIndex);

    // Auto-scroll state
    const animationFrameIdRef = useRef<number | null>(null);
    const lastScrollTimeRef = useRef<number>(0);
    const lastScrollTopRef = useRef<number>(0);
    const userScrollingRef = useRef<boolean>(false);
    const scrollRafRef = useRef<number>(0);
    const lastScrollReportRef = useRef<number>(0);

    // Memoize the image list to prevent wholesale re-renders
    const imageElements = useMemo(() => {
        return images.map((image, index) => (
            <ImageItem
                key={`${image.path}-${index}`}
                image={image}
                index={index}
                verticalWidth={verticalWidth}
                itemRef={(el) => { itemRefs.current[index] = el; }}
            />
        ));
    }, [images, verticalWidth]);

    // Helper: builds cumulative pixel offset map from image dimensions + container width.
    const getHeightMap = useCallback((containerEl: HTMLElement): number[] => {
        const containerWidth = containerEl.clientWidth;
        const imgDisplayWidth = containerWidth * (verticalWidth / 100);
        const gapPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16; // 1rem
        const cumulative: number[] = [0];
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            let h: number;
            if (img.width && img.height) {
                h = imgDisplayWidth * (img.height / img.width);
            } else {
                h = 800;
            }
            cumulative.push(cumulative[i] + h + gapPx);
        }
        return cumulative;
    }, [images, verticalWidth]);

    // Handle scroll - Optimized to find current index and report scroll position
    const handleScroll = useCallback(() => {
        if (!parentRef.current) return;

        const container = parentRef.current;
        const scrollTop = container.scrollTop;

        // Mark that user is actively scrolling
        isUserScrollingRef.current = true;
        lastUserScrollTimeRef.current = Date.now();
        setTimeout(() => {
            if (Date.now() - lastUserScrollTimeRef.current >= 150) {
                isUserScrollingRef.current = false;
            }
        }, 150);

        // RAF-throttled scroll position reporting — report pixels directly
        if (onScrollPositionChange && Date.now() - lastScrollReportRef.current > 50) {
            cancelAnimationFrame(scrollRafRef.current);
            scrollRafRef.current = requestAnimationFrame(() => {
                if (!parentRef.current) return;
                onScrollPositionChange(parentRef.current.scrollTop);
                lastScrollReportRef.current = Date.now();
            });
        }

        const containerRect = container.getBoundingClientRect();
        const containerTop = containerRect.top;

        // Find which image is at the top using a wide range scan
        let topIndex = displayIndex;
        const checkRange = 50;
        const start = Math.max(0, displayIndex - checkRange);
        const end = Math.min(images.length - 1, displayIndex + checkRange);

        for (let i = start; i <= end; i++) {
            const el = itemRefs.current[i];
            if (el) {
                const rect = el.getBoundingClientRect();
                if (rect.top <= containerTop + 100 && rect.bottom > containerTop + 100) {
                    topIndex = i;
                    break;
                }
            }
        }

        // Fallback scan for large jumps
        if (topIndex === displayIndex && images.length > 100) {
            const step = Math.max(1, Math.floor(images.length / 20));
            for (let i = 0; i < images.length; i += step) {
                const el = itemRefs.current[i];
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (rect.bottom > containerTop) {
                        const candidateStart = Math.max(0, i - step);
                        const candidateEnd = Math.min(images.length - 1, i + step);
                        for (let j = candidateStart; j <= candidateEnd; j++) {
                            const el2 = itemRefs.current[j];
                            if (el2) {
                                const rect2 = el2.getBoundingClientRect();
                                if (rect2.top <= containerTop + 100 && rect2.bottom > containerTop + 100) {
                                    topIndex = j;
                                    break;
                                }
                            }
                        }
                        break;
                    }
                }
            }
        }

        if (topIndex !== displayIndex) {
            setDisplayIndex(topIndex);
            onIndexChange?.(topIndex);
        }
    }, [displayIndex, images.length, onIndexChange, onScrollPositionChange]);

    // Restore scroll position using pixel-based positioning, no RAF loop needed.
    useLayoutEffect(() => {
        if (!parentRef.current || images.length === 0) return;
        if (!isActive) return;
        if (isUserScrollingRef.current) return;

        const container = parentRef.current;
        const hm = getHeightMap(container);

        // Use direct pixel scroll restoration when we have saved pixels.
        if (initialScrollPosition !== undefined && initialScrollPosition > 0 &&
            hm.length > 0 && hm[hm.length - 1] > initialScrollPosition) {
            container.scrollTop = initialScrollPosition;
        } else if (initialIndex > 0 && initialIndex < hm.length) {
            // Fallback: use height map to position at the target page
            container.scrollTop = hm[initialIndex];
        } else {
            container.scrollTop = 0;
        }

        setDisplayIndex(initialIndex);
        onRestorationComplete?.();
    }, [initialIndex, initialScrollPosition, images.length, getHeightMap, isActive, onRestorationComplete]);

    // Auto-scroll pixels per second calculation
    const getPixelsPerSecond = useCallback((speed: number): number => {
        if (speed <= 33) return 10 + (speed / 33) * 40;
        if (speed <= 66) return 50 + ((speed - 33) / 33) * 50;
        return 100 + ((speed - 66) / 34) * 100;
    }, []);

    // Auto-scroll animation loop
    useEffect(() => {
        if (!isAutoScrolling || !parentRef.current) {
            if (animationFrameIdRef.current !== null) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
            return;
        }

        const pixelsPerSecond = getPixelsPerSecond(scrollSpeed);
        let lastTime = performance.now();
        let accumulatedScroll = 0;

        const scrollStep = (currentTime: number) => {
            if (!parentRef.current || !isAutoScrolling) {
                animationFrameIdRef.current = null;
                return;
            }

            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;

            const container = parentRef.current;
            const { scrollTop, scrollHeight, clientHeight } = container;
            const maxScroll = scrollHeight - clientHeight;

            if (scrollTop >= maxScroll - 2) {
                onAutoScrollStateChange?.(false);
                animationFrameIdRef.current = null;
                return;
            }

            if (!userScrollingRef.current) {
                accumulatedScroll += pixelsPerSecond * deltaTime;
                if (Math.abs(accumulatedScroll) >= 0.5) {
                    const newScrollTop = Math.min(scrollTop + accumulatedScroll, maxScroll);
                    container.scrollTop = newScrollTop;
                    accumulatedScroll = 0;
                    lastScrollTimeRef.current = currentTime;
                    lastScrollTopRef.current = newScrollTop;
                }
            } else {
                accumulatedScroll = 0;
            }

            animationFrameIdRef.current = requestAnimationFrame(scrollStep);
        };

        animationFrameIdRef.current = requestAnimationFrame(scrollStep);
        return () => {
            if (animationFrameIdRef.current !== null) cancelAnimationFrame(animationFrameIdRef.current);
        };
    }, [isAutoScrolling, scrollSpeed, getPixelsPerSecond, onAutoScrollStateChange]);

    // Detect manual scrolling to pause auto-scroll
    useEffect(() => {
        if (!parentRef.current || !isAutoScrolling) return;

        const container = parentRef.current;
        let scrollTimeout: ReturnType<typeof setTimeout>;

        const handleManualScroll = () => {
            const currentTime = performance.now();
            const currentScrollTop = container.scrollTop;
            const timeSinceLastAutoScroll = currentTime - lastScrollTimeRef.current;
            const scrollDelta = Math.abs(currentScrollTop - lastScrollTopRef.current);

            if (scrollDelta > 10 && timeSinceLastAutoScroll > 50) {
                userScrollingRef.current = true;
                onAutoScrollStateChange?.(false);
            }

            lastScrollTopRef.current = currentScrollTop;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                userScrollingRef.current = false;
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
            className="h-full w-full overflow-y-scroll" // use scroll to always show scrollbar and prevent layout shifts
            onScroll={handleScroll}
            onWheel={handleWheel}
            style={{
                backgroundColor: 'var(--color-surface-primary)',
                overflowX: 'hidden',
                scrollBehavior: 'auto'
            }}
        >
            <div className="flex flex-col items-center w-full py-8">
                {imageElements}
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
});

export default VerticalViewer;
