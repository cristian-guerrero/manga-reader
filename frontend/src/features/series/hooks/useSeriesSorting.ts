/**
 * useSeriesSorting - Hook to manage sorting with persistence
 */

import { useState, useEffect } from 'react';

const SORT_BY_STORAGE_KEY = 'series_sortBy';
const SORT_ORDER_STORAGE_KEY = 'series_sortOrder';

export function useSeriesSorting() {
    const [sortBy, setSortBy] = useState<'name' | 'date'>(() => {
        return (localStorage.getItem(SORT_BY_STORAGE_KEY) as 'name' | 'date') || 'name';
    });
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
        return (localStorage.getItem(SORT_ORDER_STORAGE_KEY) as 'asc' | 'desc') || 'asc';
    });

    // Save sort preference
    useEffect(() => {
        localStorage.setItem(SORT_BY_STORAGE_KEY, sortBy);
        localStorage.setItem(SORT_ORDER_STORAGE_KEY, sortOrder);
    }, [sortBy, sortOrder]);

    return {
        sortBy,
        sortOrder,
        setSortBy,
        setSortOrder,
    };
}
