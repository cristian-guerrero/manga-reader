import { useState, useEffect, useRef, useCallback } from 'react';
import { FolderViewModeAPI } from '@services/api/folderViewModeAPI';
import { UIPreferencesAPI } from '@services/api/uiPreferencesAPI';
import type { ViewMode } from '../types';

export function useExplorerView(currentPath: string | null) {
    const [viewMode, setViewModeInternal] = useState<ViewMode>('grid');
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

    return { viewMode, setViewMode };
}
