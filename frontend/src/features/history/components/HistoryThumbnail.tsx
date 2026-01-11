/**
 * HistoryThumbnail - Thumbnail component with lazy loading and caching
 * Extracted from HistoryPage for reusability
 */

import { useState, useEffect, useRef } from 'react';
import { AppAPI } from '@services/api/appAPI';
import type { HistoryEntry } from '../types';

// Thumbnail cache to avoid reloading
const thumbnailCache = new Map<string, string>();

interface HistoryThumbnailProps {
    entry: HistoryEntry;
}

export function HistoryThumbnail({ entry }: HistoryThumbnailProps) {
    const [thumbnail, setThumbnail] = useState<string | null>(thumbnailCache.get(entry.id) || null);
    const [isLoading, setIsLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);

    useEffect(() => {
        // If already cached, use it immediately
        const cached = thumbnailCache.get(entry.id);
        if (cached) {
            setThumbnail(cached);
            return;
        }

        if (!ref.current || loadingRef.current || thumbnail) return;

        const observer = new IntersectionObserver(
            ([obsEntry]) => {
                if (obsEntry.isIntersecting && !loadingRef.current && !thumbnail) {
                    // Check cache again before loading
                    const cached = thumbnailCache.get(entry.id);
                    if (cached) {
                        setThumbnail(cached);
                        observer.disconnect();
                        return;
                    }

                    loadingRef.current = true;
                    setIsLoading(true);

                    // Load thumbnail asynchronously with delay to avoid blocking
                    const loadTimer = setTimeout(async () => {
                        try {
                            const folderInfo = await AppAPI.getFolderInfoShallow(entry.folderPath);
                            if (folderInfo && folderInfo.coverImage) {
                                const thumb = await AppAPI.getThumbnail(folderInfo.coverImage);
                                if (thumb) {
                                    // Cache the thumbnail
                                    thumbnailCache.set(entry.id, thumb);
                                    setThumbnail(thumb);
                                }
                            }
                        } catch (error) {
                            // Silently fail
                        } finally {
                            setIsLoading(false);
                            loadingRef.current = false;
                        }
                    }, 100); // Small delay to yield to browser

                    observer.disconnect();

                    return () => clearTimeout(loadTimer);
                }
            },
            { rootMargin: '200px' } // Same as ExplorerPage for consistency
        );

        observer.observe(ref.current);
        return () => {
            observer.disconnect();
        };
    }, [entry, thumbnail]);

    return (
        <div ref={ref} className="relative w-full h-full">
            {thumbnail ? (
                <img
                    src={thumbnail}
                    alt={entry.folderName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
            ) : (
                <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-text-muted)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                </div>
            )}
        </div>
    );
}
