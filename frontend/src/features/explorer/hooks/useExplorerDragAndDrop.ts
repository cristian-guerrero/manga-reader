import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { FolderOrderAPI } from '@services/api/folderOrderAPI';
import { ImageOrderAPI } from '@services/api/imageOrderAPI';
import type { ExplorerEntry } from '../types';

interface UseExplorerDragAndDropOptions {
    parentPath: string | null;
    entries: ExplorerEntry[];
    onEntriesChange: (entries: ExplorerEntry[]) => void;
    onSortModeChange: (mode: string) => void;
    sortOrder?: 'asc' | 'desc';
    pinnedFolders?: string[];
    pinnedImages?: string[];
    sortMode?: string;
    onPinnedOrderChange?: (newOrder: string[]) => void;
    onPinnedImagesOrderChange?: (newOrder: string[]) => void;
}

export function useExplorerDragAndDrop({
    parentPath,
    entries,
    onEntriesChange,
    onSortModeChange,
    sortOrder = 'asc',
    pinnedFolders = [],
    pinnedImages = [],
    sortMode = 'name',
    onPinnedOrderChange,
    onPinnedImagesOrderChange,
}: UseExplorerDragAndDropOptions) {
    const [activeId, setActiveId] = useState<string | null>(null);

    const parentPathRef = useRef(parentPath);
    const entriesRef = useRef(entries);
    const onEntriesChangeRef = useRef(onEntriesChange);
    const onSortModeChangeRef = useRef(onSortModeChange);
    const sortOrderRef = useRef(sortOrder);
    const pinnedFoldersRef = useRef(pinnedFolders);
    const pinnedImagesRef = useRef(pinnedImages);
    const sortModeRef = useRef(sortMode);
    const onPinnedOrderChangeRef = useRef(onPinnedOrderChange);
    const onPinnedImagesOrderChangeRef = useRef(onPinnedImagesOrderChange);

    // Single effect to sync all refs (avoids 10 individual useEffect hooks)
    useEffect(() => {
        parentPathRef.current = parentPath;
        entriesRef.current = entries;
        onEntriesChangeRef.current = onEntriesChange;
        onSortModeChangeRef.current = onSortModeChange;
        sortOrderRef.current = sortOrder;
        pinnedFoldersRef.current = pinnedFolders;
        pinnedImagesRef.current = pinnedImages;
        sortModeRef.current = sortMode;
        onPinnedOrderChangeRef.current = onPinnedOrderChange;
        onPinnedImagesOrderChangeRef.current = onPinnedImagesOrderChange;
    }); // no deps — runs after every render, always in sync

    const directoryEntries = useMemo(
        () => entries.filter((e) => e.isDirectory),
        [entries],
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            const currentEntries = entriesRef.current;
            const draggedEntry = currentEntries.find((e) => e.path === active.id);
            const targetEntry = currentEntries.find((e) => e.path === over.id);
            if (!draggedEntry || !targetEntry) return;

            const draggedIsDir = draggedEntry.isDirectory;
            const targetIsDir = targetEntry.isDirectory;

            // Both are directories → folder DnD
            if (draggedIsDir && targetIsDir) {
                const dirEntries = currentEntries.filter((e) => e.isDirectory);
                const oldIndex = dirEntries.findIndex((item) => item.path === active.id);
                const newIndex = dirEntries.findIndex((item) => item.path === over.id);
                if (oldIndex === -1 || newIndex === -1) return;

                const draggedName = dirEntries[oldIndex].name;
                const targetName = dirEntries[newIndex].name;
                const currentPinned = pinnedFoldersRef.current;
                const isDraggedPinned = currentPinned.includes(draggedName);
                const isTargetPinned = currentPinned.includes(targetName);

                if (isDraggedPinned && isTargetPinned) {
                    const pinnedOldIndex = currentPinned.indexOf(draggedName);
                    const pinnedNewIndex = currentPinned.indexOf(targetName);
                    if (pinnedOldIndex === -1 || pinnedNewIndex === -1) return;

                    const newPinnedOrder = arrayMove(currentPinned, pinnedOldIndex, pinnedNewIndex);
                    const pinnedEntries = dirEntries.filter((e) => newPinnedOrder.includes(e.name));
                    const unpinnedEntries = dirEntries.filter((e) => !newPinnedOrder.includes(e.name));
                    const sortedPinned = newPinnedOrder.map((name) => pinnedEntries.find((e) => e.name === name)!);
                    const newDirOrder = [...sortedPinned, ...unpinnedEntries];
                    const files = currentEntries.filter((e) => !e.isDirectory);
                    const newEntries = [...newDirOrder, ...files];

                    onEntriesChangeRef.current(newEntries);
                    onPinnedOrderChangeRef.current?.(newPinnedOrder);

                    const currentParentPath = parentPathRef.current;
                    const currentSortMode = sortModeRef.current;
                    if (currentParentPath) {
                        try {
                            await FolderOrderAPI.reorderPinnedFolders(
                                currentParentPath,
                                currentSortMode,
                                newPinnedOrder,
                            );
                        } catch (error) {
                            console.error('[DnD] Failed to reorder pinned folders:', error);
                        }
                    }
                    return;
                }

                const newDirOrder = arrayMove(dirEntries, oldIndex, newIndex);
                const files = currentEntries.filter((e) => !e.isDirectory);
                const newEntries = [...newDirOrder, ...files];

                onEntriesChangeRef.current(newEntries);
                onSortModeChangeRef.current('custom');

                const currentParentPath = parentPathRef.current;
                if (currentParentPath) {
                    try {
                        let customOrder = newDirOrder.map((d) => d.name);
                        if (sortOrderRef.current === 'desc') {
                            customOrder = [...customOrder].reverse();
                        }
                        const originalOrder = [...dirEntries]
                            .sort((a, b) =>
                                a.name.localeCompare(b.name, undefined, {
                                    numeric: true,
                                    sensitivity: 'base',
                                }),
                            )
                            .map((d) => d.name);
                        await FolderOrderAPI.setFolderOrder(
                            currentParentPath,
                            customOrder,
                            originalOrder,
                        );
                    } catch (error) {
                        console.error('[DnD] Failed to save folder order:', error);
                    }
                }
                return;
            }

            // Both are images → image DnD
            if (!draggedIsDir && !targetIsDir) {
                const imageEntries = currentEntries.filter((e) => !e.isDirectory);
                const oldIndex = imageEntries.findIndex((item) => item.path === active.id);
                const newIndex = imageEntries.findIndex((item) => item.path === over.id);
                if (oldIndex === -1 || newIndex === -1) return;

                const draggedName = imageEntries[oldIndex].name;
                const targetName = imageEntries[newIndex].name;
                const currentPinned = pinnedImagesRef.current;
                const isDraggedPinned = currentPinned.includes(draggedName);
                const isTargetPinned = currentPinned.includes(targetName);

                if (isDraggedPinned && isTargetPinned) {
                    const pinnedOldIndex = currentPinned.indexOf(draggedName);
                    const pinnedNewIndex = currentPinned.indexOf(targetName);
                    if (pinnedOldIndex === -1 || pinnedNewIndex === -1) return;

                    const newPinnedOrder = arrayMove(currentPinned, pinnedOldIndex, pinnedNewIndex);
                    const pinnedImgs = imageEntries.filter((e) => newPinnedOrder.includes(e.name));
                    const unpinnedImgs = imageEntries.filter((e) => !newPinnedOrder.includes(e.name));
                    const sortedPinned = newPinnedOrder.map((name) => pinnedImgs.find((e) => e.name === name)!);
                    const newImageOrder = [...sortedPinned, ...unpinnedImgs];
                    const dirs = currentEntries.filter((e) => e.isDirectory);
                    const newEntries = [...dirs, ...newImageOrder];

                    onEntriesChangeRef.current(newEntries);
                    onPinnedImagesOrderChangeRef.current?.(newPinnedOrder);

                    const currentParentPath = parentPathRef.current;
                    const currentSortMode = sortModeRef.current;
                    if (currentParentPath) {
                        try {
                            await ImageOrderAPI.reorderPinnedImages(
                                currentParentPath,
                                currentSortMode,
                                newPinnedOrder,
                            );
                        } catch (error) {
                            console.error('[DnD] Failed to reorder pinned images:', error);
                        }
                    }
                    return;
                }

                const newImageOrder = arrayMove(imageEntries, oldIndex, newIndex);
                const dirs = currentEntries.filter((e) => e.isDirectory);
                const newEntries = [...dirs, ...newImageOrder];

                onEntriesChangeRef.current(newEntries);
                onSortModeChangeRef.current('custom');

                const currentParentPath = parentPathRef.current;
                if (currentParentPath) {
                    try {
                        let customOrder = newImageOrder.map((d) => d.name);
                        if (sortOrderRef.current === 'desc') {
                            customOrder = [...customOrder].reverse();
                        }
                        const originalOrder = [...imageEntries]
                            .sort((a, b) =>
                                a.name.localeCompare(b.name, undefined, {
                                    numeric: true,
                                    sensitivity: 'base',
                                }),
                            )
                            .map((d) => d.name);
                        await FolderOrderAPI.setFolderOrder(
                            currentParentPath,
                            customOrder,
                            originalOrder,
                        );
                    } catch (error) {
                        console.error('[DnD] Failed to save image order:', error);
                    }
                }
                return;
            }
        } else {
            console.log('[DnD] Drag cancelled (no over or same position)');
        }
    }, []);

    const activeEntry = activeId
        ? entries.find((e) => e.path === activeId) || null
        : null;

    return {
        activeId,
        activeEntry,
        directoryEntries,
        handleDragStart,
        handleDragEnd,
    };
}
