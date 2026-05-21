/**
 * SeriesHeader - Header component for series page
 */

import { useTranslation } from 'react-i18next';
import { SortControls, SearchBar } from '@shared/components';
import { PlusIcon, TrashIcon } from './SeriesIcons';

interface SeriesHeaderProps {
    seriesCount: number;
    sortBy: 'name' | 'date';
    sortOrder: 'asc' | 'desc';
    searchQuery: string;
    onSortByChange: (value: 'name' | 'date') => void;
    onSortOrderChange: () => void;
    onSearchChange: (query: string) => void;
    onSelectFolder: () => void;
    onClearAll: () => void;
}

export function SeriesHeader({
    seriesCount,
    sortBy,
    sortOrder,
    searchQuery,
    onSortByChange,
    onSortOrderChange,
    onSearchChange,
    onSelectFolder,
    onClearAll,
}: SeriesHeaderProps) {
    const { t } = useTranslation();

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                    <h1
                        className="text-lg sm:text-2xl font-bold truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {t('series.title')}
                    </h1>

                    {/* Sort Controls */}
                    <div className="hidden sm:block">
                    <SortControls
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSortByChange={(value) => onSortByChange(value as 'name' | 'date')}
                        onSortOrderChange={onSortOrderChange}
                        options={[
                            { value: 'name', label: t('common.name') },
                            { value: 'date', label: t('common.date') }
                        ]}
                        show={seriesCount > 0}
                    />
                    </div>
                </div>

                <div className="flex items-center gap-2 hidden sm:flex">
                    {seriesCount > 0 && (
                        <button
                            onClick={onClearAll}
                            className="btn-ghost text-red-500 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-transform hover:scale-105 active:scale-95"
                        >
                            <TrashIcon />
                            {t('series.clearAll')}
                        </button>
                    )}
                    <button
                        onClick={onSelectFolder}
                        className="btn-primary flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                    >
                        <PlusIcon />
                        {t('series.addSeries')}
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            {seriesCount > 0 && (
                <div className="mt-3 sm:mt-4 hidden sm:block">
                    <SearchBar
                        placeholder={t('series.searchPlaceholder') || 'Search series by name...'}
                        onSearch={onSearchChange}
                        className="max-w-md sm:max-w-md"
                    />
                </div>
            )}
        </div>
    );
}
