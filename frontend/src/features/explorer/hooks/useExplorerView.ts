import { useState, useEffect, useRef, useCallback } from 'react';
import { FolderViewModeAPI } from '@services/api/folderViewModeAPI';
import { FolderGridSizeAPI } from '@services/api/folderGridSizeAPI';
import { UIPreferencesAPI } from '@services/api/uiPreferencesAPI';
import type { ViewMode } from '../types';

export function useExplorerView(currentPath: string | null) {
    const [viewMode, setViewModeInternal] = useState<ViewMode>('grid');
    const [gridItemSize, setGridItemSizeInternal] = useState<number>(200);
    const currentPathRef = useRef(currentPath);
    currentPathRef.current = currentPath;

    useEffect(() => {
        if (!currentPath) {
            UIPreferencesAPI.getExplorerRootViewMode().then((mode) => {
                const validMode: ViewMode = (mode === 'grid' || mode === 'list') ? mode : 'grid';
                setViewModeInternal(validMode);
            }).catch(() => {});
            return;
        }

        FolderViewModeAPI.getFolderViewMode(currentPath).then((mode) => {
            if (currentPathRef.current === currentPath) {
                const validMode: ViewMode = (mode === 'grid' || mode === 'list') ? mode : 'grid';
                setViewModeInternal(validMode);
            }
        }).catch(() => {});

        FolderGridSizeAPI.getFolderGridSize(currentPath).then((size) => {
            if (currentPathRef.current === currentPath && size != null && size > 0) {
                setGridItemSizeInternal(size);
            }
        }).catch(() => {});
    }, [currentPath]);

    const setViewMode = useCallback((mode: ViewMode) => {
        setViewModeInternal(mode);
        const path = currentPathRef.current;
        if (path) {
            FolderViewModeAPI.setFolderViewMode(path, mode).catch(() => {});
        } else {
            UIPreferencesAPI.setExplorerRootViewMode(mode).catch(() => {});
        }
    }, []);

    const setGridItemSize = useCallback((size: number) => {
        setGridItemSizeInternal(size);
        const path = currentPathRef.current;
        if (path) {
            FolderGridSizeAPI.setFolderGridSize(path, size).catch(() => {});
        }
    }, []);

    return { viewMode, setViewMode, gridItemSize, setGridItemSize };
}
