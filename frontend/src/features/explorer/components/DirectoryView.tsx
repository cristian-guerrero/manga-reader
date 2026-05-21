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
} from '@dnd-kit/sortable';
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
}: DirectoryViewProps) {
    const { t } = useTranslation();

    const renderGridEntry = useCallback((entry: ExplorerEntry) => {
        const thumb = entry.thumbnailUrl || thumbnails[entry.path];
        const isSortable = isCustomMode && entry.isDirectory;
        const isPinned = entry.isDirectory && pinnedFolders.includes(entry.name);
        const isJustPinned = entry.name === justPinned;

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

        return (
            <GridItem key={entry.path} width={gridItemSize}>
                <div className={wrapperClass}>
                    <MediaTile {...commonProps} />
                </div>
            </GridItem>
        );
    }, [entries, thumbnails, isCustomMode, pinnedFolders, justPinned, onItemClick, onItemAuxClick, onItemContextMenu, onLoadThumbnail, onOpenViewer, t, gridItemSize]);

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

    if (isCustomMode && directoryEntries.length > 0) {
        const sortableIds = directoryEntries.map((e) => e.path);
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
                <DragOverlay adjustScale={true}>
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
