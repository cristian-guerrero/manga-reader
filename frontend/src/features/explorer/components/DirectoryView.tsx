import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DndContext,
    closestCenter,
    DragOverlay,
} from '@dnd-kit/core';
import {
    SortableContext,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GridItem, GridContainer, Tooltip, MediaTile } from '@shared/components';
import { SortableEntryTile } from './SortableEntryTile';
import { ExplorerListItem } from './ExplorerListItem';
import type { ExplorerEntry, ViewMode } from '../types';
import type { SensorDescriptor, SensorOptions } from '@dnd-kit/core';

interface DirectoryViewProps {
    entries: ExplorerEntry[];
    thumbnails: Record<string, string>;
    isCustomMode: boolean;
    directoryEntries: ExplorerEntry[];
    sensors: SensorDescriptor<SensorOptions>[];
    onDragStart: (event: any) => void;
    onDragEnd: (event: any) => void;
    activeEntry: ExplorerEntry | null;
    onItemClick: (entry: ExplorerEntry) => void;
    onItemAuxClick: (e: React.MouseEvent, entry: ExplorerEntry) => void;
    onItemContextMenu: (e: React.MouseEvent, entry: ExplorerEntry) => void;
    onLoadThumbnail: (path: string, coverImage: string) => Promise<void>;
    onOpenViewer: (path: string, e: React.MouseEvent) => void;
    viewMode: ViewMode;
    gridItemSize: number;
    pinnedFolders?: string[];
    justPinned?: string | null;
    hasPinnedFolders?: boolean;
    pinnedImages?: string[];
    justPinnedImage?: string | null;
    hasPinnedImages?: boolean;
}

function renderFooterLeft(entry: ExplorerEntry, t: (key: string) => string) {
    return (
        <span className="text-xs text-white/50">
            {entry.isDirectory
                ? entry.hasImages
                    ? `${entry.imageCount} ${t("explorer.images")}${entry.subdirectoryCount > 0 ? ` · ${entry.subdirectoryCount} ${t("explorer.subfolders")}` : ""}`
                    : entry.subdirectoryCount > 0
                        ? `${entry.subdirectoryCount} ${t("explorer.subfolders")}`
                        : t("explorer.folder")
                : t("explorer.file")}
        </span>
    );
}

function renderFooterRight(entry: ExplorerEntry, onOpenViewer: (path: string, e: React.MouseEvent) => void, t: (key: string) => string) {
    return (
        <div className="flex items-center gap-1">
            {entry.hasImages && (
                <Tooltip
                    content={t("explorer.openInViewer")}
                    placement="left"
                >
                    <button
                        onClick={(e) => onOpenViewer(entry.path, e)}
                        className="p-1.5 rounded-full bg-accent text-white hover:bg-accent-hover transform hover:scale-110 transition-all opacity-0 group-hover/tile:opacity-100"
                        aria-label={t("explorer.openInViewer")}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </button>
                </Tooltip>
            )}
        </div>
    );
}

const fallbackIcon = (
    <svg
        className="w-12 h-12 text-accent/40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
    >
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
);

function PinnedSortableTile({
    entry,
    thumbnail,
    onClick,
    onAuxClick,
    onContextMenu,
    onVisible,
    footerLeft,
    footerRight,
    fallbackIcon,
    isJustPinned,
}: {
    entry: ExplorerEntry;
    thumbnail?: string;
    onClick: () => void;
    onAuxClick: (e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onVisible: () => Promise<void>;
    footerLeft: React.ReactNode;
    footerRight: React.ReactNode;
    fallbackIcon: React.ReactNode;
    isJustPinned: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: entry.path });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const wrapperClass = ['pinned-folder-glow', isJustPinned ? 'pinned-folder-slide-up' : ''].filter(Boolean).join(' ');

    return (
        <div ref={setNodeRef} style={style}>
            <div className={wrapperClass}>
                <MediaTile
                    id={entry.path}
                    name={entry.name}
                    thumbnail={thumbnail}
                    onClick={onClick}
                    onAuxClick={onAuxClick}
                    onContextMenu={onContextMenu}
                    onVisible={onVisible}
                    footerLeft={footerLeft}
                    footerRight={footerRight}
                    fallbackIcon={fallbackIcon}
                    isDragging={isDragging}
                    dragHandleProps={{ ...attributes, ...listeners }}
                />
            </div>
        </div>
    );
}

export function DirectoryView({
    entries,
    thumbnails,
    isCustomMode,
    directoryEntries,
    sensors,
    onDragStart,
    onDragEnd,
    activeEntry,
    onItemClick,
    onItemAuxClick,
    onItemContextMenu,
    onLoadThumbnail,
    onOpenViewer,
    viewMode,
    gridItemSize,
    pinnedFolders = [],
    justPinned = null,
    hasPinnedFolders = false,
    pinnedImages = [],
    justPinnedImage = null,
    hasPinnedImages = false,
}: DirectoryViewProps) {
    const { t } = useTranslation();

    const renderGridEntry = useCallback((entry: ExplorerEntry) => {
        const thumb = entry.thumbnailUrl || thumbnails[entry.path];
        const isSortable = isCustomMode;
        const isPinnedFolder = entry.isDirectory && pinnedFolders.includes(entry.name);
        const isPinnedImage = !entry.isDirectory && pinnedImages.includes(entry.name);
        const isJustPinnedFolder = entry.name === justPinned;
        const isJustPinnedImage = entry.name === justPinnedImage;

        const commonProps = {
            id: entry.path,
            name: entry.name,
            thumbnail: thumb,
            onClick: () => onItemClick(entry),
            onAuxClick: (e: React.MouseEvent) => onItemAuxClick(e, entry),
            onContextMenu: (e: React.MouseEvent) => onItemContextMenu(e, entry),
            onVisible: async () => {
                if (!entry.coverImage || thumb) return;
                await onLoadThumbnail(entry.path, entry.coverImage);
            },
            footerLeft: renderFooterLeft(entry, t),
            footerRight: renderFooterRight(entry, onOpenViewer, t),
            fallbackIcon,
        };

        const isPinned = isPinnedFolder || isPinnedImage;
        const isJustPinned = isJustPinnedFolder || isJustPinnedImage;
        const glowClass = isPinned ? 'pinned-folder-glow' : '';
        const animateClass = isJustPinned ? 'pinned-folder-slide-up' : '';
        const wrapperClass = [glowClass, animateClass].filter(Boolean).join(' ');

        if (isSortable) {
            return (
                <GridItem key={entry.path} width={gridItemSize}>
                    <div className={wrapperClass}>
                        <SortableEntryTile
                            entry={entry}
                            thumbnail={thumb}
                            onClick={() => onItemClick(entry)}
                            onAuxClick={(e: React.MouseEvent) => onItemAuxClick(e, entry)}
                            onContextMenu={(e: React.MouseEvent) => onItemContextMenu(e, entry)}
                            onVisible={async () => {
                                if (!entry.coverImage || thumb) return;
                                await onLoadThumbnail(entry.path, entry.coverImage);
                            }}
                            footerLeft={renderFooterLeft(entry, t)}
                            footerRight={renderFooterRight(entry, onOpenViewer, t)}
                            fallbackIcon={fallbackIcon}
                            isPinned={isPinned}
                        />
                    </div>
                </GridItem>
            );
        }

        if (isPinned) {
            return (
                <GridItem key={entry.path} width={gridItemSize}>
                    <PinnedSortableTile
                        entry={entry}
                        thumbnail={thumb}
                        onClick={() => onItemClick(entry)}
                        onAuxClick={(e: React.MouseEvent) => onItemAuxClick(e, entry)}
                        onContextMenu={(e: React.MouseEvent) => onItemContextMenu(e, entry)}
                        onVisible={async () => {
                            if (!entry.coverImage || thumb) return;
                            await onLoadThumbnail(entry.path, entry.coverImage);
                        }}
                        footerLeft={renderFooterLeft(entry, t)}
                        footerRight={renderFooterRight(entry, onOpenViewer, t)}
                        fallbackIcon={fallbackIcon}
                        isJustPinned={isJustPinned}
                    />
                </GridItem>
            );
        }

        return (
            <GridItem key={entry.path} width={gridItemSize}>
                <div className={wrapperClass}>
                    <MediaTile {...commonProps} />
                </div>
            </GridItem>
        );
    }, [entries, thumbnails, isCustomMode, pinnedFolders, pinnedImages, justPinned, justPinnedImage, onItemClick, onItemAuxClick, onItemContextMenu, onLoadThumbnail, onOpenViewer, t, gridItemSize]);

    const renderListEntry = useCallback((entry: ExplorerEntry) => {
        const thumb = entry.thumbnailUrl || thumbnails[entry.path];
        return (
            <ExplorerListItem
                key={entry.path}
                entry={entry}
                thumbnail={thumb}
                onClick={() => onItemClick(entry)}
                onAuxClick={(e: React.MouseEvent) => onItemAuxClick(e, entry)}
                onContextMenu={(e: React.MouseEvent) => onItemContextMenu(e, entry)}
                onOpenViewer={onOpenViewer}
            />
        );
    }, [entries, thumbnails, onItemClick, onItemAuxClick, onItemContextMenu, onOpenViewer]);

    if (viewMode === 'list') {
        return (
            <div className="space-y-3">
                {entries.map(renderListEntry)}
            </div>
        );
    }

    const renderContent = () => entries.map(renderGridEntry);

    const allSortableEntries = isCustomMode ? entries : entries;

    if (allSortableEntries.length > 0) {
        const sortableIds = allSortableEntries.map((e) => e.path);
        return (
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
            >
                <SortableContext
                    items={sortableIds}
                    strategy={rectSortingStrategy}
                >
                    <GridContainer itemWidth={gridItemSize} className="pt-4">{renderContent()}</GridContainer>
                </SortableContext>
                <DragOverlay adjustScale={false} dropAnimation={null}>
                    {activeEntry ? (
                        <MediaTile
                            id={activeEntry.path}
                            name={activeEntry.name}
                            thumbnail={activeEntry.thumbnailUrl || thumbnails[activeEntry.path]}
                            isDragging
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>
        );
    }

    return <GridContainer itemWidth={gridItemSize} className="pt-4">{renderContent()}</GridContainer>;
}
