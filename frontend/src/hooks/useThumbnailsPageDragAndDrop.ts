/**
 * useThumbnailsPageDragAndDrop - Hook for drag and drop functionality in ThumbnailsPage
 */

import { useState, useCallback } from 'react';
import { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { ImageOrderAPI } from '../services/api/imageOrderAPI';

interface ImageData {
    path: string;
    name: string;
    index: number;
    modTime?: number;
}

interface UseThumbnailsPageDragAndDropOptions {
    folderPath?: string;
    images: ImageData[];
    originalOrder: string[];
    onImagesChange: (images: ImageData[]) => void;
    onHasCustomOrderChange: (hasCustom: boolean) => void;
    onSortModeChange: (mode: string) => void;
}

export function useThumbnailsPageDragAndDrop({
    folderPath,
    images,
    originalOrder,
    onImagesChange,
    onHasCustomOrderChange,
    onSortModeChange,
}: UseThumbnailsPageDragAndDropOptions) {
    const [activeId, setActiveId] = useState<string | null>(null);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            const oldIndex = images.findIndex((item) => item.path === active.id);
            const newIndex = images.findIndex((item) => item.path === over.id);
            const newOrder = arrayMove(images, oldIndex, newIndex);

            onImagesChange(newOrder);
            onHasCustomOrderChange(true);
            onSortModeChange('custom');

            // Auto-save the new order
            if (folderPath) {
                try {
                    const customOrder = newOrder.map((img) => img.name);
                    await ImageOrderAPI.saveImageOrder(folderPath, customOrder, originalOrder);
                    console.log('Order auto-saved');
                } catch (error) {
                    console.error('Failed to auto-save order:', error);
                }
            }
        }
    }, [images, folderPath, originalOrder, onImagesChange, onHasCustomOrderChange, onSortModeChange]);

    const activeImage = activeId
        ? images.find((img) => img.path === activeId)
        : null;

    return {
        activeId,
        activeImage,
        handleDragStart,
        handleDragEnd,
    };
}
