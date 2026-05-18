import { useState, useEffect, useRef } from 'react';
import { FolderOrderAPI } from '@services/api/folderOrderAPI';
import { UIPreferencesAPI } from '@services/api/uiPreferencesAPI';

type SortBy = 'name' | 'date' | 'custom' | 'auto';

interface UseExplorerSortingOptions {
    currentPath: string | null;
    onCustomOrderDetected?: () => void;
    onSortReady?: (path: string | null, sortBy: string, sortOrder: string) => void;
}

export function useExplorerSorting({ currentPath, onCustomOrderDetected, onSortReady }: UseExplorerSortingOptions) {
    const [sortBy, setSortBy] = useState<SortBy>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const preferencesLoadedRef = useRef(false);

    useEffect(() => {
        let cancelled = false;
        const targetPath = currentPath;
        preferencesLoadedRef.current = false;

        const loadPrefs = async () => {
            const pref = await UIPreferencesAPI.getExplorerSortPreference(targetPath || 'root');
            if (cancelled) return;

            let resolvedSortBy = pref.sortBy as SortBy;
            let resolvedSortOrder = pref.sortOrder as 'asc' | 'desc';

            if (resolvedSortBy === 'custom' && targetPath) {
                const hasCustom = await FolderOrderAPI.hasFolderCustomOrder(targetPath);
                if (cancelled) return;
                if (!hasCustom) {
                    resolvedSortBy = 'name';
                }
            }

            if (cancelled) return;

            setSortBy(resolvedSortBy);
            setSortOrder(resolvedSortOrder);
            preferencesLoadedRef.current = true;
            onSortReady?.(targetPath, resolvedSortBy, resolvedSortOrder);
        };

        loadPrefs();

        return () => {
            cancelled = true;
        };
    }, [currentPath]);

    useEffect(() => {
        if (preferencesLoadedRef.current) {
            UIPreferencesAPI.setExplorerSortPreference(currentPath || 'root', sortBy, sortOrder).catch(() => {});
        }
    }, [sortBy, sortOrder, currentPath]);

    const handleSortByChange = (value: SortBy) => {
        if (value === 'custom' && onCustomOrderDetected) {
            onCustomOrderDetected();
        }
        setSortBy(value);
    };

    return { sortBy, setSortBy: handleSortByChange, sortOrder, setSortOrder };
}

export type { SortBy };
