/**
 * useExplorerSorting - Hook to handle sorting and preferences
 * Extracted from ExplorerPage to improve separation of concerns
 */

import { useState, useEffect, useRef } from 'react';
import { FolderOrderAPI } from '@services/api/folderOrderAPI';

type SortBy = 'name' | 'date' | 'custom';

// Helper functions for sort preferences per path
const getSortPreferences = (path: string | null) => {
    const key = path || 'root';
    try {
        const stored = localStorage.getItem('explorer_sortPreferences');
        if (stored) {
            const prefs = JSON.parse(stored);
            return prefs[key] || { sortBy: 'name' as SortBy, sortOrder: 'asc' as const };
        }
    } catch (e) {
        console.error('Failed to load sort preferences', e);
    }
    return { sortBy: 'name' as SortBy, sortOrder: 'asc' as const };
};

const saveSortPreferences = (path: string | null, sortBy: SortBy, sortOrder: 'asc' | 'desc') => {
    const key = path || 'root';
    try {
        const stored = localStorage.getItem('explorer_sortPreferences');
        const prefs = stored ? JSON.parse(stored) : {};
        prefs[key] = { sortBy, sortOrder };
        localStorage.setItem('explorer_sortPreferences', JSON.stringify(prefs));
    } catch (e) {
        console.error('Failed to save sort preferences', e);
    }
};

interface UseExplorerSortingOptions {
    currentPath: string | null;
    onCustomOrderDetected?: () => void;
}

export function useExplorerSorting({ currentPath, onCustomOrderDetected }: UseExplorerSortingOptions) {
    const [sortBy, setSortBy] = useState<SortBy>(() => {
        return getSortPreferences(null).sortBy;
    });
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
        return getSortPreferences(null).sortOrder;
    });

    // Track if preferences have been loaded for current path
    const preferencesLoadedRef = useRef(false);

    // Load sort preferences when path changes, and check backend for custom order
    useEffect(() => {
        const prefs = getSortPreferences(currentPath);
        setSortBy(prefs.sortBy);
        setSortOrder(prefs.sortOrder);
        preferencesLoadedRef.current = true;

        // If preferences say 'custom', verify backend still has it
        if (prefs.sortBy === 'custom' && currentPath) {
            FolderOrderAPI.hasFolderCustomOrder(currentPath).then((hasCustom) => {
                if (!hasCustom && prefs.sortBy === 'custom') {
                    setSortBy('name');
                }
            });
        }
    }, [currentPath]);

    // Save sort preference when it changes (but only after initial load)
    useEffect(() => {
        if (preferencesLoadedRef.current) {
            saveSortPreferences(currentPath, sortBy, sortOrder);
        }
    }, [sortBy, sortOrder, currentPath]);

    const handleSortByChange = (value: SortBy) => {
        if (value === 'custom' && onCustomOrderDetected) {
            onCustomOrderDetected();
        }
        setSortBy(value);
    };

    return {
        sortBy,
        setSortBy: handleSortByChange,
        sortOrder,
        setSortOrder,
    };
}

export type { SortBy };
