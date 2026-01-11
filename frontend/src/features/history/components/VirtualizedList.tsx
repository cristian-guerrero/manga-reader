/**
 * VirtualizedList - Virtualized list component with improved performance
 * Extracted from HistoryPage for reusability
 */

import { useState, useEffect, useRef } from 'react';
import type { HistoryEntry } from '../types';

interface VirtualizedListProps {
    items: HistoryEntry[];
    itemHeight: number;
    containerRef: React.RefObject<HTMLDivElement>;
    renderItem: (item: HistoryEntry, index: number) => React.ReactNode;
    overscan?: number;
}

export function VirtualizedList({
    items,
    itemHeight,
    containerRef,
    renderItem,
    overscan = 5
}: VirtualizedListProps) {
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(20, items.length) });
    const rafIdRef = useRef<number | null>(null);
    const lastScrollTopRef = useRef<number>(0);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateVisibleRange = () => {
            const scrollTop = container.scrollTop;
            const containerHeight = container.clientHeight;

            // Only update if scroll position changed significantly (more than 50px)
            if (Math.abs(scrollTop - lastScrollTopRef.current) < 50 && rafIdRef.current) {
                return;
            }

            lastScrollTopRef.current = scrollTop;

            const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
            const end = Math.min(
                items.length,
                Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
            );

            setVisibleRange(prev => {
                // Only update if range actually changed
                if (prev.start === start && prev.end === end) {
                    return prev;
                }
                return { start, end };
            });
        };

        // Initial calculation
        updateVisibleRange();

        // Throttled scroll handler using requestAnimationFrame
        const handleScroll = () => {
            if (rafIdRef.current) return;

            rafIdRef.current = requestAnimationFrame(() => {
                updateVisibleRange();
                rafIdRef.current = null;
            });
        };

        container.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, [items.length, itemHeight, overscan, containerRef]);

    const visibleItems = items.slice(visibleRange.start, visibleRange.end);
    const totalHeight = items.length * itemHeight;
    const offsetY = visibleRange.start * itemHeight;

    return (
        <div style={{ position: 'relative', height: totalHeight, willChange: 'transform' }}>
            <div style={{ transform: `translateY(${offsetY}px)`, willChange: 'transform' }}>
                {visibleItems.map((item, index) => (
                    <div key={item.id} style={{ height: itemHeight }}>
                        {renderItem(item, visibleRange.start + index)}
                    </div>
                ))}
            </div>
        </div>
    );
}
