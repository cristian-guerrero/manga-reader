/**
 * SortableItem - Sortable wrapper for ThumbnailCard
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ThumbnailCard } from './ThumbnailCard';
import type { ImageData } from '../types';

interface SortableItemProps {
    image: ImageData;
    index: number;
    thumbnail?: string;
    onImageClick: (index: number) => void;
    onThumbnailLoaded?: (path: string, thumbnail: string) => void;
}

export function SortableItem({ image, index, thumbnail, onImageClick, onThumbnailLoaded }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: image.path });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : 0,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <ThumbnailCard
                image={image}
                index={index}
                thumbnail={thumbnail}
                onImageClick={onImageClick}
                dragHandleProps={{ ...attributes, ...listeners }}
                onThumbnailLoaded={onThumbnailLoaded}
            />
        </div>
    );
}
