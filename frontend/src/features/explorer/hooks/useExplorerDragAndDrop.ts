import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { FolderOrderAPI } from '@services/api/folderOrderAPI';
import type { ExplorerEntry } from '../types';

interface UseExplorerDragAndDropOptions {
    parentPath: string | null;
    entries: ExplorerEntry[];
    onEntriesChange: (entries: ExplorerEntry[]) => void;
    onSortModeChange: (mode: string) => void;
}

export function useExplorerDragAndDrop({
    parentPath,
    entries,
    onEntriesChange,
    onSortModeChange,
}: UseExplorerDragAndDropOptions) {
    const [activeId, setActiveId] = useState<string | null>(null);

    const parentPathRef = useRef(parentPath);
    useEffect(() => { parentPathRef.current = parentPath; }, [parentPath]);

    const entriesRef = useRef(entries);
    useEffect(() => { entriesRef.current = entries; }, [entries]);

    const onEntriesChangeRef = useRef(onEntriesChange);
    useEffect(() => { onEntriesChangeRef.current = onEntriesChange; }, [onEntriesChange]);

    const onSortModeChangeRef = useRef(onSortModeChange);
    useEffect(() => { onSortModeChangeRef.current = onSortModeChange; }, [onSortModeChange]);

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
            const dirEntries = currentEntries.filter((e) => e.isDirectory);

            const oldIndex = dirEntries.findIndex(
                (item) => item.path === active.id,
            );
            const newIndex = dirEntries.findIndex(
                (item) => item.path === over.id,
            );
            if (oldIndex === -1 || newIndex === -1) return;

            const newDirOrder = arrayMove(dirEntries, oldIndex, newIndex);

            const files = currentEntries.filter((e) => !e.isDirectory);
            const newEntries = [...newDirOrder, ...files];

            onEntriesChangeRef.current(newEntries);
            onSortModeChangeRef.current('custom');

            const currentParentPath = parentPathRef.current;
            if (currentParentPath) {
                try {
                    const customOrder = newDirOrder.map((d) => d.name);
                    const originalOrder = [...dirEntries]
                        .sort((a, b) =>
                            a.name.localeCompare(b.name, undefined, {
                                numeric: true,
                                sensitivity: 'base',
                            }),
                        )
                        .map((d) => d.name);
                    console.log('[DnD] Saving folder order for', currentParentPath, customOrder);
                    await FolderOrderAPI.setFolderOrder(
                        currentParentPath,
                        customOrder,
                        originalOrder,
                    );
                    console.log('[DnD] Folder order saved successfully');
                } catch (error) {
                    console.error('[DnD] Failed to save folder order:', error);
                }
            } else {
                console.warn('[DnD] parentPath is null, skipping save');
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
