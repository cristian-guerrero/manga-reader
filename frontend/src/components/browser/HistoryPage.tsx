/**
 * HistoryPage - Reading history management
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../../stores/navigationStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { EventsOn, EventsOff } from '../../../wailsjs/runtime';



// Icons
const ClockIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const PlayIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
);

const TrashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

interface HistoryEntry {
    id: string;
    folderPath: string;
    folderName: string;
    lastImage: string;
    lastImageIndex: number;
    scrollPosition: number;
    totalImages: number;
    lastRead: string;
}

export function HistoryPage() {
    const { t } = useTranslation();
    const { navigate } = useNavigationStore();
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
    const { enableHistory } = useSettingsStore();

    useEffect(() => {
        if (enableHistory) {
            loadHistory();

            const cleanup = EventsOn('history_updated', () => {
                loadHistory();
            });

            return () => {
                EventsOff('history_updated');
            };
        } else {
            setIsLoading(false);
            setHistory([]);
        }
    }, [enableHistory]);



    const loadHistory = async () => {
        setIsLoading(true);
        try {
            // @ts-ignore - Wails generated bindings
            const entries = await window.go?.main?.App?.GetHistory();
            if (entries && Array.isArray(entries)) {
                setHistory(entries);

                // Load thumbnails
                for (const entry of entries) {
                    loadThumbnail(entry);
                }
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadThumbnail = async (entry: HistoryEntry) => {
        try {
            // @ts-ignore - Wails generated bindings
            const images = await window.go?.main?.App?.GetImages(entry.folderPath);
            if (images && images.length > entry.lastImageIndex) {
                // @ts-ignore - Wails generated bindings
                const thumb = await window.go?.main?.App?.GetThumbnail(images[entry.lastImageIndex].path);
                if (thumb) {
                    setThumbnails((prev) => ({ ...prev, [entry.id]: thumb }));
                }
            }
        } catch (error) {
            // Silently fail for thumbnails
        }
    };

    const handleContinue = (entry: HistoryEntry) => {
        navigate('viewer', { folder: entry.folderPath });
    };

    const handleRemove = async (entry: HistoryEntry, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            // @ts-ignore - Wails generated bindings
            await window.go?.main?.App?.RemoveHistory(entry.folderPath);
            setHistory((prev) => prev.filter((h) => h.id !== entry.id));
        } catch (error) {
            console.error('Failed to remove history entry:', error);
        }
    };

    const handleClearAll = async () => {
        if (!confirm(t('history.confirmClear'))) return;

        try {
            // @ts-ignore - Wails generated bindings
            await window.go?.main?.App?.ClearHistory();
            setHistory([]);
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateString;
        }
    };

    const getProgress = (entry: HistoryEntry) => {
        if (entry.totalImages === 0) return 0;
        return Math.round(((entry.lastImageIndex + 1) / entry.totalImages) * 100);
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
                    {t('history.title')}
                </h1>
                {enableHistory && history.length > 0 && (
                    <motion.button
                        onClick={handleClearAll}
                        className="btn-ghost text-sm flex items-center gap-2"
                        style={{ color: '#ef4444' }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <TrashIcon />
                        {t('history.clearHistory')}
                    </motion.button>
                )}
            </div>

            {/* History list */}
            {!enableHistory ? (
                <motion.div
                    className="flex flex-col items-center justify-center py-20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <motion.div
                        className="mb-4 text-4xl"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        🚫
                    </motion.div>
                    <p
                        className="text-lg font-medium"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {t('history.disabled')}
                    </p>
                    <p
                        className="text-sm mt-2"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        {t('history.disabledDesc')}
                    </p>
                </motion.div>
            ) : isLoading ? (
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
            ) : history.length === 0 ? (
                <motion.div
                    className="flex flex-col items-center justify-center py-20 rounded-2xl"
                    style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        border: '1px solid var(--color-border)',
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <motion.div
                        className="mb-4"
                        style={{ color: 'var(--color-text-muted)' }}
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                    >
                        <ClockIcon />
                    </motion.div>
                    <p
                        className="text-lg font-medium"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {t('history.noHistory')}
                    </p>
                </motion.div>
            ) : (
                <motion.div
                    className="space-y-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <AnimatePresence>
                        {history.map((entry, index) => (
                            <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20, height: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => handleContinue(entry)}
                                className="group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover-lift"
                                style={{
                                    backgroundColor: 'var(--color-surface-secondary)',
                                    border: '1px solid var(--color-border)',
                                }}
                                whileHover={{ borderColor: 'var(--color-accent)' }}
                            >
                                {/* Thumbnail */}
                                <div
                                    className="relative w-20 h-28 rounded-lg overflow-hidden flex-shrink-0"
                                    style={{ backgroundColor: 'var(--color-surface-tertiary)' }}
                                >
                                    {thumbnails[entry.id] ? (
                                        <img
                                            src={thumbnails[entry.id]}
                                            alt={entry.folderName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <ClockIcon />
                                        </div>
                                    )}

                                    {/* Play overlay */}
                                    <div
                                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                                    >
                                        <motion.div
                                            className="w-10 h-10 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: 'var(--color-accent)' }}
                                            whileHover={{ scale: 1.1 }}
                                        >
                                            <PlayIcon />
                                        </motion.div>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3
                                        className="font-semibold truncate mb-1"
                                        style={{ color: 'var(--color-text-primary)' }}
                                    >
                                        {entry.folderName}
                                    </h3>

                                    <p
                                        className="text-sm mb-2"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        {t('history.continueFrom')} {entry.lastImageIndex + 1} / {entry.totalImages}
                                    </p>

                                    {/* Progress bar */}
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="flex-1 h-1.5 rounded-full overflow-hidden"
                                            style={{ backgroundColor: 'var(--color-surface-tertiary)' }}
                                        >
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{ backgroundColor: 'var(--color-accent)' }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${getProgress(entry)}%` }}
                                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                            />
                                        </div>
                                        <span
                                            className="text-xs font-medium"
                                            style={{ color: 'var(--color-text-muted)' }}
                                        >
                                            {getProgress(entry)}%
                                        </span>
                                    </div>
                                </div>

                                {/* Date and actions */}
                                <div className="flex flex-col items-end gap-2">
                                    <span
                                        className="text-xs"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        {formatDate(entry.lastRead)}
                                    </span>

                                    <motion.button
                                        onClick={(e) => handleRemove(entry, e)}
                                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{
                                            backgroundColor: 'var(--color-surface-tertiary)',
                                            color: '#ef4444',
                                        }}
                                        whileHover={{
                                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <TrashIcon />
                                    </motion.button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
}

export default HistoryPage;
