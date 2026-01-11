import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigation } from '../../hooks';
import { GridContainer, GridItem, LoadingSpinner } from '../../shared/components';
import { useThumbnail } from '../../hooks/useThumbnail';
import { useThumbnailsPageData } from '../../hooks/useThumbnailsPageData';
import { useThumbnailsPageScroll } from '../../hooks/useThumbnailsPageScroll';
import { useThumbnailsPageSort } from '../../hooks/useThumbnailsPageSort';
import { useThumbnailsPageDragAndDrop } from '../../hooks/useThumbnailsPageDragAndDrop';

// Icons
const ResetIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
    </svg>
);

const BackIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
    </svg>
);

const CheckIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const GripIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="9" cy="5" r="1.5" />
        <circle cx="15" cy="5" r="1.5" />
        <circle cx="9" cy="12" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="19" r="1.5" />
        <circle cx="15" cy="19" r="1.5" />
    </svg>
);

interface ImageData {
    path: string;
    name: string;
    index: number;
    modTime?: number;
}

interface ThumbnailsPageProps {
    folderPath?: string;
    isActive?: boolean;
    tabId?: string;
}

export function ThumbnailsPage({ folderPath, isActive = true, tabId }: ThumbnailsPageProps) {
    const { t } = useTranslation();
    const { goBack, navigate, thumbnailScrollPositions, setThumbnailScrollPosition } = useNavigation();

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Data loading hook
    const {
        images,
        thumbnails,
        isLoading,
        hasCustomOrder,
        originalOrder,
        setImages,
        setHasCustomOrder,
        loadImages,
        handleThumbnailLoaded,
    } = useThumbnailsPageData({ folderPath });

    // Scroll management hook
    const {
        scrollContainerRef,
        handleScroll,
        saveScrollPosition,
    } = useThumbnailsPageScroll({
        folderPath,
        isLoading,
        imagesLength: images.length,
        thumbnailScrollPositions,
        setThumbnailScrollPosition,
    });

    // Sort management hook
    const {
        sortMode,
        handleSort,
        handleReset,
        setInitialSortMode,
    } = useThumbnailsPageSort({
        folderPath,
        images,
        hasCustomOrder,
        originalOrder,
        onImagesChange: setImages,
        onReload: loadImages,
        onHasCustomOrderChange: setHasCustomOrder,
    });

    // Set initial sort mode when hasCustomOrder changes
    useEffect(() => {
        setInitialSortMode(hasCustomOrder);
    }, [hasCustomOrder, setInitialSortMode]);

    // Drag and drop hook
    const {
        activeId,
        activeImage,
        handleDragStart,
        handleDragEnd,
    } = useThumbnailsPageDragAndDrop({
        folderPath,
        images,
        originalOrder,
        onImagesChange: setImages,
        onHasCustomOrderChange: setHasCustomOrder,
        onSortModeChange: (mode) => {
            // Update sort mode when drag ends
            const currentSortMode = sortMode;
            if (mode !== currentSortMode) {
                handleSort(mode);
            }
        },
    });

    const handleImageClick = (index: number) => {
        if (folderPath) {
            saveScrollPosition();
            navigate('viewer', { folder: folderPath, startIndex: String(index) });
        }
    };

    const handleResetWithConfirm = async () => {
        if (!folderPath || !confirm(t('thumbnails.confirmReset'))) return;
        await handleReset();
    };

    if (!folderPath) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <p style={{ color: 'var(--color-text-muted)' }}>{t('common.noFolderSelected')}</p>
                <button
                    onClick={goBack}
                    className="btn-secondary transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                    {t('common.back')}
                </button>
            </div>
        );
    }

    return (
        <div
            className="h-full flex flex-col"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-6 py-4 border-b"
                style={{ borderColor: 'var(--color-border)' }}
            >
                <div className="flex items-center gap-4">
                    <button
                        onClick={goBack}
                        className="btn-icon btn-ghost transition-transform hover:scale-110 active:scale-90"
                    >
                        <BackIcon />
                    </button>
                    <div>
                        <h1
                            className="text-xl font-bold"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            {t('thumbnails.title')}
                        </h1>
                        <p
                            className="text-sm"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            {images.length} {t('folders.images')} • {t('thumbnails.dragToReorder')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-surface-secondary/50 rounded-lg p-1 border border-white/5">
                        <select
                            value={sortMode}
                            onChange={(e) => handleSort(e.target.value)}
                            className="bg-transparent text-sm text-text-primary focus:outline-none border-none cursor-pointer py-1 px-2"
                            style={{ backgroundImage: 'none' }}
                        >
                            <option value="name" className="bg-surface-secondary text-text-primary">Name</option>
                            <option value="dateDesc" className="bg-surface-secondary text-text-primary">Date (Newest)</option>
                            <option value="dateAsc" className="bg-surface-secondary text-text-primary">Date (Oldest)</option>
                            {hasCustomOrder && <option value="custom" className="bg-surface-secondary text-text-primary">Custom Order</option>}
                        </select>
                    </div>
                    {hasCustomOrder && (
                        <button
                            onClick={handleResetWithConfirm}
                            className="btn-ghost flex items-center gap-2 text-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <ResetIcon />
                            {t('thumbnails.resetOrder')}
                        </button>
                    )}
                </div>
            </div>

            {/* Thumbnail grid */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-auto p-6"
            >
                {isLoading ? (
                    <LoadingSpinner size="lg" fullHeight={false} />
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={images.map((img) => img.path)}
                            strategy={rectSortingStrategy}
                        >
                            <GridContainer variant="thumbnails">
                                {images.map((image, index) => (
                                    <GridItem key={image.path}>
                                        <SortableItem
                                            image={image}
                                            index={index}
                                            thumbnail={thumbnails[image.path]}
                                            onImageClick={handleImageClick}
                                            onThumbnailLoaded={handleThumbnailLoaded}
                                        />
                                    </GridItem>
                                ))}
                            </GridContainer>
                        </SortableContext>

                        {/* Drag overlay */}
                        <DragOverlay adjustScale={true}>
                            {activeImage ? (
                                <ThumbnailCard
                                    image={activeImage}
                                    index={images.indexOf(activeImage)}
                                    thumbnail={thumbnails[activeImage.path]}
                                    isDragging
                                    onThumbnailLoaded={handleThumbnailLoaded}
                                />
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>
        </div>
    );
}

// Sortable item wrapper
interface SortableItemProps {
    image: ImageData;
    index: number;
    thumbnail?: string;
    onImageClick: (index: number) => void;
    onThumbnailLoaded?: (path: string, thumbnail: string) => void;
}

function SortableItem({ image, index, thumbnail, onImageClick, onThumbnailLoaded }: SortableItemProps) {
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

// Thumbnail card component
interface ThumbnailCardProps {
    image: ImageData;
    index: number;
    thumbnail?: string;
    isDragging?: boolean;
    onImageClick?: (index: number) => void;
    dragHandleProps?: Record<string, any>;
    onThumbnailLoaded?: (path: string, thumbnail: string) => void;
}

const ThumbnailCard = React.memo(function ThumbnailCard({
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

export default ThumbnailsPage;
