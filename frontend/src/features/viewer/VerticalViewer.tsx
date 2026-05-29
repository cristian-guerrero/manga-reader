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
    }>;
    initialIndex?: number;
    initialScrollPosition?: number; // 0-1 percentage of max scroll
    showControls?: boolean;
    hasChapterButtons?: boolean;
    isAutoScrolling?: boolean;
    scrollSpeed?: number;
    onAutoScrollStateChange?: (isScrolling: boolean) => void;
    onRestorationComplete?: () => void;
    onIndexChange?: (index: number) => void;
    onScrollPositionChange?: (scrollTop: number) => void; // Callback to report scroll position
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

    // Track which initialIndex was applied
    const appliedInitialIndexRef = useRef<number>(-1);
    const appliedInitialScrollRef = useRef<number>(-1);
    const isUserScrollingRef = useRef<boolean>(false); // Track if user is actively scrolling
    const hasEverCompletedRef = useRef<boolean>(false); // Track if restoration completed once (images were loaded)
    const lastUserScrollTimeRef = useRef<number>(0); // Track when user last scrolled

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

    // Handle scroll - Optimized to find current index and report scroll position
    // Uses RAF throttling to avoid 60fps state updates and eliminates full DOM scan.
    const handleScroll = useCallback(() => {
        if (!parentRef.current) return;

        const container = parentRef.current;
        const scrollTop = container.scrollTop;
        
        // Mark that user is actively scrolling to prevent restoration interference
        isUserScrollingRef.current = true;
        lastUserScrollTimeRef.current = Date.now();
        
        // Clear the flag after a delay (user stopped scrolling)
        setTimeout(() => {
            if (Date.now() - lastUserScrollTimeRef.current >= 150) {
                isUserScrollingRef.current = false;
            }
        }, 150);
        
        // RAF-throttled scroll position reporting for cleaner backpressure
        if (onScrollPositionChange && Date.now() - lastScrollReportRef.current > 50) {
            cancelAnimationFrame(scrollRafRef.current);
            scrollRafRef.current = requestAnimationFrame(() => {
                if (!parentRef.current) return;
                const c = parentRef.current;
                const { scrollHeight, clientHeight } = c;
                const maxScroll = scrollHeight - clientHeight;
                const percentage = maxScroll > 0 ? c.scrollTop / maxScroll : 0;
                onScrollPositionChange(percentage);
                lastScrollReportRef.current = Date.now();
            });
        }

        const containerRect = container.getBoundingClientRect();
        const containerTop = containerRect.top;

        // Find which image is at the top using a wide range scan
        let topIndex = displayIndex;

        // Wide range (50 items) — eliminates the fallback full scan for most cases
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

        // If still not found (rare — only on very large jumps), scan the visible viewport
        // using binary-search-like stepping to avoid reading all DOM nodes
        if (topIndex === displayIndex && images.length > 100) {
            const step = Math.max(1, Math.floor(images.length / 20));
            for (let i = 0; i < images.length; i += step) {
                const el = itemRefs.current[i];
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (rect.bottom > containerTop) {
                        // Found a candidate before the viewport — scan forward from here
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

    // Handle initial scroll/resume - runs in layout phase (before paint) to prevent flash of first page
    useLayoutEffect(() => {
        if (!parentRef.current || images.length === 0) return;
        if (!isActive) return;
        if (isUserScrollingRef.current) return;

        // Skip if same position already applied (avoids re-scroll on tab switches with unchanged position)
        const scrollKey = `${initialIndex}_${initialScrollPosition ?? 0}`;
        const lastScrollKey = `${appliedInitialIndexRef.current}_${appliedInitialScrollRef.current}`;
        if (scrollKey === lastScrollKey) return;

        const container = parentRef.current;

        // If restoration already completed once (images were previously loaded),
        // use direct percentage→pixels positioning — scrollHeight is already accurate
        if (hasEverCompletedRef.current) {
            if (initialScrollPosition !== undefined && initialScrollPosition > 0 && initialScrollPosition <= 1) {
                const { scrollHeight, clientHeight } = container;
                const maxScroll = scrollHeight - clientHeight;
                if (maxScroll > 0) {
                    container.scrollTop = initialScrollPosition * maxScroll;
                }
            } else if (initialIndex === 0) {
                container.scrollTop = 0;
            }
            appliedInitialIndexRef.current = initialIndex;
            appliedInitialScrollRef.current = initialScrollPosition ?? 0;
            onRestorationComplete?.();
            return;
        }

        // First-time setup: images not yet loaded, use scrollIntoView for approximate positioning
        // Skip scrollIntoView if we have an exact scroll percentage — the RAF correction
        // loop will apply the precise position, avoiding a double visual jump.
        if (initialScrollPosition === undefined || initialScrollPosition <= 0) {
            if (initialIndex >= 0 && initialIndex < images.length) {
                const target = itemRefs.current[initialIndex];
                if (target) {
                    target.scrollIntoView({ block: 'start', behavior: 'instant' });
                }
            }
        }

        appliedInitialIndexRef.current = initialIndex;
        appliedInitialScrollRef.current = initialScrollPosition ?? 0;

        // Deferred rAF-based correction: waits for scrollHeight to stabilize (images load)
        // then applies exact percentage position. Only runs on first mount.
        if (initialScrollPosition !== undefined && initialScrollPosition > 0 && initialScrollPosition <= 1) {
            let cancelled = false;
            let stableFrames = 0;
            let lastScrollHeight = container.scrollHeight;
            let frameCount = 0;
            const MAX_FRAMES = 30;

            const applyExactPosition = () => {
                frameCount++;
                if (cancelled || !parentRef.current || frameCount > MAX_FRAMES) {
                    hasEverCompletedRef.current = true;
                    onRestorationComplete?.();
                    return;
                }

                const c = parentRef.current;
                const { scrollHeight, clientHeight } = c;

                if (scrollHeight === lastScrollHeight) {
                    stableFrames++;
                } else {
                    stableFrames = 0;
                    lastScrollHeight = scrollHeight;
                }

                if (stableFrames >= 3 || (frameCount > 1 && scrollHeight === container.scrollHeight)) {
                    const maxScroll = scrollHeight - clientHeight;
                    if (maxScroll > 0) {
                        const exactPixels = initialScrollPosition * maxScroll;
                        if (Math.abs(c.scrollTop - exactPixels) > 30) {
                            c.scrollTop = exactPixels;
                        }
                    }
                    hasEverCompletedRef.current = true;
                    onRestorationComplete?.();
                } else {
                    requestAnimationFrame(applyExactPosition);
                }
            };

            requestAnimationFrame(applyExactPosition);

            return () => { cancelled = true; };
        } else {
            hasEverCompletedRef.current = true;
            onRestorationComplete?.();
        }
    }, [initialIndex, initialScrollPosition, images.length, isActive, onRestorationComplete]);

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
