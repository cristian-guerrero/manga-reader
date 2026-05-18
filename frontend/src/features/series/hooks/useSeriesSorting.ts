import { useState, useEffect } from 'react';
import { UIPreferencesAPI } from '@services/api/uiPreferencesAPI';

export function useSeriesSorting() {
    const [sortBy, setSortByState] = useState<'name' | 'date'>('name');
    const [sortOrder, setSortOrderState] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        UIPreferencesAPI.getSeriesSortBy().then((v) => {
            setSortByState((v as 'name' | 'date') || 'name');
        }).catch(() => {});
        UIPreferencesAPI.getSeriesSortOrder().then((v) => {
            setSortOrderState((v as 'asc' | 'desc') || 'asc');
        }).catch(() => {});
    }, []);

    const setSortBy = (value: 'name' | 'date') => {
        setSortByState(value);
        UIPreferencesAPI.setSeriesSortBy(value).catch(() => {});
    };

    const setSortOrder = (value: 'asc' | 'desc') => {
        setSortOrderState(value);
        UIPreferencesAPI.setSeriesSortOrder(value).catch(() => {});
    };

    return { sortBy, sortOrder, setSortBy, setSortOrder };
}
