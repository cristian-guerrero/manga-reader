/**
 * useExplorerSorting - Hook to handle sorting and preferences
 * Extracted from ExplorerPage to improve separation of concerns
 */

import { useState, useEffect, useRef } from 'react';

// Helper functions for sort preferences per path
const getSortPreferences = (path: string | null) => {
    const key = path || 'root';
    try {
        const stored = localStorage.getItem('explorer_sortPreferences');
        if (stored) {
            const prefs = JSON.parse(stored);
            return prefs[key] || { sortBy: 'name', sortOrder: 'asc' };
        }
    } catch (e) {
        console.error('Failed to load sort preferences', e);
    }
    return { sortBy: 'name', sortOrder: 'asc' };
};

const saveSortPreferences = (path: string | null, sortBy: 'name' | 'date', sortOrder: 'asc' | 'desc') => {
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
}

export function useExplorerSorting({ currentPath }: UseExplorerSortingOptions) {
    const [sortBy, setSortBy] = useState<'name' | 'date'>(() => {
        return getSortPreferences(null).sortBy;
    });
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
        return getSortPreferences(null).sortOrder;
    });

    // Track if preferences have been loaded for current path
    const preferencesLoadedRef = useRef(false);

    // Load sort preferences when path changes
    useEffect(() => {
        const prefs = getSortPreferences(currentPath);
        setSortBy(prefs.sortBy);
        setSortOrder(prefs.sortOrder);
        preferencesLoadedRef.current = true;
    }, [currentPath]);

    // Save sort preference when it changes (but only after initial load)
    useEffect(() => {
        if (preferencesLoadedRef.current) {
            saveSortPreferences(currentPath, sortBy, sortOrder);
        }
    }, [sortBy, sortOrder, currentPath]);

    return {
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
    };
}
