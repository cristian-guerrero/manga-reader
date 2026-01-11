/**
 * OneShotHeader - Header component for oneshot page
 */

import { useTranslation } from 'react-i18next';
import { SortControls, SearchBar } from '@shared/components';
import { PlusIcon, TrashIcon } from './OneShotIcons';
import type { FolderInfo } from '@types';

interface OneShotHeaderProps {
    folders: FolderInfo[];
    sortBy: 'name' | 'date';
    sortOrder: 'asc' | 'desc';
    searchQuery: string;
    onSortByChange: (value: 'name' | 'date') => void;
    onSortOrderChange: () => void;
    onSearchChange: (query: string) => void;
    onSelectFolder: () => void;
    onClearAll: () => void;
}

export function OneShotHeader({
    folders,
    sortBy,
    sortOrder,
    searchQuery,
    onSortByChange,
    onSortOrderChange,
    onSearchChange,
    onSelectFolder,
    onClearAll,
}: OneShotHeaderProps) {
    const { t } = useTranslation();

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <h1
                        className="text-2xl font-bold"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {t('oneShot.title')}
                    </h1>

                    {/* Sort Controls */}
                    <SortControls
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSortByChange={(value) => onSortByChange(value as 'name' | 'date')}
                        onSortOrderChange={onSortOrderChange}
                        options={[
                            { value: 'name', label: t('common.name') },
                            { value: 'date', label: t('common.date') }
                        ]}
                        show={folders.length > 0}
                    />
                </div>

                <div className="flex items-center gap-2">
                    {folders.length > 0 && (
                        <button
                            onClick={onClearAll}
                            className="btn-ghost text-red-500 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-transform hover:scale-105 active:scale-95"
                        >
                            <TrashIcon />
                            {t('oneShot.clearAll')}
                        </button>
                    )}
                    <button
                        onClick={onSelectFolder}
                        className="btn-primary flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                    >
                        <PlusIcon />
                        {t('oneShot.addFolder')}
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            {folders.length > 0 && (
                <div>
                    <SearchBar
                        placeholder={t('oneShot.searchPlaceholder') || 'Search folders by name...'}
                        onSearch={onSearchChange}
                        className="max-w-md"
                    />
                </div>
            )}
        </div>
    );
}
