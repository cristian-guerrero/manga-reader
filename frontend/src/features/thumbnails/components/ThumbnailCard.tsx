/**
 * ThumbnailCard - Card component for displaying a thumbnail
 */

import React, { useEffect } from 'react';
import { useThumbnail } from '@hooks/useThumbnail';
import { GripIcon } from './ThumbnailsIcons';
import type { ImageData } from '../types';

interface ThumbnailCardProps {
    image: ImageData;
    index: number;
    thumbnail?: string;
    isDragging?: boolean;
    onImageClick?: (index: number) => void;
    dragHandleProps?: Record<string, any>;
    onThumbnailLoaded?: (path: string, thumbnail: string) => void;
}

export const ThumbnailCard = React.memo(function ThumbnailCard({
    image,
    index,
    thumbnail: initialThumbnail,
    isDragging,
    onImageClick,
    dragHandleProps,
    onThumbnailLoaded,
}: ThumbnailCardProps) {
    // Usar hook lazy para cargar thumbnail si no está disponible inicialmente
    const { thumbnail: lazyThumbnail, isLoading, ref: thumbnailRef } = useThumbnail(
        !initialThumbnail ? image.path : null, // Solo cargar si no hay thumbnail inicial
        initialThumbnail, // Usar thumbnail inicial si está disponible
        {
            rootMargin: '200px', // Cargar un poco antes de que sea visible
            enabled: !initialThumbnail, // Solo habilitar si no hay thumbnail inicial
        }
    );

    // El thumbnail final es el inicial o el lazy cargado
    const thumbnail = initialThumbnail || lazyThumbnail;

    // Notificar cuando se carga el thumbnail lazy
    useEffect(() => {
        if (lazyThumbnail && onThumbnailLoaded && !initialThumbnail) {
            onThumbnailLoaded(image.path, lazyThumbnail);
        }
    }, [lazyThumbnail, image.path, onThumbnailLoaded, initialThumbnail]);

    return (
        <div
            className={`relative group ${isDragging ? 'shadow-2xl' : ''} animate-scale-in`}
            style={{ animationDelay: `${index * 0.01}s` }}
        >
            <div
                className="aspect-[3/4] rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-transform hover:scale-[1.02]"
                style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    border: isDragging ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
                }}
                {...dragHandleProps}
            >
                {/* Wrapper para IntersectionObserver */}
                <div ref={thumbnailRef} className="w-full h-full">
                    {thumbnail ? (
                        <img
                            src={thumbnail}
                            alt={image.name}
                            className="w-full h-full object-cover transition-opacity duration-300"
                            draggable={false}
                            loading="lazy"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full shimmer">
                            <div
                                className="w-8 h-8 border-2 rounded-full animate-spin"
                                style={{
                                    borderColor: 'var(--color-accent)',
                                    borderTopColor: 'transparent',
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Index badge */}
                <div
                    className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold"
                    style={{
                        backgroundColor: 'var(--color-surface-overlay)',
                        color: 'var(--color-text-primary)',
                    }}
                >
                    {index + 1}
                </div>

                {/* Drag indicator */}
                <div
                    className="absolute top-2 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                        backgroundColor: 'var(--color-surface-overlay)',
                        color: 'var(--color-text-primary)',
                    }}
                >
                    <GripIcon />
                </div>

                {/* Click overlay for viewing */}
                {onImageClick && (
                    <div
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onImageClick(index);
                        }}
                    >
                        <div
                            className="px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-transform hover:scale-110 active:scale-90"
                            style={{
                                backgroundColor: 'var(--color-accent)',
                                color: 'white',
                            }}
                        >
                            View
                        </div>
                    </div>
                )}
            </div>

            {/* Filename */}
            <p
                className="mt-2 text-xs truncate text-center"
                style={{ color: 'var(--color-text-muted)' }}
            >
                {image.name}
            </p>
        </div>
    );
}, (prevProps, nextProps) => {
    // Comparación personalizada para evitar re-renders innecesarios
    return (
        prevProps.image.path === nextProps.image.path &&
        prevProps.index === nextProps.index &&
        prevProps.thumbnail === nextProps.thumbnail &&
        prevProps.isDragging === nextProps.isDragging
    );
});
