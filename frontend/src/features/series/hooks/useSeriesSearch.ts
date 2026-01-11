/**
 * useSeriesSearch - Hook to manage search with debounce
 */

import { useState, useEffect, useMemo } from 'react';
import type { SeriesEntry } from '@types';

export function useSeriesSearch(series: SeriesEntry[], searchQuery: string) {
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const filteredSeries = useMemo(() => {
        return series.filter(item => {
            if (!debouncedSearchQuery.trim()) return true;
            const query = debouncedSearchQuery.toLowerCase();
            return item.name.toLowerCase().includes(query);
        });
    }, [series, debouncedSearchQuery]);

    return {
        filteredSeries,
    };
}
