import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigationStore } from '../../stores/navigationStore';
import { GridContainer } from '../common/GridContainer';
import { GridItem } from '../common/GridItem';

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
}

export function ThumbnailsPage({ folderPath }: ThumbnailsPageProps) {
    const { t } = useTranslation();
    const { goBack, navigate } = useNavigationStore();
    const [images, setImages] = useState<ImageData[]>([]);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [hasCustomOrder, setHasCustomOrder] = useState(false);
    const [originalOrder, setOriginalOrder] = useState<string[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [sortMode, setSortMode] = useState<string>('name'); // 'name', 'dateDesc', 'dateAsc', 'custom'

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

    // Scroll preservation
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { thumbnailScrollPositions, setThumbnailScrollPosition } = useNavigationStore();
    const hasRestoredScroll = useRef<string | null>(null);

    // Restore scroll position
    useEffect(() => {
        if (!folderPath || isLoading || images.length === 0) return;

        // Only restore scroll once per folder load session
        if (hasRestoredScroll.current === folderPath) return;

        const savedPosition = thumbnailScrollPositions[folderPath];
        if (savedPosition !== undefined && savedPosition > 0 && scrollContainerRef.current) {
            console.log(`[ThumbnailsPage] Attempting to restore scroll to ${savedPosition} for ${folderPath}`);

            // Multiple attempts to ensure layout is ready
            let attempts = 0;
            const maxAttempts = 10; // Increased attempts

            const tryRestore = () => {
                const container = scrollContainerRef.current;
                if (!container) return;

                // Check if we can actually scroll to that position yet
                // The scrollHeight must be large enough to reach savedPosition
                const maxScroll = container.scrollHeight - container.clientHeight;
                if (maxScroll >= savedPosition || attempts >= maxAttempts) {
                    container.scrollTop = savedPosition;
                    if (container.scrollTop > 0 || savedPosition === 0) {
                        console.log(`[ThumbnailsPage] Restored scroll to ${container.scrollTop} after ${attempts + 1} attempts`);
                        hasRestoredScroll.current = folderPath;
                    } else if (attempts < maxAttempts) {
                        // Still 0 but we wanted more, keep trying
                        attempts++;
                        setTimeout(tryRestore, 50 + (attempts * 20));
                    }
                } else {
                    attempts++;
                    // Exponential backoff-ish
                    setTimeout(tryRestore, 50 + (attempts * 20));
                }
            };

            setTimeout(tryRestore, 50);
        } else {
            // Even if no saved position or position is 0, mark as "restored"
            hasRestoredScroll.current = folderPath;
        }
    }, [folderPath, isLoading, images.length, thumbnailScrollPositions]);

    // Reset restoration flag when folder changes
    useEffect(() => {
        if (folderPath !== hasRestoredScroll.current) {
            hasRestoredScroll.current = null;
        }
    }, [folderPath]);

    // Proactive scroll saving
    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (container && folderPath && !isLoading && images.length > 0) {
            const currentPos = container.scrollTop;
            // Only save if it's been restored or we are moving away from 0
            if (hasRestoredScroll.current === folderPath) {
                setThumbnailScrollPosition(folderPath, currentPos);
            }
        }
    }, [folderPath, isLoading, images.length, setThumbnailScrollPosition]);

    // Load images
    useEffect(() => {
        if (!folderPath) return;
        loadImages();
    }, [folderPath]);

    const loadImages = async (silent = false) => {
        if (!folderPath) return;

        if (!silent) setIsLoading(true);
        try {
            // @ts-ignore - Wails generated bindings
            const imageList = await window.go?.main?.App?.GetImages(folderPath);
            if (imageList && Array.isArray(imageList)) {
                setImages(imageList);
                if (imageList.length > 0) {
                    console.log('First image debug:', imageList[0], 'ModTime:', imageList[0].modTime);
                }

                // Load thumbnails from image metadata
                const initialThumbs: Record<string, string> = {};
                for (const img of imageList) {
                    if (img.thumbnailUrl) {
                        initialThumbs[img.path] = img.thumbnailUrl;
                    }
                }
                setThumbnails(initialThumbs);
            }

            // Check if custom order exists
            // @ts-ignore - Wails generated bindings
            const hasCustom = await window.go?.main?.App?.HasCustomOrder(folderPath);
            setHasCustomOrder(hasCustom || false);

            // Get the original order from backend (if it exists)
            // @ts-ignore - Wails generated bindings
            const origOrder = await window.go?.main?.App?.GetOriginalOrder(folderPath);
            if (origOrder && Array.isArray(origOrder)) {
                setOriginalOrder(origOrder);
            } else if (imageList && Array.isArray(imageList)) {
                // If no original order saved yet, use current file system order
                // (which is what GetImages returns when there's no custom order)
                setOriginalOrder(imageList.map((img: ImageData) => img.name));
            }

            // Set initial sort mode
            if (hasCustom) {
                setSortMode('custom');
            } else if (!silent) {
                // Only reset to name if we are doing a full load, otherwise keep current? 
                // Actually for now let's just keep the logic simple.
                // If we are reloading for 'custom' switch, hasCustom will be true.
                setSortMode('name');
            }
        } catch (error) {
            console.error('Failed to load images:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadThumbnail = async (path: string) => {
        try {
            // @ts-ignore - Wails generated bindings
            const thumb = await window.go?.main?.App?.GetThumbnail(path);
            if (thumb) {
                setThumbnails((prev) => ({ ...prev, [path]: thumb }));
            }
        } catch (error) {
            // Silently fail
        }
    };

    const handleSort = (mode: string) => {
        setSortMode(mode);

        // If switching to custom, reload from backend to get the saved order
        if (mode === 'custom') {
            loadImages(true); // Silent reload
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
        setImages(newOrder);
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            const oldIndex = images.findIndex((item) => item.path === active.id);
            const newIndex = images.findIndex((item) => item.path === over.id);
            const newOrder = arrayMove(images, oldIndex, newIndex);

            setImages(newOrder);
            setHasCustomOrder(true);
            setSortMode('custom');

            // Auto-save the new order
            if (folderPath) {
                try {
                    const customOrder = newOrder.map((img) => img.name);
                    // @ts-ignore - Wails generated bindings
                    await window.go?.main?.App?.SaveImageOrder(folderPath, customOrder, originalOrder);
                    console.log('Order auto-saved');
                } catch (error) {
                    console.error('Failed to auto-save order:', error);
                }
            }
        }
    };

    const handleReset = async () => {
        if (!folderPath || !confirm(t('thumbnails.confirmReset'))) return;

        try {
            // @ts-ignore - Wails generated bindings
            await window.go?.main?.App?.ResetImageOrder(folderPath);
            setHasCustomOrder(false);
            loadImages();
        } catch (error) {
            console.error('Failed to reset order:', error);
        }
    };

    const handleImageClick = (index: number) => {
        if (folderPath) {
            // Explicitly save scroll position before navigating
            if (scrollContainerRef.current) {
                const pos = scrollContainerRef.current.scrollTop;
                console.log(`[ThumbnailsPage] Saving scroll position (click): ${pos}`);
                setThumbnailScrollPosition(folderPath, pos);
            }
            navigate('viewer', { folder: folderPath, startIndex: String(index) });
        }
    };

    const activeImage = activeId
        ? images.find((img) => img.path === activeId)
        : null;

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
                            onClick={handleReset}
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
                    <div className="flex items-center justify-center h-full">
                        <div
                            className="w-12 h-12 border-4 rounded-full animate-spin"
                            style={{
                                borderColor: 'var(--color-accent)',
                                borderTopColor: 'transparent',
                            }}
                        />
                    </div>
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
}

function SortableItem({ image, index, thumbnail, onImageClick }: SortableItemProps) {
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
}

function ThumbnailCard({
    image,
    index,
    thumbnail,
    isDragging,
    onImageClick,
    dragHandleProps,
}: ThumbnailCardProps) {
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
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt={image.name}
                        className="w-full h-full object-cover"
                        draggable={false}
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
}

export default ThumbnailsPage;
