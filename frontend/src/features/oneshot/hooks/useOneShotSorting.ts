/**
 * useOneShotSorting - Hook to manage sorting with persistence
 */

import { useState, useEffect } from 'react';

const SORT_BY_KEY = 'oneShot_sortBy';
const SORT_ORDER_KEY = 'oneShot_sortOrder';
const OLD_SORT_BY_KEY = 'folders_sortBy';
const OLD_SORT_ORDER_KEY = 'folders_sortOrder';

export function useOneShotSorting() {
    const [sortBy, setSortBy] = useState<'name' | 'date'>(() => {
        // Try new key first, then old key for migration
        const newValue = localStorage.getItem(SORT_BY_KEY);
        if (newValue) return newValue as 'name' | 'date';
        const oldValue = localStorage.getItem(OLD_SORT_BY_KEY);
        if (oldValue) {
            // Migrate old value to new key
            localStorage.setItem(SORT_BY_KEY, oldValue);
            localStorage.removeItem(OLD_SORT_BY_KEY);
            return oldValue as 'name' | 'date';
        }
        return 'name';
    });

    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
        // Try new key first, then old key for migration
        const newValue = localStorage.getItem(SORT_ORDER_KEY);
        if (newValue) return newValue as 'asc' | 'desc';
        const oldValue = localStorage.getItem(OLD_SORT_ORDER_KEY);
        if (oldValue) {
            // Migrate old value to new key
            localStorage.setItem(SORT_ORDER_KEY, oldValue);
            localStorage.removeItem(OLD_SORT_ORDER_KEY);
            return oldValue as 'asc' | 'desc';
        }
        return 'asc';
    });

    // Save sort preference
    useEffect(() => {
        localStorage.setItem(SORT_BY_KEY, sortBy);
        localStorage.setItem(SORT_ORDER_KEY, sortOrder);
    }, [sortBy, sortOrder]);

    return {
        sortBy,
        sortOrder,
        setSortBy,
        setSortOrder,
    };
}
