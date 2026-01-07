import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../../stores/navigationStore';
import { useToast } from '../common/Toast';
import { EventsOn, EventsOff } from '../../../wailsjs/runtime';
import { Tooltip } from '../common/Tooltip';
import { FolderInfo } from '../../types';

// Icons
const FolderIcon = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
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

const SortAscIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M6 12h12M9 18h6" />
    </svg>
);

const SortDescIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 18h18M6 12h12M9 6h6" />
    </svg>
);

const ImageIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
    </svg>
);


export function FoldersPage() {
    const { folders, setFolders, setIsProcessing, navigate } = useNavigationStore();
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

    // Sorting state with persistence
    const [sortBy, setSortBy] = useState<'name' | 'date'>(() => {
        return (localStorage.getItem('folders_sortBy') as 'name' | 'date') || 'name';
    });
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
        return (localStorage.getItem('folders_sortOrder') as 'asc' | 'desc') || 'asc';
    });

    // Save sort preference
    useEffect(() => {
        localStorage.setItem('folders_sortBy', sortBy);
        localStorage.setItem('folders_sortOrder', sortOrder);
    }, [sortBy, sortOrder]);

    // Load folders from settings/library
    useEffect(() => {
        let isMounted = true;
        let unsubscribe: () => void;

        const init = async () => {
            await ensureWailsReady();
            if (!isMounted) return;

            loadFolders();

            // Listen for updates (e.g. from drag and drop)
            unsubscribe = EventsOn('library_updated', () => {
                if (isMounted) loadFolders();
            });
        };

        init();

        return () => {
            isMounted = false;
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const ensureWailsReady = async (maxAttempts = 20) => {
        for (let i = 0; i < maxAttempts; i++) {
            // @ts-ignore
            if (window.go?.main?.App?.GetLibrary) return true;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.warn('Wails bindings not ready after timeout');
        return false;
    };

    const loadFolders = async (retryCount = 0) => {
        setIsLoading(true);
        console.log(`[FoldersPage] Loading folders (attempt ${retryCount + 1})...`);
        try {
            // @ts-ignore - Wails generated bindings
            const app = window.go?.main?.App;
            if (!app) {
                console.log('[FoldersPage] Wails bindings not found');
                if (retryCount < 3) {
                    setTimeout(() => loadFolders(retryCount + 1), 500);
                    return;
                }
                throw new Error('Bindings not available');
            }

            const library = await app.GetLibrary();
            console.log(`[FoldersPage] Library received: ${library?.length || 0} items`);

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

                // Initialize thumbnails state from the folder metadata
                const initialThumbs: Record<string, string> = {};
                for (const folder of folderData) {
                    if (folder.thumbnailUrl) {
                        initialThumbs[folder.path] = folder.thumbnailUrl;
                    }
                }
                setThumbnails(initialThumbs);
            }
        } catch (error) {
            console.error('[FoldersPage] Failed to load folders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadFolderThumbnail = async (folderPath: string) => {
        try {
            // @ts-ignore - Wails generated bindings
            const images = await window.go?.main?.App?.GetImages(folderPath);
            if (images && images.length > 0) {
                // @ts-ignore - Wails generated bindings
                const thumb = await window.go?.main?.App?.GetThumbnail(images[0].path);
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
                            navigate('series-details', { series: result.path });
                        } else {
                            navigate('viewer', { folder: result.path });
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
        navigate('viewer', { folder: folder.path });
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
        if (!window.confirm(t('folders.confirmClear'))) return;
        try {
            // @ts-ignore
            await window.go?.main?.App?.ClearLibrary();
            setFolders([]);
        } catch (error) {
            console.error('Failed to clear library:', error);
        }
    };

    // Sort folders
    const sortedFolders = [...folders].sort((a, b) => {
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


    return (
        <div
            className="h-full overflow-auto p-6"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h1
                        className="text-2xl font-bold"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {t('folders.title')}
                    </h1>

                    {/* Sort Controls */}
                    {folders.length > 0 && (
                        <div className="flex items-center bg-surface-tertiary rounded-lg p-1 border border-white/5">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'name' | 'date')}
                                className="bg-transparent text-sm border-none focus:ring-0 cursor-pointer pl-2 pr-8 text-text-secondary hover:text-text-primary"
                                style={{ outline: 'none' }}
                            >
                                <option value="name">Name</option>
                                <option value="date">Date</option>
                            </select>
                            <div className="w-px h-4 bg-white/10 mx-1" />
                            <Tooltip content={sortOrder === 'asc' ? (t('common.ascending') || "Ascending") : (t('common.descending') || "Descending")} placement="bottom">
                                <button
                                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                    className="p-1.5 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                                >
                                    {sortOrder === 'asc' ? <SortAscIcon /> : <SortDescIcon />}
                                </button>
                            </Tooltip>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {folders.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="btn-ghost text-red-500 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-transform hover:scale-105 active:scale-95"
                        >
                            <TrashIcon />
                            {t('folders.clearAll')}
                        </button>
                    )}
                    <button
                        onClick={handleSelectFolder}
                        className="btn-primary flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                    >
                        <PlusIcon />
                        {t('folders.addFolder')}
                    </button>
                </div>
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
                        <FolderIcon />
                    </div>
                    <p
                        className="text-lg font-medium mb-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {t('folders.noFolders')}
                    </p>
                    <p
                        className="text-sm mb-4"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        {t('folders.dragDrop')}
                    </p>
                    <button
                        onClick={handleSelectFolder}
                        className="btn-secondary transition-transform hover:scale-105 active:scale-95"
                    >
                        {t('folders.selectFolder')}
                    </button>
                </div>
            ) : (
                <div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in"
                >
                    {sortedFolders.map((folder) => (
                        <div
                            key={folder.path}
                            onClick={() => handleOpenFolder(folder)}
                            className="group/card relative rounded-xl overflow-hidden cursor-pointer hover-lift shadow-sm hover:border-accent transition-all animate-slide-up"
                            style={{
                                backgroundColor: 'var(--color-surface-secondary)',
                                border: '1px solid var(--color-border)',
                            }}
                        >
                            {/* Cover image */}
                            <div
                                className="aspect-[3/4] relative overflow-hidden"
                                style={{ backgroundColor: 'var(--color-surface-tertiary)' }}
                            >
                                {thumbnails[folder.path] ? (
                                    <img
                                        src={thumbnails[folder.path]}
                                        alt={folder.name}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <div
                                            className="animate-pulse"
                                            style={{ color: 'var(--color-text-muted)' }}
                                        >
                                            <FolderIcon />
                                        </div>
                                    </div>
                                )}

                                {/* Archive Badge */}
                                {folder.isTemporary && (
                                    <div
                                        className="absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider z-10 shadow-lg border border-white/10"
                                        style={{
                                            backgroundColor: 'rgba(56, 189, 248, 0.9)', // Sky 400
                                            color: 'white',
                                            backdropFilter: 'blur(4px)'
                                        }}
                                    >
                                        {t('common.archive') || 'Archive'}
                                    </div>
                                )}

                                {/* Overlay on hover */}
                                <div
                                    className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none"
                                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                                >
                                    <span
                                        className="text-lg font-semibold"
                                        style={{ color: 'white' }}
                                    >
                                        {t('folders.openFolder')}
                                    </span>
                                </div>

                                {/* Remove button */}
                                <Tooltip content={t('folders.removeFolder')} placement="left" className="absolute top-2 right-2 z-10 opacity-0 group-hover/card:opacity-100 transition-all">
                                    <button
                                        onClick={(e) => handleRemoveFolder(folder, e)}
                                        className="p-2 rounded-full hover:scale-110 active:scale-90"
                                        style={{
                                            backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                            color: 'white',
                                        }}
                                        aria-label={t('folders.removeFolder')}
                                    >
                                        <TrashIcon />
                                    </button>
                                </Tooltip>
                            </div>

                            {/* Info */}
                            <div className="p-4">
                                <h3
                                    className="font-semibold truncate mb-1"
                                    style={{ color: 'var(--color-text-primary)' }}
                                >
                                    {folder.name}
                                </h3>
                                <div
                                    className="flex items-center gap-1 text-sm"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >
                                    <ImageIcon />
                                    <span>
                                        {folder.imageCount} {t('folders.images')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )
            }
        </div >
    );
}

export default FoldersPage;
