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
        estimateSize: (index) => imageHeights[index] || defaultHeight,
        overscan: 3, // Preload 3 images above and below
        initialOffset: initialScrollPosition > 0 ? undefined : undefined, // rely on scrollToIndex
    });

    // Handle initial index scroll
    // Handle initial scroll
    useEffect(() => {
        if (!parentRef.current || hasAppliedInitialScroll || images.length === 0) return;

        if (initialIndex >= 0) {
            // Check if the target image is already loaded and measured
            if (imageHeights[initialIndex]) {
                virtualizer.scrollToIndex(initialIndex, { align: 'start' });
                setHasAppliedInitialScroll(true);
            } else {
                // If not measured, do a preliminary scroll anyway
                virtualizer.scrollToIndex(initialIndex, { align: 'start' });
                // But don't set hasAppliedInitialScroll yet, let the loadImage re-trigger it
            }
        } else {
            setHasAppliedInitialScroll(true);
        }
    }, [initialIndex, hasAppliedInitialScroll, images.length, imageHeights]);


    // Load image and get its dimensions
    const loadImage = useCallback(async (index: number, path: string) => {
        if (loadedImages[index]) return;

        try {
            // Call Wails backend to load image
            // @ts-ignore - Wails generated bindings
            const dataUrl = await window.go?.main?.App?.LoadImage(path);
            if (dataUrl) {
                setLoadedImages((prev) => ({ ...prev, [index]: dataUrl }));

                // Get actual image dimensions
                const img = new Image();
                img.onload = () => {
                    // Use updated width calculation
                    const currentWidth = parentRef.current?.clientWidth || 800;
                    const containerWidth = currentWidth * (verticalWidth / 100);
                    const aspectRatio = img.height / img.width;
                    const height = containerWidth * aspectRatio;
                    setImageHeights((prev) => ({ ...prev, [index]: height }));
                };
                img.src = dataUrl;
            }
        } catch (error) {
            console.error(`Failed to load image ${path}:`, error);
        }
    }, [loadedImages, verticalWidth]);

    // Load visible images
    useEffect(() => {
        const items = virtualizer.getVirtualItems();
        items.forEach((item) => {
            const image = images[item.index];
            if (image && !loadedImages[item.index]) {
                loadImage(item.index, image.path);
            }
        });
    }, [virtualizer.getVirtualItems(), images, loadImage, loadedImages]);

    // Handle scroll position tracking
    const handleScroll = useCallback(() => {
        if (!parentRef.current) return;

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
            onWheel={handleWheel} // Add wheel handler
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
                    overflow: 'hidden',
                }}
            >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                    const image = images[virtualItem.index];
                    const loadedSrc = loadedImages[virtualItem.index];

                    return (
                        <div
                            key={virtualItem.key}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                transform: `translateY(${virtualItem.start}px)`,
                                width: '100%',
                                height: `${virtualItem.size}px`,
                                zIndex: 1,
                                display: 'flex',
                                justifyContent: 'center',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ width: `${itemWidth}px`, height: '100%', transition: 'width 0.1s ease-out' }}>
                                <AnimatePresence>
                                    {loadedSrc ? (
                                        <motion.img
                                            key={`img-${virtualItem.index}`}
                                            src={loadedSrc}
                                            alt={image.name}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.2 }}
                                            className="w-full h-auto object-contain"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div
                                            key={`placeholder-${virtualItem.index}`}
                                            className="w-full h-full flex items-center justify-center shimmer"
                                            style={{
                                                backgroundColor: 'var(--color-surface-secondary)',
                                                minHeight: defaultHeight,
                                            }}
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <div
                                                    className="w-12 h-12 rounded-full"
                                                    style={{ backgroundColor: 'var(--color-surface-tertiary)' }}
                                                />
                                                <span
                                                    className="text-sm"
                                                    style={{ color: 'var(--color-text-muted)' }}
                                                >
                                                    Loading...
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Image counter */}
            <motion.div
                className="fixed bottom-4 right-4 px-4 py-2 rounded-full text-sm font-medium z-50 pointer-events-none"
                style={{
                    backgroundColor: 'var(--color-surface-overlay)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                {useViewerStore.getState().currentIndex + 1} / {images.length}
            </motion.div>
        </div >
    );
}


export default VerticalViewer;
