/**
 * SeriesPage - Series browser
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../../stores/navigationStore';
import { EventsOn, EventsOff } from '../../../wailsjs/runtime';
import { SeriesEntry } from '../../types';

// Icons
const SeriesIcon = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6" y2="6.01" />
        <line x1="6" y1="18" x2="6" y2="18.01" />
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

const BookIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
);

export function SeriesPage() {
    const { t } = useTranslation();
    const { navigate } = useNavigationStore();
    const [series, setSeries] = useState<SeriesEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

    useEffect(() => {
        let isMounted = true;
        let unsubscribe: () => void;

        const init = async () => {
            await ensureWailsReady();
            if (!isMounted) return;

            loadSeries();

            unsubscribe = EventsOn('series_updated', () => {
                if (isMounted) loadSeries();
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
            if (window.go?.main?.App?.GetSeries) return true;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.warn('Wails bindings not ready after timeout');
        return false;
    };

    const loadSeries = async (retryCount = 0) => {
        setIsLoading(true);
        console.log(`[SeriesPage] Loading series (attempt ${retryCount + 1})...`);
        try {
            // @ts-ignore
            const app = window.go?.main?.App;
            if (!app) {
                console.log('[SeriesPage] Wails bindings not found');
                if (retryCount < 3) {
                    setTimeout(() => loadSeries(retryCount + 1), 500);
                    return;
                }
                throw new Error('Bindings not available');
            }

            const data = await app.GetSeries();
            console.log(`[SeriesPage] Series received: ${data?.length || 0} items`);
            if (data && Array.isArray(data)) {
                setSeries(data);

                // Load thumbnails
                for (const entry of data) {
                    if (entry.coverImage) {
                        loadThumbnail(entry.id, entry.coverImage);
                    }
                }
            }
        } catch (error) {
            console.error('[SeriesPage] Failed to load series:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadThumbnail = async (id: string, path: string) => {
        try {
            // @ts-ignore
            const thumb = await window.go?.main?.App?.GetThumbnail(path);
            if (thumb) {
                setThumbnails((prev) => ({ ...prev, [id]: thumb }));
            }
        } catch (error) {
            console.error('Failed to load thumbnail:', error);
        }
    };

    const handleSelectFolder = async () => {
        try {
            // @ts-ignore
            const folderPath = await window.go?.main?.App?.SelectFolder();
            if (folderPath) {
                // @ts-ignore
                await window.go?.main?.App?.AddFolder(folderPath);
                // The event 'series_updated' will trigger reloading if it was a series
                // If it was a folder, it will be added to library
            }
        } catch (error) {
            console.error('Failed to select folder:', error);
        }
    };

    const handleOpenSeries = (entry: SeriesEntry) => {
        navigate('series-details', { series: entry.path });
    };

    const handleRemoveSeries = async (entry: SeriesEntry, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            // @ts-ignore
            await window.go?.main?.App?.RemoveSeries(entry.path);
            setSeries((prev) => prev.filter((s) => s.path !== entry.path));
        } catch (error) {
            console.error('Failed to remove series:', error);
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm(t('series.confirmClear'))) return;
        try {
            // @ts-ignore
            await window.go?.main?.App?.ClearSeries();
            setSeries([]);
        } catch (error) {
            console.error('Failed to clear series:', error);
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
                    {t('series.title')}
                </h1>
                <div className="flex items-center gap-2">
                    {series.length > 0 && (
                        <motion.button
                            onClick={handleClearAll}
                            className="btn-ghost text-red-500 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <TrashIcon />
                            {t('series.clearAll')}
                        </motion.button>
                    )}
                    <motion.button
                        onClick={handleSelectFolder}
                        className="btn-primary flex items-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <PlusIcon />
                        {t('series.addSeries')}
                    </motion.button>
                </div>
            </div>

            {/* Series grid */}
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
            ) : series.length === 0 ? (
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
                        <SeriesIcon />
                    </motion.div>
                    <p
                        className="text-lg font-medium mb-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {t('series.noSeries')}
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
                        {series.map((item) => (
                            <motion.div
                                key={item.path}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                layout
                                onClick={() => handleOpenSeries(item)}
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
                                    {thumbnails[item.id] ? (
                                        <img
                                            src={thumbnails[item.id]}
                                            alt={item.name}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <motion.div
                                                style={{ color: 'var(--color-text-muted)' }}
                                                animate={{ scale: [1, 1.1, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                            >
                                                <SeriesIcon />
                                            </motion.div>
                                        </div>
                                    )}

                                    {/* Archive Badge */}
                                    {item.isTemporary && (
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
                                            {t('series.openSeries')}
                                        </span>
                                    </div>

                                    {/* Remove button */}
                                    <motion.button
                                        onClick={(e) => handleRemoveSeries(item, e)}
                                        className="absolute top-2 right-2 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{
                                            backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                            color: 'white',
                                        }}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        title={t('series.removeSeries')}
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
                                        {item.name}
                                    </h3>
                                    <div
                                        className="flex items-center gap-1 text-sm"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        <BookIcon />
                                        <span>
                                            {t('series.chapterCount', { count: item.chapters?.length || 0 })}
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

export default SeriesPage;
