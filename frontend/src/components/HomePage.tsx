/**
 * HomePage - Welcome screen with recent history and folder selection
 */

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../stores/navigationStore';

// Icons
const FolderPlusIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        <line x1="12" y1="11" x2="12" y2="17" />
        <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
);

const BookOpenIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

export function HomePage() {
    const { t } = useTranslation();
    const { navigate } = useNavigationStore();
    const [historyEntries, setHistoryEntries] = useState<any[]>([]);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadRecentHistory();
    }, []);

    const loadRecentHistory = async () => {
        setIsLoading(true);
        try {
            // @ts-ignore
            const entries = await window.go?.main?.App?.GetHistory();
            if (entries && Array.isArray(entries) && entries.length > 0) {
                // Show up to 4 recent items
                const recent = entries.slice(0, 4);
                setHistoryEntries(recent);

                // Load thumbnails in parallel
                recent.forEach(async (entry) => {
                    try {
                        // @ts-ignore
                        const images = await window.go?.main?.App?.GetImages(entry.folderPath);
                        if (images && images.length > entry.lastImageIndex) {
                            // @ts-ignore
                            const thumb = await window.go?.main?.App?.GetThumbnail(images[entry.lastImageIndex].path);
                            if (thumb) {
                                setThumbnails(prev => ({ ...prev, [entry.id]: thumb }));
                            }
                        }
                    } catch (err) {
                        console.error('Failed to load thumbnail for', entry.folderName, err);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleContinue = (path: string) => {
        navigate('viewer', { folder: path });
    };

    const handleSelectFolder = async () => {
        navigate('folders');
    };

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: 'easeOut' },
        },
    };

    return (
        <motion.div
            className="flex flex-col items-center min-h-full px-8 py-12"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {historyEntries.length > 0 ? (
                <div className="w-full max-w-6xl space-y-12">
                    {/* Featured Recent Item (The very last one read) */}
                    <motion.div variants={itemVariants} className="w-full flex flex-col md:flex-row gap-8 items-center bg-surface-secondary p-8 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
                        {/* Background Glow */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/10 blur-3xl rounded-full pointer-events-none" />

                        {/* Thumbnail / Cover */}
                        <motion.div
                            className="w-48 h-72 rounded-lg overflow-hidden shadow-lg flex-shrink-0 bg-surface-tertiary relative group cursor-pointer border border-white/5"
                            onClick={() => handleContinue(historyEntries[0].folderPath)}
                            whileHover={{ scale: 1.02 }}
                        >
                            {thumbnails[historyEntries[0].id] ? (
                                <img src={thumbnails[historyEntries[0].id]} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-text-muted">
                                    <BookOpenIcon />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="bg-accent text-white p-3 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                    <BookOpenIcon />
                                </div>
                            </div>
                        </motion.div>

                        {/* Info */}
                        <div className="flex-1 flex flex-col items-start text-left">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-semibold mb-3 tracking-wider"
                            >
                                CONTINUE READING
                            </motion.div>

                            <h1 className="text-3xl font-bold text-text-primary mb-2 line-clamp-2">
                                {historyEntries[0].folderName}
                            </h1>

                            <p className="text-text-secondary mb-6 line-clamp-1 opacity-60 text-sm">
                                {historyEntries[0].folderPath}
                            </p>

                            <div className="w-full bg-surface-tertiary h-2 rounded-full mb-2 overflow-hidden">
                                <motion.div
                                    className="h-full bg-accent"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.round(((historyEntries[0].lastImageIndex + 1) / historyEntries[0].totalImages) * 100)}%` }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                />
                            </div>
                            <div className="flex justify-between w-full text-sm text-text-muted mb-8">
                                <span>Page {historyEntries[0].lastImageIndex + 1} of {historyEntries[0].totalImages}</span>
                                <span>{Math.round(((historyEntries[0].lastImageIndex + 1) / historyEntries[0].totalImages) * 100)}% Complete</span>
                            </div>

                            <div className="flex gap-4 w-full">
                                <motion.button
                                    onClick={() => handleContinue(historyEntries[0].folderPath)}
                                    className="flex-1 btn-primary py-3 text-lg shadow-lg shadow-accent/20"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Continue Reading
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Other Recent Items Grid */}
                    {historyEntries.length > 1 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                                <span className="w-1 h-6 bg-accent rounded-full" />
                                Recent History
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                {historyEntries.slice(1).map((entry) => (
                                    <motion.div
                                        key={entry.id}
                                        variants={itemVariants}
                                        className="bg-surface-secondary rounded-xl overflow-hidden border border-white/5 hover:border-accent/30 transition-all group flex flex-col"
                                        whileHover={{ y: -4 }}
                                        onClick={() => handleContinue(entry.folderPath)}
                                    >
                                        <div className="aspect-[3/4] relative overflow-hidden bg-surface-tertiary">
                                            {thumbnails[entry.id] ? (
                                                <img src={thumbnails[entry.id]} alt={entry.folderName} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-text-muted">
                                                    <BookOpenIcon />
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-tertiary">
                                                <div
                                                    className="h-full bg-accent"
                                                    style={{ width: `${Math.round(((entry.lastImageIndex + 1) / entry.totalImages) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-bold text-text-primary line-clamp-1 mb-1 group-hover:text-accent transition-colors">
                                                    {entry.folderName}
                                                </h3>
                                                <p className="text-xs text-text-muted line-clamp-1 opacity-80">
                                                    {entry.folderPath}
                                                </p>
                                            </div>
                                            <div className="mt-4 text-xs font-semibold text-accent uppercase tracking-tighter">
                                                Page {entry.lastImageIndex + 1} of {entry.totalImages}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}

                                {/* Browse More Card */}
                                <motion.div
                                    variants={itemVariants}
                                    className="bg-surface-secondary/50 rounded-xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center cursor-pointer hover:border-accent/40 transition-colors py-12"
                                    onClick={() => navigate('history')}
                                    whileHover={{ scale: 0.98 }}
                                >
                                    <div className="w-12 h-12 rounded-full bg-surface-tertiary flex items-center justify-center mb-4 text-text-muted group-hover:text-accent transition-colors">
                                        <ArrowRightIcon />
                                    </div>
                                    <span className="text-sm font-bold text-text-secondary">View Full History</span>
                                </motion.div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // Welcome View (No History)
                <motion.div
                    variants={itemVariants}
                    className="flex flex-col items-center text-center max-w-2xl"
                >
                    {/* Animated Logo */}
                    <motion.div
                        className="relative mb-8"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.6, ease: 'backOut' }}
                    >
                        {/* Glow effect */}
                        <motion.div
                            className="absolute inset-0 rounded-full blur-3xl"
                            style={{ backgroundColor: 'var(--color-accent-glow)' }}
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 0.8, 0.5],
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        />

                        {/* Icon container */}
                        <div
                            className="relative flex items-center justify-center w-24 h-24 rounded-2xl"
                            style={{
                                background: 'var(--gradient-accent)',
                                boxShadow: 'var(--shadow-glow)',
                            }}
                        >
                            <motion.div
                                animate={{ rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                style={{ color: 'white' }}
                            >
                                <BookOpenIcon />
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Title */}
                    <motion.h1
                        variants={itemVariants}
                        className="text-4xl font-bold mb-3 text-gradient"
                    >
                        {t('home.welcome')}
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        variants={itemVariants}
                        className="text-lg mb-8"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {t('home.subtitle')}
                    </motion.p>

                    {/* CTA Button */}
                    <motion.button
                        variants={itemVariants}
                        onClick={handleSelectFolder}
                        className="group flex items-center gap-3 px-8 py-4 rounded-xl text-white font-semibold text-lg
                     transition-all duration-300"
                        style={{
                            background: 'var(--gradient-accent)',
                            boxShadow: 'var(--shadow-md)',
                        }}
                        whileHover={{
                            scale: 1.02,
                            boxShadow: 'var(--shadow-glow)',
                        }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <FolderPlusIcon />
                        <span>{t('home.selectFolder')}</span>
                        <motion.div
                            className="transition-transform group-hover:translate-x-1"
                        >
                            <ArrowRightIcon />
                        </motion.div>
                    </motion.button>
                </motion.div>
            )}

            {/* Recent History Section - Only show if current view is NOT the continue reading card OR if there are multiple history items */}
            {/* Keeping it simple: If we have history, we show the card. If they want to see more they go to history page */}

            {/* Link to full history if displaying welcome screen or if we want to provide access */}
            <motion.div
                variants={itemVariants}
                className="mt-16 w-full max-w-4xl flex justify-center"
            >
                <motion.button
                    onClick={() => navigate('history')}
                    className="text-sm font-medium px-6 py-2 rounded-full transition-colors border border-white/5 bg-surface-secondary text-text-secondary hover:text-white hover:bg-surface-tertiary"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {t('common.history')} →
                </motion.button>
            </motion.div>


            {/* Decorative Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                {/* Top right gradient */}
                <div
                    className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                />
                {/* Bottom left gradient */}
                <div
                    className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-10"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                />
            </div>
        </motion.div>
    );
}

export default HomePage;
