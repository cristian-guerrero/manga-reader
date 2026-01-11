/**
 * useOneShotSearch - Hook to manage search with debounce
 */

import { useState, useEffect } from 'react';

export function useOneShotSearch() {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    return {
        searchQuery,
        debouncedSearchQuery,
        setSearchQuery,
    };
}
