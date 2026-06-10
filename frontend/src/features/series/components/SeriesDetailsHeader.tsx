/**
 * SeriesDetailsHeader - Header component for series details page
 */

import { useTranslation } from 'react-i18next';
import { SortControls, SearchBar } from '@shared/components';
import { ChevronLeftIcon } from './SeriesDetailsIcons';
import type { SeriesEntry } from '@types';

interface SeriesDetailsHeaderProps {
    series: SeriesEntry;
    sortBy: 'name' | 'pages';
    sortOrder: 'asc' | 'desc';
    searchQuery: string;
    onBack: () => void;
    onSortByChange: (value: 'name' | 'pages') => void;
    onSortOrderChange: () => void;
    onSearchChange: (query: string) => void;
}

export function SeriesDetailsHeader({
    series,
    sortBy,
    sortOrder,
    searchQuery,
    onBack,
    onSortByChange,
    onSortOrderChange,
    onSearchChange,
}: SeriesDetailsHeaderProps) {
    const { t } = useTranslation();

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg transition-all hover:bg-white/5 hover:scale-110 active:scale-90"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        <ChevronLeftIcon />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gradient">
                            {series.name}
                        </h1>
                        <p className="text-sm opacity-60" style={{ color: 'var(--color-text-muted)' }}>
                            {series.path}
                        </p>
                    </div>
                </div>

                {/* Sort Controls */}
                <SortControls
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortByChange={(value) => onSortByChange(value as 'name' | 'pages')}
                    onSortOrderChange={onSortOrderChange}
                    options={[
                        { value: 'name', label: t('common.name') },
                        { value: 'pages', label: t('common.pages') }
                    ]}
                    show={series.chapters && series.chapters.length > 0}
                />
            </div>

            {/* Search Bar */}
            {series.chapters && series.chapters.length > 0 && (
                <div>
                    <SearchBar
                        placeholder={t('series.searchChapterPlaceholder') || 'Search chapters by name...'}
                        onSearch={onSearchChange}
                        className="max-w-md"
                    />
                </div>
            )}
        </div>
    );
}
