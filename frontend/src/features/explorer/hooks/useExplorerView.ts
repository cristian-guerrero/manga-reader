import { useState, useEffect, useRef, useCallback } from 'react';
import { FolderViewModeAPI } from '@services/api/folderViewModeAPI';
import { FolderGridSizeAPI } from '@services/api/folderGridSizeAPI';
import { UIPreferencesAPI } from '@services/api/uiPreferencesAPI';
import type { ViewMode } from '../types';

export function useExplorerView(currentPath: string | null) {
    // Start with null to prevent flash of wrong default before backend responds
    const [viewMode, setViewModeInternal] = useState<ViewMode | null>(null);
    const [gridItemSize, setGridItemSizeInternal] = useState<number | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const currentPathRef = useRef(currentPath);
    currentPathRef.current = currentPath;

    useEffect(() => {
        setViewModeInternal(null);
        setGridItemSizeInternal(null);
        setIsLoaded(false);

        const load = async () => {
            try {
                if (!currentPath) {
                    const mode = await UIPreferencesAPI.getExplorerRootViewMode();
                    if (currentPathRef.current === currentPath) {
                        const validMode: ViewMode = (mode === 'grid' || mode === 'list') ? mode : 'grid';
                        setViewModeInternal(validMode);
                        setGridItemSizeInternal(200);
                    }
                } else {
                    const [mode, size] = await Promise.all([
                        FolderViewModeAPI.getFolderViewMode(currentPath),
                        FolderGridSizeAPI.getFolderGridSize(currentPath),
                    ]);
                    if (currentPathRef.current === currentPath) {
                        const validMode: ViewMode = (mode === 'grid' || mode === 'list') ? mode : 'grid';
                        setViewModeInternal(validMode);
                        if (size != null && size > 0) {
                            setGridItemSizeInternal(size);
                        }
                    }
                }
            } catch {
                if (currentPathRef.current === currentPath) {
                    setViewModeInternal('grid');
                    setGridItemSizeInternal(200);
                }
            }
            if (currentPathRef.current === currentPath) {
                setIsLoaded(true);
            }
        };
        load();
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

    return { viewMode, setViewMode, gridItemSize, setGridItemSize, isLoaded };
}
