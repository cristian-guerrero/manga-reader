/**
 * VerticalViewer - Native scroll vertical image viewer
 * Improved version with zero flicker and stable heights
 */

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';

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
    showControls = false,
    hasChapterButtons = false,
    isAutoScrolling = false,
    scrollSpeed = 50,
    onAutoScrollStateChange,
    onRestorationComplete,
    onIndexChange,
    verticalWidth,
    onWidthChange,
    isActive = true,
}: VerticalViewerProps) => {
    const parentRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

    // Track which initialIndex was applied
    const appliedInitialIndexRef = useRef<number>(-1);

    // LOCAL state for display index
    const [displayIndex, setDisplayIndex] = useState(initialIndex);

    // Auto-scroll state
    const animationFrameIdRef = useRef<number | null>(null);
    const lastScrollTimeRef = useRef<number>(0);
    const lastScrollTopRef = useRef<number>(0);
    const userScrollingRef = useRef<boolean>(false);

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

    // Handle scroll - Optimized to find current index
    const handleScroll = useCallback(() => {
        if (!parentRef.current) return;

        const container = parentRef.current;
        const containerRect = container.getBoundingClientRect();
        const containerTop = containerRect.top;

        // Efficiently find which image is at the top using the refs we already have
        let topIndex = displayIndex;

        // Check current, next few, and previous few to avoid scanning all 1000 images
        const checkRange = 10;
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

        // If not found in range, do a full scan (fallback)
        if (topIndex === displayIndex) {
            for (let i = 0; i < images.length; i++) {
                const el = itemRefs.current[i];
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (rect.top <= containerTop + 100 && rect.bottom > containerTop + 100) {
                        topIndex = i;
                        break;
                    }
                }
            }
        }

        if (topIndex !== displayIndex) {
            setDisplayIndex(topIndex);
            onIndexChange?.(topIndex);
        }
    }, [displayIndex, images.length, onIndexChange]);

    // Reset appliedInitialIndexRef when tab becomes active or folder changes
    // This ensures we can scroll again when switching tabs
    useEffect(() => {
        if (isActive) {
            // Reset ref when tab becomes active to allow scrolling to the correct position
            appliedInitialIndexRef.current = -1;
        }
    }, [isActive, images.length]); // Reset when tab becomes active or images change

    // Handle initial scroll/resume - only when tab is active to prevent unwanted scrolling
    useEffect(() => {
        if (!parentRef.current || images.length === 0) return;
        if (appliedInitialIndexRef.current === initialIndex) {
            console.log(`[VerticalViewer] Skipping scroll - already at index ${initialIndex} (applied: ${appliedInitialIndexRef.current})`);
            return;
        }
        if (!isActive) {
            console.log(`[VerticalViewer] Skipping scroll - tab not active (isActive: ${isActive}, initialIndex: ${initialIndex})`);
            return; // Don't scroll if tab is not active
        }

        console.log(`[VerticalViewer] Preparing to scroll to index: ${initialIndex} (isActive: ${isActive}, applied: ${appliedInitialIndexRef.current})`);

        // Small delay to ensure DOM is ready
        const timeoutId = setTimeout(() => {
            if (initialIndex >= 0 && initialIndex < images.length) {
                const target = itemRefs.current[initialIndex];
                if (target && parentRef.current) {
                    console.log(`[VerticalViewer] Scrolling to index: ${initialIndex} (isActive: ${isActive}, images.length: ${images.length})`);
                    target.scrollIntoView({ block: 'start', behavior: 'instant' });
                    appliedInitialIndexRef.current = initialIndex;
                    onRestorationComplete?.();
                } else {
                    console.warn(`[VerticalViewer] Target for index ${initialIndex} not found in refs (images.length: ${images.length})`);
                    onRestorationComplete?.();
                }
            } else {
                console.warn(`[VerticalViewer] Invalid initialIndex: ${initialIndex} (images.length: ${images.length})`);
                onRestorationComplete?.();
            }
        }, 150); // Slightly longer delay for initial load stability

        return () => clearTimeout(timeoutId);
    }, [initialIndex, images.length, onRestorationComplete, isActive]);

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
