/**
 * useThumbnailsPageData - Hook for loading images and thumbnails data
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ImageAPI } from '@services/api/imageAPI';
import { ImageOrderAPI } from '@services/api/imageOrderAPI';
import type { ImageData } from '../types';

interface UseThumbnailsPageDataOptions {
    folderPath?: string;
}

export function useThumbnailsPageData({ folderPath }: UseThumbnailsPageDataOptions) {
    const [images, setImages] = useState<ImageData[]>([]);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [hasCustomOrder, setHasCustomOrder] = useState(false);
    const [originalOrder, setOriginalOrder] = useState<string[]>([]);
    
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const loadImages = useCallback(async (silent = false) => {
        if (!folderPath) return;

        if (!silent && isMountedRef.current) setIsLoading(true);
        try {
            const imageList = await ImageAPI.getImages(folderPath);

            if (!isMountedRef.current) return;

            if (imageList && Array.isArray(imageList)) {
                setImages(imageList);

                // Load thumbnails that already come from backend metadata
                const initialThumbs: Record<string, string> = {};
                for (const img of imageList) {
                    if (img.thumbnailUrl) {
                        initialThumbs[img.path] = img.thumbnailUrl;
                    }
                }
                setThumbnails(initialThumbs);
            }

            if (!isMountedRef.current) return;

            // Check if custom order exists
            const hasCustom = await ImageOrderAPI.hasCustomOrder(folderPath);

            if (!isMountedRef.current) return;

            setHasCustomOrder(hasCustom || false);

            // Get the original order from backend
            const origOrder = await ImageOrderAPI.getOriginalOrder(folderPath);

            if (!isMountedRef.current) return;

            if (origOrder && Array.isArray(origOrder)) {
                setOriginalOrder(origOrder);
            } else if (imageList && Array.isArray(imageList)) {
                setOriginalOrder(imageList.map((img: ImageData) => img.name));
            }
        } catch (error) {
            if (isMountedRef.current) {
                console.error('Failed to load images:', error);
            }
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [folderPath]);

    useEffect(() => {
        if (!folderPath) return;
        loadImages();
    }, [folderPath, loadImages]);

    const handleThumbnailLoaded = useCallback((path: string, thumbnail: string) => {
        setThumbnails((prev) => {
            if (prev[path]) return prev;
            return { ...prev, [path]: thumbnail };
        });
    }, []);

    return {
        images,
        thumbnails,
        isLoading,
        hasCustomOrder,
        originalOrder,
        setImages,
        setHasCustomOrder,
        loadImages,
        handleThumbnailLoaded,
    };
}
