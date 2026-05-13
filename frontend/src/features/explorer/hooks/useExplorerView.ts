import { useState, useEffect, useRef, useCallback } from 'react';
import { FolderViewModeAPI } from '@services/api/folderViewModeAPI';
import type { ViewMode } from '../types';

const ROOT_STORAGE_KEY = 'explorer_viewMode';

function getRootViewMode(): ViewMode {
    const saved = localStorage.getItem(ROOT_STORAGE_KEY);
    return (saved === 'grid' || saved === 'list') ? saved : 'grid';
}

export function useExplorerView(currentPath: string | null) {
    const [viewMode, setViewModeInternal] = useState<ViewMode>(() => {
        if (currentPath) return 'grid';
        return getRootViewMode();
    });

    const currentPathRef = useRef(currentPath);
    currentPathRef.current = currentPath;

    const loadingRef = useRef(false);

    // Load view mode when path changes
    useEffect(() => {
        if (!currentPath) {
            setViewModeInternal(getRootViewMode());
            return;
        }

        loadingRef.current = true;
        FolderViewModeAPI.getFolderViewMode(currentPath).then((mode) => {
            if (currentPathRef.current === currentPath) {
                const validMode: ViewMode = (mode === 'grid' || mode === 'list') ? mode : 'grid';
                setViewModeInternal(validMode);
                loadingRef.current = false;
            }
        }).catch(() => {
            loadingRef.current = false;
        });

        return () => {
            loadingRef.current = false;
        };
    }, [currentPath]);

    const setViewMode = useCallback((mode: ViewMode) => {
        setViewModeInternal(mode);
        const path = currentPathRef.current;
        if (path) {
            FolderViewModeAPI.setFolderViewMode(path, mode).catch(() => {});
        } else {
            localStorage.setItem(ROOT_STORAGE_KEY, mode);
        }
    }, []);

    return { viewMode, setViewMode };
}
