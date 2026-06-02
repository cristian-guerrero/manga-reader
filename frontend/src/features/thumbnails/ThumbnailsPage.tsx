/**
 * ThumbnailsPage - Main thumbnails page refactored with hooks and components
 * Separated concerns: hooks handle logic, components handle UI
 */

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
} from '@dnd-kit/sortable';
import { useNavigation } from '@hooks';
import { GridContainer, GridItem, LoadingSpinner } from '@shared/components';
import {
    useThumbnailsPageData,
    useThumbnailsPageScroll,
    useThumbnailsPageSort,
    useThumbnailsPageDragAndDrop,
} from './hooks';
import { ThumbnailsHeader } from './components/ThumbnailsHeader';
import { SortableItem } from './components/SortableItem';
import { ThumbnailCard } from './components/ThumbnailCard';

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
            style={{ background: 'var(--gradient-surface-primary)' }}
        >
            {/* Header */}
            <ThumbnailsHeader
                imageCount={images.length}
                sortMode={sortMode}
                hasCustomOrder={hasCustomOrder}
                onBack={goBack}
                onSortChange={handleSort}
                onReset={handleResetWithConfirm}
            />

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

export default ThumbnailsPage;
