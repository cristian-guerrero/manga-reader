/**
 * FoldersPage - Folder browser and management
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../../stores/navigationStore';
import { EventsOn, EventsOff } from '../../../wailsjs/runtime';
import { useToast } from '../common/Toast';

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

const ImageIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
    </svg>
);

interface FolderData {
    path: string;
    name: string;
    imageCount: number;
    coverImage?: string;
    isTemporary?: boolean;
}

export function FoldersPage() {
    const { t } = useTranslation();
    const { navigate, setIsProcessing } = useNavigationStore();
    const { showToast } = useToast();
    const [folders, setFolders] = useState<FolderData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

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
                    path: entry.folderPath,
                    name: entry.folderName,
                    imageCount: entry.totalImages,
                    coverImage: undefined,
                    isTemporary: entry.isTemporary,
                }));
                setFolders(folderData);

                // Load thumbnails for cover images
                for (const entry of library) {
                    if (entry.folderPath) {
                        loadFolderThumbnail(entry.folderPath);
                    }
                }
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


    const handleOpenFolder = (folder: FolderData) => {
        navigate('viewer', { folder: folder.path });
    };

    const handleRemoveFolder = async (folder: FolderData, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            // @ts-ignore - Wails generated bindings
            await window.go?.main?.App?.RemoveLibraryEntry(folder.path);
            setFolders((prev) => prev.filter((f) => f.path !== folder.path));
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

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <div
            className="h-full overflow-auto p-6"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1
                    className="text-2xl font-bold"
                    style={{ color: 'var(--color-text-primary)' }}
                >
                    {t('folders.title')}
                </h1>
                <div className="flex items-center gap-2">
                    {folders.length > 0 && (
                        <motion.button
                            onClick={handleClearAll}
                            className="btn-ghost text-red-500 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <TrashIcon />
                            {t('folders.clearAll')}
                        </motion.button>
                    )}
                    <motion.button
                        onClick={handleSelectFolder}
                        className="btn-primary flex items-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <PlusIcon />
                        {t('folders.addFolder')}
                    </motion.button>
                </div>
            </div>

            {/* Folders grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <motion.div
                        className="w-12 h-12 border-4 rounded-full"
                        style={{
                            borderColor: 'var(--color-accent)',
                            borderTopColor: 'transparent',
                        }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                </div>
            ) : folders.length === 0 ? (
                <motion.div
                    className="flex flex-col items-center justify-center py-20 rounded-2xl"
                    style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        border: '2px dashed var(--color-border)',
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <motion.div
                        className="mb-4"
                        style={{ color: 'var(--color-text-muted)' }}
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <FolderIcon />
                    </motion.div>
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
                    <motion.button
                        onClick={handleSelectFolder}
                        className="btn-secondary"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {t('folders.selectFolder')}
                    </motion.button>
                </motion.div>
            ) : (
                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <AnimatePresence>
                        {folders.map((folder) => (
                            <motion.div
                                key={folder.path}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                layout
                                onClick={() => handleOpenFolder(folder)}
                                className="group relative rounded-xl overflow-hidden cursor-pointer hover-lift shadow-sm"
                                style={{
                                    backgroundColor: 'var(--color-surface-secondary)',
                                    border: '1px solid var(--color-border)',
                                }}
                                whileHover={{ borderColor: 'var(--color-accent)' }}
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
                                            <motion.div
                                                style={{ color: 'var(--color-text-muted)' }}
                                                animate={{ scale: [1, 1.1, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                            >
                                                <FolderIcon />
                                            </motion.div>
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
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
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
                                    <motion.button
                                        onClick={(e) => handleRemoveFolder(folder, e)}
                                        className="absolute top-2 right-2 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{
                                            backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                            color: 'white',
                                        }}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        title={t('folders.removeFolder')}
                                    >
                                        <TrashIcon />
                                    </motion.button>
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
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
}

export default FoldersPage;
