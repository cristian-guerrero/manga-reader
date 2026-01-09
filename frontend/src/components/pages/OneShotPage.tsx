import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../../stores/navigationStore';
import { useToast } from '../common/Toast';
import { EventsOn, EventsOff } from '../../../wailsjs/runtime';
import { SortControls } from '../common/SortControls';
import { GridItem } from '../common/GridItem';
import { GridContainer } from '../common/GridContainer';
import { SearchBar } from '../common/SearchBar';
import { LibraryCard } from '../common/LibraryCard';
import { FolderInfo } from '../../types';

// Icons
const OneShotIcon = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="16" y2="11" />
        <line x1="8" y1="15" x2="12" y2="15" />
    </svg>
);

const PlusIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const TrashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);


const ImageIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
    </svg>
);


export function OneShotPage() {
    const { folders, setFolders, setIsProcessing, navigate } = useNavigationStore();
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const isMountedRef = useRef(true);

    // Sorting state with persistence - migrate from old keys
    const [sortBy, setSortBy] = useState<'name' | 'date'>(() => {
        // Try new key first, then old key for migration
        const newValue = localStorage.getItem('oneShot_sortBy');
        if (newValue) return newValue as 'name' | 'date';
        const oldValue = localStorage.getItem('folders_sortBy');
        if (oldValue) {
            // Migrate old value to new key
            localStorage.setItem('oneShot_sortBy', oldValue);
            localStorage.removeItem('folders_sortBy');
            return oldValue as 'name' | 'date';
        }
        return 'name';
    });
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
        // Try new key first, then old key for migration
        const newValue = localStorage.getItem('oneShot_sortOrder');
        if (newValue) return newValue as 'asc' | 'desc';
        const oldValue = localStorage.getItem('folders_sortOrder');
        if (oldValue) {
            // Migrate old value to new key
            localStorage.setItem('oneShot_sortOrder', oldValue);
            localStorage.removeItem('folders_sortOrder');
            return oldValue as 'asc' | 'desc';
        }
        return 'asc';
    });

    // Save sort preference
    useEffect(() => {
        localStorage.setItem('oneShot_sortBy', sortBy);
        localStorage.setItem('oneShot_sortOrder', sortOrder);
    }, [sortBy, sortOrder]);

    // Load folders from settings/library
    useEffect(() => {
        isMountedRef.current = true;
        let unsubscribeLibrary: () => void;
        let unsubscribeAppReady: () => void;

        // Try to load immediately - bindings should be available
        loadFolders();

        // Listen for app_ready event in case bindings weren't ready immediately
        unsubscribeAppReady = EventsOn('app_ready', () => {
            console.log('[OneShotPage] Received app_ready event');
            if (isMountedRef.current) {
                loadFolders();
            }
        });

        // Listen for updates (e.g. from drag and drop)
        unsubscribeLibrary = EventsOn('library_updated', () => {
            if (isMountedRef.current) loadFolders();
        });

        return () => {
            isMountedRef.current = false;
            if (unsubscribeLibrary) unsubscribeLibrary();
            if (unsubscribeAppReady) unsubscribeAppReady();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - only run once on mount

    const loadFolders = useCallback(async () => {
        if (!isMountedRef.current) return;

        try {
            // @ts-ignore - Wails generated bindings
            const app = window.go?.main?.App;
            if (!app?.GetLibrary) {
                // Bindings not available - this shouldn't happen in normal operation
                console.warn('[OneShotPage] Bindings not available yet');
                if (isMountedRef.current) {
                    setIsLoading(false);
                }
                return;
            }

            // Set loading state
            if (isMountedRef.current) {
                setIsLoading(true);
            }

            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout loading library')), 10000); // 10 second timeout
            });

            const libraryPromise = app.GetLibrary();
            const library = await Promise.race([libraryPromise, timeoutPromise]) as any[];

            console.log(`[OneShotPage] Library received: ${library?.length || 0} items`);

            if (!isMountedRef.current) return;

            if (library && Array.isArray(library)) {
                const folderData = library.map((entry: any) => ({
                    path: entry.path,
                    name: entry.name,
                    imageCount: entry.imageCount,
                    coverImage: entry.coverImage,
                    thumbnailUrl: entry.thumbnailUrl,
                    isTemporary: entry.isTemporary,
                    lastModified: entry.lastModified,
                }));
                setFolders(folderData);
                setIsLoading(false); // Show UI immediately with data

                // Initialize thumbnails state from the folder metadata
                const initialThumbs: Record<string, string> = {};
                for (const folder of folderData) {
                    if (folder.thumbnailUrl) {
                        initialThumbs[folder.path] = folder.thumbnailUrl;
                    }
                }
                setThumbnails(initialThumbs);
            } else {
                setFolders([]);
                setIsLoading(false);
            }
        } catch (error) {
            console.error('[OneShotPage] Failed to load folders:', error);
            if (isMountedRef.current) {
                setFolders([]);
                setIsLoading(false);
            }
        }
    }, []);

    const loadFolderThumbnail = async (folderPath: string) => {
        try {
            // Use GetFolderInfoShallow instead of GetImages to avoid recursive scanning
            // This is much faster and only scans the immediate directory
            // @ts-ignore - Wails generated bindings
            const folderInfo = await window.go?.main?.App?.GetFolderInfoShallow(folderPath);
            if (folderInfo && folderInfo.coverImage) {
                // @ts-ignore - Wails generated bindings
                const thumb = await window.go?.main?.App?.GetThumbnail(folderInfo.coverImage);
                if (thumb) {
                    setThumbnails((prev) => ({ ...prev, [folderPath]: thumb }));
                }
            }
        } catch (error) {
            console.error('Failed to load thumbnail:', error);
        }
    };

    const handleSelectFolder = async () => {
        try {
            // @ts-ignore - Wails generated bindings
            const folderPath = await window.go?.main?.App?.SelectFolder();
            if (folderPath) {
                try {
                    setIsProcessing(true);
                    // @ts-ignore
                    const result = await window.go?.main?.App?.AddFolder(folderPath);
                    if (result) {
                        if (result.isSeries) {
                            // If it's a series, set activeMenuPage to 'series'
                            navigate('series-details', { series: result.path }, 'series');
                        } else {
                            // If it's a oneshot, set activeMenuPage to 'oneShot'
                            navigate('viewer', { folder: result.path }, 'oneShot');
                        }
                    }
                } catch (e) {
                    console.error("Failed to add to library", e);
                    showToast?.(t('common.error'), 'error');
                } finally {
                    setIsProcessing(false);
                }
            }
        } catch (error) {
            console.error('Failed to select folder:', error);
        }
    };


    const handleOpenFolder = (folder: FolderInfo) => {
        // Maintain 'oneShot' as active menu page when viewing from oneshot page
        navigate('viewer', { folder: folder.path }, 'oneShot');
    };

    const handleRemoveFolder = async (folder: FolderInfo, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            // @ts-ignore - Wails generated bindings
            await window.go?.main?.App?.RemoveLibraryEntry(folder.path);
            setFolders((prev: FolderInfo[]) => prev.filter((f: FolderInfo) => f.path !== folder.path));
        } catch (error) {
            console.error('Failed to remove folder:', error);
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm(t('oneShot.confirmClear'))) return;
        try {
            // @ts-ignore
            await window.go?.main?.App?.ClearLibrary();
            setFolders([]);
        } catch (error) {
            console.error('Failed to clear library:', error);
        }
    };

    // Debounced search query
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

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


    return (
        <div
            className="h-full overflow-auto p-6"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            {/* Header */}
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
                            onSortByChange={(value) => setSortBy(value as 'name' | 'date')}
                            onSortOrderChange={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
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
                                onClick={handleClearAll}
                                className="btn-ghost text-red-500 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-transform hover:scale-105 active:scale-95"
                            >
                                <TrashIcon />
                                {t('oneShot.clearAll')}
                            </button>
                        )}
                        <button
                            onClick={handleSelectFolder}
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
                            onSearch={setSearchQuery}
                            className="max-w-md"
                        />
                    </div>
                )}
            </div>

            {/* Folders grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div
                        className="w-12 h-12 border-4 rounded-full animate-spin"
                        style={{
                            borderColor: 'var(--color-accent)',
                            borderTopColor: 'transparent',
                        }}
                    />
                </div>
            ) : folders.length === 0 ? (
                <div
                    className="flex flex-col items-center justify-center py-20 rounded-2xl animate-scale-in"
                    style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        border: '2px dashed var(--color-border)',
                    }}
                >
                    <div
                        className="mb-4 animate-bounce"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        <OneShotIcon />
                    </div>
                    <p
                        className="text-lg font-medium mb-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {t('oneShot.noFolders')}
                    </p>
                    <p
                        className="text-sm mb-4"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        {t('oneShot.dragDrop')}
                    </p>
                    <button
                        onClick={handleSelectFolder}
                        className="btn-secondary transition-transform hover:scale-105 active:scale-95"
                    >
                        {t('oneShot.selectFolder')}
                    </button>
                </div>
            ) : sortedFolders.length === 0 && searchQuery.trim() ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('common.noResults')}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {t('oneShot.noFoldersFound') || `No folders found matching "${searchQuery}"`}
                    </p>
                </div>
            ) : (
                <GridContainer>
                    {sortedFolders.map((folder) => (
                        <GridItem key={folder.path}>
                            <LibraryCard
                                id={folder.path}
                                name={folder.name}
                                thumbnail={thumbnails[folder.path]}
                                isTemporary={folder.isTemporary}
                                count={folder.imageCount}
                                countLabel={t('oneShot.images')}
                                countIcon={<ImageIcon />}
                                onOpen={() => handleOpenFolder(folder)}
                                onRemove={(e) => handleRemoveFolder(folder, e)}
                                overlayContent={
                                    <span
                                        className="text-lg font-semibold"
                                        style={{ color: 'white' }}
                                    >
                                        {t('oneShot.openFolder')}
                                    </span>
                                }
                                fallbackIcon={<OneShotIcon />}
                                archiveLabel={t('common.archive') || 'Archive'}
                                removeLabel={t('oneShot.removeFolder')}
                                playLabel={t('oneShot.openFolder')}
                                variant="unified"
                            />
                        </GridItem>
                    ))}
                </GridContainer>
            )}
        </div>
    );
}

export default OneShotPage;
