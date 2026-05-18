import { useState, useEffect } from 'react';
import { UIPreferencesAPI } from '@services/api/uiPreferencesAPI';

export function useOneShotSorting() {
    const [sortBy, setSortByState] = useState<'name' | 'date'>('name');
    const [sortOrder, setSortOrderState] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        UIPreferencesAPI.getOneShotSortBy().then((v) => {
            setSortByState((v as 'name' | 'date') || 'name');
        }).catch(() => {});
        UIPreferencesAPI.getOneShotSortOrder().then((v) => {
            setSortOrderState((v as 'asc' | 'desc') || 'asc');
        }).catch(() => {});
    }, []);

    const setSortBy = (value: 'name' | 'date') => {
        setSortByState(value);
        UIPreferencesAPI.setOneShotSortBy(value).catch(() => {});
    };

    const setSortOrder = (value: 'asc' | 'desc') => {
        setSortOrderState(value);
        UIPreferencesAPI.setOneShotSortOrder(value).catch(() => {});
    };

    return { sortBy, sortOrder, setSortBy, setSortOrder };
}
