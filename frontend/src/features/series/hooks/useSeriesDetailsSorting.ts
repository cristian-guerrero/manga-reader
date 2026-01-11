/**
 * useSeriesDetailsSorting - Hook to manage sorting with per-series persistence
 */

import { useState, useEffect, useRef } from 'react';

const SORT_PREFERENCES_STORAGE_KEY = 'seriesDetails_sortPreferences';

// Helper functions for sort preferences per series
const getSeriesSortPreferences = (seriesPath: string) => {
    try {
        const stored = localStorage.getItem(SORT_PREFERENCES_STORAGE_KEY);
        if (stored) {
            const prefs = JSON.parse(stored);
            return prefs[seriesPath] || { sortBy: 'name', sortOrder: 'asc' };
        }
    } catch (e) {
        console.error('Failed to load sort preferences', e);
    }
    return { sortBy: 'name', sortOrder: 'asc' };
};

const saveSeriesSortPreferences = (seriesPath: string, sortBy: 'name' | 'pages', sortOrder: 'asc' | 'desc') => {
    try {
        const stored = localStorage.getItem(SORT_PREFERENCES_STORAGE_KEY);
        const prefs = stored ? JSON.parse(stored) : {};
        prefs[seriesPath] = { sortBy, sortOrder };
        localStorage.setItem(SORT_PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
        console.error('Failed to save sort preferences', e);
    }
};

export function useSeriesDetailsSorting(seriesPath: string) {
    const [sortBy, setSortBy] = useState<'name' | 'pages'>(() => {
        const prefs = getSeriesSortPreferences(seriesPath);
        // Migrate old 'date' to 'pages' if exists
        return prefs.sortBy === 'date' ? 'pages' : (prefs.sortBy === 'pages' ? 'pages' : 'name');
    });
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
        return getSeriesSortPreferences(seriesPath).sortOrder;
    });

    // Track if preferences have been loaded for current series
    const preferencesLoadedRef = useRef(false);

    // Load sort preferences when series changes
    useEffect(() => {
        const prefs = getSeriesSortPreferences(seriesPath);
        setSortBy(prefs.sortBy);
        setSortOrder(prefs.sortOrder);
        preferencesLoadedRef.current = true;
    }, [seriesPath]);

    // Save sort preference when it changes (but only after initial load)
    useEffect(() => {
        if (preferencesLoadedRef.current) {
            saveSeriesSortPreferences(seriesPath, sortBy, sortOrder);
        }
    }, [sortBy, sortOrder, seriesPath]);

    return {
        sortBy,
        sortOrder,
        setSortBy,
        setSortOrder,
    };
}
