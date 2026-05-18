/**
 * SeriesDetailsPage - Series details page refactored with hooks and components
 * Separated concerns: hooks handle logic, components handle UI
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@hooks';
import { useThumbnails } from '@hooks/useThumbnails';
import {
    useSeriesDetailsData,
    useSeriesDetailsSorting,
    useSeriesDetailsActions,
} from './hooks';
import { SeriesDetailsHeader } from './components/SeriesDetailsHeader';
import { SeriesDetailsGrid } from './components/SeriesDetailsGrid';
import { SeriesDetailsLoadingState } from './components/SeriesDetailsLoadingState';
import { SeriesDetailsNotFound } from './components/SeriesDetailsNotFound';
import type { ChapterInfo } from '@types';

interface SeriesDetailsPageProps {
    seriesPath: string;
    tabId?: string;
}

export function SeriesDetailsPage({ seriesPath, tabId }: SeriesDetailsPageProps) {
    const { t } = useTranslation();
    const { goBack } = useNavigation();
    const { thumbnails, loadThumbnails } = useThumbnails(10);
    const [searchQuery, setSearchQuery] = useState('');

    // Use hooks for separated concerns
    const { series, isLoading } = useSeriesDetailsData({ seriesPath, tabId, loadThumbnails });
    const { sortBy, sortOrder, setSortBy, setSortOrder } = useSeriesDetailsSorting(seriesPath);
    const { handleOpenChapter, handleAuxClick } = useSeriesDetailsActions();

    // Filter and sort chapters
    const filteredChapters = useMemo(() => {
        if (!series) return [];
        return series.chapters.filter(chapter => {
            if (!searchQuery.trim()) return true;
            const query = searchQuery.toLowerCase();
            return chapter.name.toLowerCase().includes(query);
        });
    }, [series, searchQuery]);

    const sortedChapters = useMemo(() => {
        return [...filteredChapters].sort((a, b) => {
            let res = 0;
            if (sortBy === 'name') {
                res = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            } else {
                // Sort by page count (imageCount)
                res = a.imageCount - b.imageCount;
            }
            return sortOrder === 'asc' ? res : -res;
        });
    }, [filteredChapters, sortBy, sortOrder]);

    if (isLoading) {
        return <SeriesDetailsLoadingState />;
    }

    if (!series) {
        return <SeriesDetailsNotFound onBack={goBack} />;
    }

    return (
        <div className="h-full overflow-auto p-6" style={{ backgroundColor: 'var(--color-surface-primary)' }}>
            {/* Header */}
            <SeriesDetailsHeader
                series={series}
                sortBy={sortBy}
                sortOrder={sortOrder}
                searchQuery={searchQuery}
                onBack={goBack}
                onSortByChange={setSortBy}
                onSortOrderChange={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                onSearchChange={setSearchQuery}
            />

            {/* Chapters Grid */}
            <SeriesDetailsGrid
                chapters={sortedChapters}
                thumbnails={thumbnails}
                onOpenChapter={handleOpenChapter}
                onAuxClick={handleAuxClick}
                searchQuery={searchQuery}
            />
        </div>
    );
}

export default SeriesDetailsPage;
