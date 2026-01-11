/**
 * HomeThumbnail - Thumbnail component with lazy loading and caching
 * Extracted from HomePage for reusability
 */

import { useState, useEffect, useRef } from 'react';
import { AppAPI } from '@services/api/appAPI';
import { BookOpenIcon } from './HomeIcons';

// Thumbnail cache to avoid reloading
const thumbnailCache = new Map<string, string>();

interface HomeThumbnailProps {
    entryId: string;
    folderPath: string;
}

export function HomeThumbnail({ entryId, folderPath }: HomeThumbnailProps) {
    const [thumbnail, setThumbnail] = useState<string | null>(thumbnailCache.get(entryId) || null);
    const ref = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);
    const isMountedRef = useRef(true);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            loadingRef.current = false;
        };
    }, []);

    useEffect(() => {
        // If already cached, use it immediately
        const cached = thumbnailCache.get(entryId);
        if (cached) {
            setThumbnail(cached);
            return;
        }

        if (!ref.current || loadingRef.current || thumbnail) return;

        // Clean up previous observer and timer
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        const observer = new IntersectionObserver(
            ([obsEntry]) => {
                if (obsEntry.isIntersecting && !loadingRef.current && !thumbnail && isMountedRef.current) {
                    // Check cache again before loading
                    const cached = thumbnailCache.get(entryId);
                    if (cached) {
                        if (isMountedRef.current) {
                            setThumbnail(cached);
                        }
                        observer.disconnect();
                        observerRef.current = null;
                        return;
                    }

                    loadingRef.current = true;

                    // Load thumbnail asynchronously with delay to avoid blocking
                    timerRef.current = setTimeout(async () => {
                        if (!isMountedRef.current) {
                            loadingRef.current = false;
                            return;
                        }

                        try {
                            // Use GetFolderInfoShallow (only scans immediate directory, not recursive)
                            const folderInfo = await AppAPI.getFolderInfoShallow(folderPath);
                            if (!isMountedRef.current) {
                                loadingRef.current = false;
                                return;
                            }

                            if (folderInfo && folderInfo.coverImage) {
                                const thumb = await AppAPI.getThumbnail(folderInfo.coverImage);

                                if (!isMountedRef.current) {
                                    loadingRef.current = false;
                                    return;
                                }

                                if (thumb) {
                                    // Cache the thumbnail
                                    thumbnailCache.set(entryId, thumb);
                                    if (isMountedRef.current) {
                                        setThumbnail(thumb);
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('Failed to load thumbnail:', error);
                        } finally {
                            loadingRef.current = false;
                            timerRef.current = null;
                        }
                    }, 100); // Small delay to yield to browser

                    observer.disconnect();
                    observerRef.current = null;
                }
            },
            { rootMargin: '200px' } // Same as ExplorerPage
        );

        observerRef.current = observer;
        observer.observe(ref.current);

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [entryId, folderPath, thumbnail]);

    return (
        <div ref={ref} className="w-full h-full">
            {thumbnail ? (
                <img src={thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted">
                    <BookOpenIcon />
                </div>
            )}
        </div>
    );
}
