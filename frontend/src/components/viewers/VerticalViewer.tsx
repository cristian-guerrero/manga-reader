/**
 * VerticalViewer - Infinite scroll vertical image viewer
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';

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
}

export function VerticalViewer({
    images,
    onScrollPositionChange,
    initialScrollPosition = 0,
    initialIndex = 0,
}: VerticalViewerProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const [parentWidth, setParentWidth] = useState(0);
    const [loadedImages, setLoadedImages] = useState<Record<number, string>>({});
    const [imageHeights, setImageHeights] = useState<Record<number, number>>({});
    const { verticalWidth } = useSettingsStore(); // Removed unused setters
    const { setScrollPosition, setCurrentIndex } = useViewerStore();

    // State to track if initial scroll has been applied
    const [hasAppliedInitialScroll, setHasAppliedInitialScroll] = useState(false);

    // Default height for images before they're loaded
    const defaultHeight = 800;

    // Virtual list for performance with many images
    const virtualizer = useVirtualizer({
        count: images.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => Math.floor(imageHeights[index] || defaultHeight),
        overscan: 10, // Balanced overscan
    });

    // Handle initial index scroll
    // Handle initial scroll
    const scrollAttempts = useRef(0);
    useEffect(() => {
        if (!parentRef.current || hasAppliedInitialScroll || images.length === 0) return;

        // Prevent trying to scroll past the end
        if (initialIndex >= images.length) {
            console.warn(`[VerticalViewer] initialIndex ${initialIndex} is out of bounds (max ${images.length - 1}). Cancelling scroll.`);
            setHasAppliedInitialScroll(true);
            return;
        }

        const performInitialScroll = () => {
            if (parentRef.current) {
                // If we have any measured items OR we've waited enough, just jump
                // The virtualizer doesn't need the Target item to be measured to scroll to it
                // because it uses estimateSize for non-measured items.
                if (Object.keys(imageHeights).length > 0 || scrollAttempts.current > 5) {
                    console.log(`[VerticalViewer] Executing initial scroll to index ${initialIndex}`);
                    virtualizer.scrollToIndex(initialIndex, { align: 'start' });
                    setHasAppliedInitialScroll(true);
                } else if (scrollAttempts.current < 20) {
                    scrollAttempts.current++;
                    setTimeout(performInitialScroll, 100);
                } else {
                    console.warn(`[VerticalViewer] Falling back to immediate scroll to index ${initialIndex}`);
                    virtualizer.scrollToIndex(initialIndex, { align: 'start' });
                    setHasAppliedInitialScroll(true);
                }
            } else {
                requestAnimationFrame(performInitialScroll);
            }
        };

        performInitialScroll();
    }, [initialIndex, hasAppliedInitialScroll, images.length, imageHeights, virtualizer]);


    // Use a ref for imageHeights to avoid dependency loops in loadImage
    const heightsRef = useRef<Record<number, number>>({});
    useEffect(() => {
        heightsRef.current = imageHeights;
    }, [imageHeights]);

    // Load image and get its dimensions
    const loadImage = useCallback(async (index: number, path: string) => {
        try {
            // Use direct URL from our images or construct it
            const imageUrl = images[index]?.imageUrl || `/images?path=${encodeURIComponent(path)}`;

            setLoadedImages((prev) => ({ ...prev, [index]: imageUrl }));

            // Get actual image dimensions
            const img = new Image();

            // Safety timeout: if image doesn't load in 20s, assume error to unstick virtualizer
            const timeoutId = setTimeout(() => {
                if (!heightsRef.current[index]) {
                    console.warn(`[VerticalViewer] Image load timeout at index ${index}: ${imageUrl}`);
                    setImageHeights((prev) => ({ ...prev, [index]: 1200 }));
                    virtualizer.measure();
                }
            }, 20000);

            img.onload = () => {
                clearTimeout(timeoutId);
                // Use updated width calculation
                const currentWidth = parentRef.current?.clientWidth || 800;
                const containerWidth = currentWidth * (verticalWidth / 100);
                const aspectRatio = img.height / img.width;
                const height = containerWidth * aspectRatio;
                console.log(`[VerticalViewer] Image loaded at index ${index}: ${img.width}x${img.height} (calculated height: ${height})`);
                setImageHeights((prev) => ({ ...prev, [index]: height }));
                virtualizer.measure();
            };
            img.onerror = () => {
                clearTimeout(timeoutId);
                console.error(`[VerticalViewer] Failed to load image at index ${index}: ${imageUrl}`);
                // Set a sensible default height even on error to keep virtualizer happy
                setImageHeights((prev) => ({ ...prev, [index]: 1200 }));
                virtualizer.measure();
            };
            img.src = imageUrl;
        } catch (error) {
            console.error(`[VerticalViewer] Error in loadImage for ${path}:`, error);
            setImageHeights((prev) => ({ ...prev, [index]: 1200 }));
        }
    }, [images, verticalWidth, virtualizer]); // heightsRef is a ref, doesn't need to be in deps

    // Load visible images - use a ref to track requested images
    const loadRequestedRef = useRef<Set<number>>(new Set());
    const lastVirtualItemsRef = useRef<string>('');

    useEffect(() => {
        const items = virtualizer.getVirtualItems();
        // Create a signature of current visible items to avoid unnecessary work
        const signature = items.map(i => i.index).join(',');
        if (signature === lastVirtualItemsRef.current) return;
        lastVirtualItemsRef.current = signature;

        items.forEach((item) => {
            const image = images[item.index];
            // Only load if not already loaded AND not already requested
            if (image && !loadedImages[item.index] && !loadRequestedRef.current.has(item.index)) {
                console.log(`[VerticalViewer] Requesting load for index ${item.index} (Image ${item.index + 1})`);
                loadRequestedRef.current.add(item.index);
                loadImage(item.index, image.path);
            }
        });
    }, [virtualizer, images, loadedImages, loadImage]);

    const virtualItems = virtualizer.getVirtualItems();

    // Handle scroll position tracking with throttle
    const scrollThrottleRef = useRef<number | null>(null);
    const handleScroll = useCallback(() => {
        if (!parentRef.current) return;

        // Throttle to once every 100ms for better performance
        if (scrollThrottleRef.current) return;
        scrollThrottleRef.current = window.requestAnimationFrame(() => {
            if (!parentRef.current) {
                scrollThrottleRef.current = null;
                return;
            }

            const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
            const position = scrollTop / (scrollHeight - clientHeight);

            setScrollPosition(position);
            onScrollPositionChange?.(position);

            // Update current index based on scroll position
            const items = virtualizer.getVirtualItems();
            if (items.length > 0) {
                const middleY = scrollTop + clientHeight / 2;
                const currentItem = items.find(
                    (item) => item.start <= middleY && item.end >= middleY
                );
                if (currentItem) {
                    setCurrentIndex(currentItem.index);
                }
            }

            scrollThrottleRef.current = null;
        });
    }, [virtualizer, setScrollPosition, setCurrentIndex, onScrollPositionChange]);

    // Restore scroll position on mount
    // Legacy effect removed in favor of unified one above
    // useEffect(() => {
    //     if (parentRef.current && initialScrollPosition > 0) {
    //         const { scrollHeight, clientHeight } = parentRef.current;
    //         const scrollTop = initialScrollPosition * (scrollHeight - clientHeight);
    //         parentRef.current.scrollTop = scrollTop;
    //     }
    // }, [initialScrollPosition]);

    // Handle resize to update measurements
    useEffect(() => {
        if (!parentRef.current) return;

        // Initial set
        setParentWidth(parentRef.current.clientWidth);

        const resizeObserver = new ResizeObserver((entries) => {
            const width = entries[0].contentRect.width;
            setParentWidth(width);

            // Force re-measurement of all items
            images.forEach((_, index) => {
                if (loadedImages[index]) {
                    const img = new Image();
                    img.src = loadedImages[index];
                    const containerWidth = width * (verticalWidth / 100);
                    const aspectRatio = img.height / img.width;
                    const height = containerWidth * aspectRatio;
                    setImageHeights((prev) => ({ ...prev, [index]: height }));
                }
            });
            virtualizer.measure();
        });

        resizeObserver.observe(parentRef.current);
        return () => resizeObserver.disconnect();
    }, [loadedImages, verticalWidth, images, virtualizer]);

    // Calculate item width in pixels
    const itemWidth = parentWidth * (verticalWidth / 100);

    // Handle wheel zoom (Pinch to zoom usually maps to Ctrl+Wheel)
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            // Determine direction
            const delta = e.deltaY * -0.05;
            const newWidth = Math.min(Math.max(verticalWidth + delta, 10), 100);

            // Only update if changed significantly
            if (Math.abs(newWidth - verticalWidth) > 0.5) {
                // We need to access setVerticalWidth inside callback, but it comes from hook
                // The hook value might be stale if not in dep array, but useCallback handles it.
                // Better to use current state to avoid flickering?
                // Actually settingsStore updates are fast.
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
                overflowX: 'hidden'
            }}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                    const image = images[virtualItem.index];
                    const loadedSrc = loadedImages[virtualItem.index];

                    return (
                        <div
                            key={virtualItem.key}
                            data-index={virtualItem.index}
                            style={{
                                transform: `translateY(${virtualItem.start}px)`,
                                width: '100%',
                                zIndex: 1,
                                display: 'flex',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                height: `${virtualItem.size}px`,
                                position: 'absolute',
                                top: 0,
                                left: 0,
                            }}
                            className="py-4 transition-opacity duration-300"
                        >
                            <div style={{ width: `${itemWidth}px`, transition: 'width 0.1s ease-out' }}>
                                {loadedSrc ? (
                                    <div className="flex flex-col gap-4">
                                        <img
                                            src={loadedSrc}
                                            alt={image.name}
                                            className="w-full h-auto shadow-2xl rounded-lg"
                                        // Removed loading="lazy" to solve Edge/WebView2 Intervention deferring load events
                                        // which stalls virtualization measurement.
                                        />
                                    </div>
                                ) : (
                                    <div
                                        className="w-full flex flex-col items-center justify-center shimmer rounded-lg"
                                        style={{
                                            backgroundColor: 'var(--color-surface-secondary)',
                                            height: imageHeights[virtualItem.index] || defaultHeight,
                                        }}
                                    >
                                        <div className="flex flex-col items-center gap-4 text-zinc-400">
                                            <div className="relative">
                                                <div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
                                            </div>
                                            <span className="text-sm font-medium animate-pulse">Loading {virtualItem.index + 1}...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Image counter */}
            <motion.div
                className="fixed bottom-4 right-4 px-4 py-2 rounded-full text-sm font-medium z-50 pointer-events-none"
                style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(8px)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                {useViewerStore.getState().currentIndex + 1} / {images.length}
            </motion.div>
        </div>
    );
}


export default VerticalViewer;
