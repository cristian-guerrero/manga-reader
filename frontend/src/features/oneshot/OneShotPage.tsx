/**
 * OneShotPage - OneShot page refactored with hooks and components
 * Separated concerns: hooks handle logic, components handle UI
 */

import { useMemo } from 'react';
import { useNavigation } from '@hooks';
import { useThumbnails } from '@hooks/useThumbnails';
import {
    useOneShotData,
    useOneShotSorting,
    useOneShotSearch,
    useOneShotActions,
} from './hooks';
import {
    OneShotHeader,
    OneShotGrid,
    OneShotLoadingState,
    OneShotEmptyState,
} from './components';
import type { FolderInfo } from '@types';

export function OneShotPage() {
    const { folders, setFolders, setIsProcessing } = useNavigation();
    const { thumbnails, loadThumbnails } = useThumbnails(10);

    // Use hooks for separated concerns
    const { isLoading } = useOneShotData({ loadThumbnails, setFolders });
    const { sortBy, sortOrder, setSortBy, setSortOrder } = useOneShotSorting();
    const { searchQuery, debouncedSearchQuery, setSearchQuery } = useOneShotSearch();
    const {
        handleSelectFolder,
        handleOpenFolder,
        handleAuxClick,
        handleRemoveFolder,
        handleClearAll,
    } = useOneShotActions({ setFolders, setIsProcessing });

    // Memoized filter and sort
    const filteredFolders = useMemo(() => {
        return folders.filter(folder => {
            if (!debouncedSearchQuery.trim()) return true;
            const query = debouncedSearchQuery.toLowerCase();
            return folder.name.toLowerCase().includes(query);
        });
    }, [folders, debouncedSearchQuery]);

    const sortedFolders = useMemo(() => {
        return [...filteredFolders].sort((a, b) => {
            let res = 0;
            if (sortBy === 'name') {
                res = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            } else {
                // Date sort
                const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
                const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
                res = dateA - dateB;
            }
            return sortOrder === 'asc' ? res : -res;
        });
    }, [filteredFolders, sortBy, sortOrder]);

    if (isLoading) {
        return (
            <div
                className="h-full overflow-auto p-6"
                style={{ backgroundColor: 'var(--color-surface-primary)' }}
            >
                <OneShotLoadingState />
            </div>
        );
    }

    return (
        <div
            className="h-full overflow-auto p-6"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            {/* Header */}
            <OneShotHeader
                folders={folders}
                sortBy={sortBy}
                sortOrder={sortOrder}
                searchQuery={searchQuery}
                onSortByChange={setSortBy}
                onSortOrderChange={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                onSearchChange={setSearchQuery}
                onSelectFolder={handleSelectFolder}
                onClearAll={handleClearAll}
            />

            {/* Folders grid */}
            {folders.length === 0 ? (
                <OneShotEmptyState onSelectFolder={handleSelectFolder} />
            ) : (
                <OneShotGrid
                    folders={sortedFolders}
                    thumbnails={thumbnails}
                    onOpenFolder={handleOpenFolder}
                    onAuxClick={handleAuxClick}
                    onRemoveFolder={handleRemoveFolder}
                    searchQuery={searchQuery}
                />
            )}
        </div>
    );
}

export default OneShotPage;
