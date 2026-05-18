import { useState, useEffect } from 'react';
import { UIPreferencesAPI } from '@services/api/uiPreferencesAPI';

export function useSeriesDetailsSorting(seriesPath: string) {
    const [sortBy, setSortBy] = useState<'name' | 'pages'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        UIPreferencesAPI.getSeriesDetailsSortPreference(seriesPath).then((pref) => {
            setSortBy((pref.sortBy === 'date' ? 'pages' : pref.sortBy) as 'name' | 'pages');
            setSortOrder((pref.sortOrder as 'asc' | 'desc') || 'asc');
        }).catch(() => {});
    }, [seriesPath]);

    const handleSetSortBy = (value: 'name' | 'pages') => {
        setSortBy(value);
        UIPreferencesAPI.setSeriesDetailsSortPreference(seriesPath, value, sortOrder).catch(() => {});
    };

    const handleSetSortOrder = (value: 'asc' | 'desc') => {
        setSortOrder(value);
        UIPreferencesAPI.setSeriesDetailsSortPreference(seriesPath, sortBy, value).catch(() => {});
    };

    return { sortBy, setSortBy: handleSetSortBy, sortOrder, setSortOrder: handleSetSortOrder };
}
