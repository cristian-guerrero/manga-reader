/**
 * ExplorerPage - File and folder explorer
 * Refactored to use custom hooks for better separation of concerns
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@hooks';
import { useThumbnails } from '@hooks/useThumbnails';
import { Tooltip, SortControls, GridItem, GridContainer, SearchBar, Breadcrumb, MediaTile, useToast } from '@shared/components';
import { AppAPI } from '@services/api/appAPI';
import type { PageType } from '@types';
import {
    useExplorerState,
    useExplorerSorting,
    useExplorerLoading,
    useExplorerSearch,
    useExplorerNavigation,
    useExplorerRestoration,
} from './hooks';
import { BaseFolder, ExplorerEntry } from './types';

// Icons
const TrashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

interface ExplorerPageProps {
    isActive?: boolean;
    tabId?: string;
}

export function ExplorerPage({ isActive = true, tabId }: ExplorerPageProps) {
    const { t } = useTranslation();
    const { navigate, explorerState, setExplorerState, previousPage, fromPage, params, setParams } = useNavigation();
    const { showToast } = useToast();
    const { thumbnails, loadThumbnail, initializeThumbnails } = useThumbnails(10);

    // Use explorer state hook
    const explorerStateHook = useExplorerState({ tabId, isActive });

    // Use sorting hook
    const sorting = useExplorerSorting({ currentPath: explorerStateHook.currentPath });

    // Title change handler
    const [currentTitle, setCurrentTitle] = useState(t('explorer.title') || 'Explorer');
    const handleTitleChange = useCallback((title: string) => {
        setCurrentTitle(title);
    }, []);

    // Path change handler
    const handlePathChange = useCallback((path: string | null) => {
        explorerStateHook.setCurrentPath(path);
    }, [explorerStateHook]);

    // Use loading hook
    const loading = useExplorerLoading({
        tabId,
        currentPath: explorerStateHook.currentPath,
        currentPathRef: explorerStateHook.currentPathRef,
        initializeThumbnails,
        onPathChange: handlePathChange,
        onTitleChange: handleTitleChange,
    });

    // Use search hook
    const search = useExplorerSearch({
        baseFolders: loading.baseFolders,
        entries: loading.entries,
        sortBy: sorting.sortBy,
        sortOrder: sorting.sortOrder,
    });

    // Use navigation hook
    const navigation = useExplorerNavigation({
        tabId,
        currentPath: explorerStateHook.currentPath,
        pathHistory: explorerStateHook.pathHistory,
        baseFolders: loading.baseFolders,
        entries: loading.entries,
        sortedEntries: search.sortedEntries,
        setCurrentPath: explorerStateHook.setCurrentPath,
        setPathHistory: explorerStateHook.setPathHistory,
        setEntries: loading.setEntries,
        loadDirectory: loading.loadDirectory,
        loadBaseFolders: loading.loadBaseFolders,
        setExplorerState,
        navigate,
        onTitleChange: handleTitleChange,
    });

    // Use restoration hook
    useExplorerRestoration({
        tabId,
        isActive,
        explorerState,
        previousPage,
        fromPage,
        params,
        setParams,
        loadDirectory: loading.loadDirectory,
        setCurrentPath: explorerStateHook.setCurrentPath,
        setPathHistory: explorerStateHook.setPathHistory,
        setEntries: loading.setEntries,
        loadBaseFolders: loading.loadBaseFolders,
    });

    return (
        <div
            className="h-full p-6 flex flex-col"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    {explorerStateHook.currentPath && (
                        <Tooltip content={t('common.back')} placement="right">
                            <button
                                onClick={navigation.handleBack}
                                className="p-2 rounded-full hover:bg-white/10 transition-all opacity-100 translate-x-0 flex-shrink-0"
                                aria-label={t('common.back')}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                            </button>
                        </Tooltip>
                    )}

                    {/* Breadcrumb */}
                    <div className="flex-1 min-w-0">
                        <Breadcrumb
                            currentPath={explorerStateHook.currentPath}
                            baseFolders={loading.baseFolders}
                            onNavigate={navigation.handleBreadcrumbClick}
                            onAuxClick={navigation.handleBreadcrumbAuxClick}
                        />
                    </div>

                    {/* Sort Controls */}
                    <div className="flex-shrink-0 ml-8">
                        <SortControls
                            sortBy={sorting.sortBy}
                            sortOrder={sorting.sortOrder}
                            onSortByChange={(value) => sorting.setSortBy(value as 'name' | 'date')}
                            onSortOrderChange={() => sorting.setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            options={[
                                { value: 'name', label: t('common.name') },
                                { value: 'date', label: t('common.date') }
                            ]}
                            show={Boolean((!explorerStateHook.currentPath && loading.baseFolders.length > 0) || (explorerStateHook.currentPath && loading.entries.length > 0))}
                        />
                    </div>
                </div>

                {!explorerStateHook.currentPath && (
                    <button
                        onClick={navigation.handleAddBaseFolder}
                        className="btn-primary transition-transform hover:scale-105 active:scale-95 ml-6"
                    >
                        <span className="mr-2">+</span>
                        {t('explorer.addBaseFolder')}
                    </button>
                )}
            </div>

            {/* Search Bar */}
            {((!explorerStateHook.currentPath && loading.baseFolders.length > 0) || (explorerStateHook.currentPath && loading.entries.length > 0)) && (
                <div className="mb-4">
                    <SearchBar
                        placeholder={t('explorer.searchPlaceholder') || 'Search by name...'}
                        onSearch={search.setSearchQuery}
                        className="max-w-md"
                    />
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto pr-2">
                <GridContainer key={explorerStateHook.currentPath || 'root'}>
                    {/* Base Folders View */}
                    {!explorerStateHook.currentPath && search.sortedBaseFolders.map((folder) => (
                        <GridItem key={folder.path}>
                            <MediaTile
                                id={folder.path}
                                name={folder.name}
                                thumbnail={folder.thumbnailUrl || thumbnails[folder.path]}
                                onClick={() => navigation.handleItemClick(folder)}
                                onAuxClick={(e) => navigation.handleItemAuxClick(e, folder)}
                                onVisible={async () => {
                                    if (!folder.hasImages || folder.thumbnailUrl || thumbnails[folder.path]) return;
                                    try {
                                        const folderInfo = await AppAPI.getFolderInfoShallow(folder.path);
                                        if (folderInfo && folderInfo.coverImage) {
                                            await loadThumbnail(folder.path, folderInfo.coverImage);
                                        }
                                    } catch (error) {
                                        console.error('Failed to load thumbnail for folder:', folder.path, error);
                                    }
                                }}
                                onSecondaryAction={(e) => navigation.handleRemoveBaseFolder(folder.path, e)}
                                secondaryActionIcon={<TrashIcon />}
                                secondaryActionLabel={t('common.remove')}
                                fallbackIcon={
                                    <div className="p-4 rounded-xl bg-accent/10 text-accent">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                        </svg>
                                    </div>
                                }
                                footerLeft={<p className="text-xs text-white/50 truncate mt-1 font-mono">{folder.path}</p>}
                            />
                        </GridItem>
                    ))}

                    {/* Directory View */}
                    {explorerStateHook.currentPath && search.sortedEntries.map((entry) => (
                        <GridItem key={entry.path}>
                            <MediaTile
                                id={entry.path}
                                name={entry.name}
                                thumbnail={entry.thumbnailUrl || thumbnails[entry.path]}
                                onClick={() => navigation.handleItemClick(entry)}
                                onAuxClick={(e) => navigation.handleItemAuxClick(e, entry)}
                                onVisible={async () => {
                                    if (!entry.coverImage || entry.thumbnailUrl || thumbnails[entry.path]) return;
                                    await loadThumbnail(entry.path, entry.coverImage);
                                }}
                                fallbackIcon={
                                    <svg className="w-12 h-12 text-accent/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                    </svg>
                                }
                                footerLeft={
                                    <span className="text-xs text-white/50">
                                        {entry.isDirectory 
                                            ? (entry.hasImages 
                                                ? `${entry.imageCount} ${t('explorer.images')}${entry.subdirectoryCount > 0 ? ` · ${entry.subdirectoryCount} ${t('explorer.subfolders')}` : ''}` 
                                                : (entry.subdirectoryCount > 0 ? `${entry.subdirectoryCount} ${t('explorer.subfolders')}` : t('explorer.folder')))
                                            : t('explorer.file')}
                                    </span>
                                }
                                footerRight={
                                    entry.hasImages && (
                                        <Tooltip content={t('explorer.openInViewer')} placement="left">
                                            <button
                                                onClick={(e) => navigation.handleOpenInViewer(entry.path, e)}
                                                className="p-1.5 rounded-full bg-accent text-white hover:bg-accent-hover transform hover:scale-110 transition-all opacity-0 group-hover/tile:opacity-100"
                                                aria-label={t('explorer.openInViewer')}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </button>
                                        </Tooltip>
                                    )
                                }
                            />
                        </GridItem>
                    ))}
                </GridContainer>

                {!explorerStateHook.currentPath && loading.baseFolders.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
                        <svg className="w-24 h-24 mb-4 text-surface-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        <p className="text-lg">{t('explorer.noFoldersAdded')}</p>
                        <p className="text-sm mt-1">{t('explorer.addFolderToStart')}</p>
                    </div>
                )}

                {/* No results message */}
                {((!explorerStateHook.currentPath && search.sortedBaseFolders.length === 0 && loading.baseFolders.length > 0 && search.searchQuery.trim()) ||
                    (explorerStateHook.currentPath && search.sortedEntries.length === 0 && loading.entries.length > 0 && search.searchQuery.trim())) && (
                    <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
                        <svg className="w-16 h-16 mb-4 text-surface-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                        <p className="text-lg">{t('explorer.noResultsFound') || 'No results found'}</p>
                        <p className="text-sm mt-1">{t('explorer.tryDifferentSearch') || `Try a different search term`}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ExplorerPage;
