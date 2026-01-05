/**
 * SeriesDetailsPage - Display chapters of a specific series
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../../stores/navigationStore';
import { ChapterInfo, SeriesEntry } from '../../types';

// Icons
const ChevronLeftIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const ImageIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
    </svg>
);

interface SeriesDetailsPageProps {
    seriesPath: string;
}

export function SeriesDetailsPage({ seriesPath }: SeriesDetailsPageProps) {
    const { t } = useTranslation();
    const { navigate, goBack } = useNavigationStore();
    const [series, setSeries] = useState<SeriesEntry | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

    useEffect(() => {
        loadSeriesDetails();
    }, [seriesPath]);

    const loadSeriesDetails = async () => {
        setIsLoading(true);
        try {
            // @ts-ignore
            const data = await window.go?.main?.App?.GetSeries();
            if (data && Array.isArray(data)) {
                const found = data.find((s: SeriesEntry) => s.path === seriesPath);
                if (found) {
                    setSeries(found);
                    // Initialize thumbnails from the chapter metadata
                    const initialThumbs: Record<string, string> = {};
                    for (const chapter of found.chapters) {
                        if (chapter.thumbnailUrl) {
                            initialThumbs[chapter.path] = chapter.thumbnailUrl;
                        }
                    }
                    setThumbnails(initialThumbs);
                }
            }
        } catch (error) {
            console.error('Failed to load series details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadChapterThumbnail = async (path: string) => {
        try {
            // @ts-ignore
            const images = await window.go?.main?.App?.GetImages(path);
            if (images && images.length > 0) {
                // @ts-ignore
                const thumb = await window.go?.main?.App?.GetThumbnail(images[0].path);
                if (thumb) {
                    setThumbnails((prev) => ({ ...prev, [path]: thumb }));
                }
            }
        } catch (error) {
            console.error('Failed to load chapter thumbnail:', error);
        }
    };

    const handleOpenChapter = (path: string) => {
        navigate('viewer', { folder: path });
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
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 },
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
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
        );
    }

    if (!series) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <p className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                    Series not found
                </p>
                <button onClick={goBack} className="btn-primary">
                    {t('common.back')}
                </button>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto p-6" style={{ backgroundColor: 'var(--color-surface-primary)' }}>
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <motion.button
                    onClick={goBack}
                    className="p-2 rounded-lg transition-colors hover:bg-white/5"
                    style={{ color: 'var(--color-text-secondary)' }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <ChevronLeftIcon />
                </motion.button>
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {series.name}
                    </h1>
                    <p className="text-sm opacity-60" style={{ color: 'var(--color-text-muted)' }}>
                        {series.path}
                    </p>
                </div>
            </div>

            {/* Chapters Grid */}
            <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {series.chapters.map((chapter: ChapterInfo) => (
                    <motion.div
                        key={chapter.path}
                        variants={itemVariants}
                        onClick={() => handleOpenChapter(chapter.path)}
                        className="group flex flex-col cursor-pointer"
                    >
                        <div
                            className="aspect-[3/4] rounded-xl overflow-hidden mb-3 relative shadow-lg"
                            style={{ backgroundColor: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)' }}
                        >
                            {thumbnails[chapter.path] ? (
                                <img
                                    src={thumbnails[chapter.path]}
                                    alt={chapter.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-20">
                                    <ImageIcon />
                                </div>
                            )}

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="bg-accent text-white px-4 py-2 rounded-full font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                    Read Now
                                </span>
                            </div>
                        </div>

                        <h3
                            className="font-bold truncate group-hover:text-accent transition-colors"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            {chapter.name}
                        </h3>
                        <p className="text-xs opacity-60" style={{ color: 'var(--color-text-muted)' }}>
                            {chapter.imageCount} pages
                        </p>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}

export default SeriesDetailsPage;
