/**
 * useThumbnailsPageSort - Hook for managing sorting and custom order in ThumbnailsPage
 */

import { useState, useCallback } from 'react';
import { ImageOrderAPI } from '@services/api/imageOrderAPI';
import type { ImageData } from '../types';

interface UseThumbnailsPageSortOptions {
    folderPath?: string;
    images: ImageData[];
    hasCustomOrder: boolean;
    originalOrder: string[];
    onImagesChange: (images: ImageData[]) => void;
    onReload: (silent?: boolean) => void;
    onHasCustomOrderChange: (hasCustom: boolean) => void;
}

export function useThumbnailsPageSort({
    folderPath,
    images,
    hasCustomOrder,
    originalOrder,
    onImagesChange,
    onReload,
    onHasCustomOrderChange,
}: UseThumbnailsPageSortOptions) {
    const [sortMode, setSortMode] = useState<string>('name');

    const handleSort = useCallback((mode: string) => {
        setSortMode(mode);

        // If switching to custom, reload from backend to get the saved order
        if (mode === 'custom') {
            onReload(true); // Silent reload
            return;
        }

        const newOrder = [...images];
        switch (mode) {
            case 'name':
                newOrder.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
                break;
            case 'dateDesc':
                newOrder.sort((a, b) => (b.modTime || 0) - (a.modTime || 0));
                break;
            case 'dateAsc':
                newOrder.sort((a, b) => (a.modTime || 0) - (b.modTime || 0));
                break;
        }
        onImagesChange(newOrder);
    }, [images, onImagesChange, onReload]);

    const handleReset = useCallback(async () => {
        if (!folderPath || !confirm('Are you sure you want to reset the custom order?')) return;

        try {
            await ImageOrderAPI.resetImageOrder(folderPath);
            onHasCustomOrderChange(false);
            onReload();
        } catch (error) {
            console.error('Failed to reset order:', error);
        }
    }, [folderPath, onHasCustomOrderChange, onReload]);

    // Set initial sort mode when hasCustomOrder changes
    const setInitialSortMode = useCallback((hasCustom: boolean) => {
        if (hasCustom) {
            setSortMode('custom');
        }
    }, []);

    return {
        sortMode,
        setSortMode,
        handleSort,
        handleReset,
        setInitialSortMode,
    };
}
