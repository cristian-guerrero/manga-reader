/**
 * FoldersPage - Folder browser and management
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../../stores/navigationStore';

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
}

export function FoldersPage() {
    const { t } = useTranslation();
    const { navigate } = useNavigationStore();
    const [folders, setFolders] = useState<FolderData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

    // Load folders from settings/history
    useEffect(() => {
        loadFolders();
    }, []);

    const loadFolders = async () => {
        setIsLoading(true);
        try {
            // @ts-ignore - Wails generated bindings
            const history = await window.go?.main?.App?.GetHistory();
            if (history && Array.isArray(history)) {
                const folderData = history.map((entry: any) => ({
                    path: entry.folderPath,
                    name: entry.folderName,
                    imageCount: entry.totalImages,
                    coverImage: undefined,
                }));
                setFolders(folderData);

                // Load thumbnails for cover images
                for (const entry of history) {
                    if (entry.folderPath) {
                        loadFolderThumbnail(entry.folderPath);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load folders:', error);
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
                navigate('viewer', { folder: folderPath });
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
            await window.go?.main?.App?.RemoveHistory(folder.path);
            setFolders((prev) => prev.filter((f) => f.path !== folder.path));
        } catch (error) {
            console.error('Failed to remove folder:', error);
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
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <AnimatePresence>
                        {folders.map((folder) => (
                            <motion.div
                                key={folder.path}
                                variants={itemVariants}
                                layout
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={() => handleOpenFolder(folder)}
                                className="group relative rounded-xl overflow-hidden cursor-pointer hover-lift"
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
