/**
 * SeriesPage - Main series page refactored with hooks and components
 * Separated concerns: hooks handle logic, components handle UI
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useThumbnails } from '@hooks/useThumbnails';
import {
    useSeriesData,
    useSeriesSorting,
    useSeriesSearch,
    useSeriesActions,
} from './hooks';
import { SeriesHeader } from './components/SeriesHeader';
import { SeriesGrid } from './components/SeriesGrid';
import { SeriesEmptyState } from './components/SeriesEmptyState';
import { SeriesLoadingState } from './components/SeriesLoadingState';
import type { SeriesEntry } from '@types';

export function SeriesPage() {
    const { t } = useTranslation();
    const { thumbnails, loadThumbnails } = useThumbnails(10);
    const [searchQuery, setSearchQuery] = useState('');

    // Use hooks for separated concerns
    const { series, isLoading, history, removeSeries, clearAll } = useSeriesData(loadThumbnails);
    const { sortBy, sortOrder, setSortBy, setSortOrder } = useSeriesSorting();
    const { filteredSeries } = useSeriesSearch(series, searchQuery);
    const {
        handleSelectFolder,
        handleOpenSeries,
        handleAuxClick,
        handlePlaySeries,
        handleRemoveSeries,
        handleClearAll,
    } = useSeriesActions(history, removeSeries, clearAll);

    // Memoized sort
    const sortedSeries = useMemo(() => {
        return [...filteredSeries].sort((a, b) => {
            let res = 0;
            if (sortBy === 'name') {
                res = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            } else {
                // Date sort
                const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
                const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
                res = dateA - dateB;
            }
            return sortOrder === 'asc' ? res : -res;
        });
    }, [filteredSeries, sortBy, sortOrder]);

    return (
        <div
            className="h-full overflow-auto p-6"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            {/* Header */}
            <SeriesHeader
                seriesCount={series.length}
                sortBy={sortBy}
                sortOrder={sortOrder}
                searchQuery={searchQuery}
                onSortByChange={setSortBy}
                onSortOrderChange={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                onSearchChange={setSearchQuery}
                onSelectFolder={handleSelectFolder}
                onClearAll={handleClearAll}
            />

            {/* Content */}
            {isLoading ? (
                <SeriesLoadingState />
            ) : series.length === 0 ? (
                <SeriesEmptyState onSelectFolder={handleSelectFolder} />
            ) : (
                <SeriesGrid
                    series={sortedSeries}
                    thumbnails={thumbnails}
                    onOpenSeries={handleOpenSeries}
                    onAuxClick={handleAuxClick}
                    onPlaySeries={handlePlaySeries}
                    onRemoveSeries={handleRemoveSeries}
                />
            )}
        </div>
    );
}

export default SeriesPage;
