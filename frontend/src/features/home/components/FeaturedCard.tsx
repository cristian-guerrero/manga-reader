/**
 * FeaturedCard - Featured card for the most recent history entry
 */

import { useTranslation } from 'react-i18next';
import { Button, Tooltip } from '@shared/components';
import { HomeThumbnail } from './HomeThumbnail';
import { BookOpenIcon, TrashIcon } from './HomeIcons';
import type { HistoryEntry } from '../types';

interface FeaturedCardProps {
    entry: HistoryEntry;
    onContinue: (path: string) => void;
    onAuxClick: (e: React.MouseEvent, path: string, name: string) => void;
    onRemove: (path: string, e: React.MouseEvent) => void;
}

export function FeaturedCard({ entry, onContinue, onAuxClick, onRemove }: FeaturedCardProps) {
    const { t } = useTranslation();
    const progress = Math.round(((entry.lastImageIndex + 1) / entry.totalImages) * 100);

    return (
        <div className="w-full flex flex-col md:flex-row gap-8 items-center bg-surface-secondary p-8 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden animate-scale-in">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/10 blur-3xl rounded-full pointer-events-none" />

            {/* Thumbnail / Cover */}
            <div
                className="w-48 h-72 rounded-lg overflow-hidden shadow-lg flex-shrink-0 bg-surface-tertiary relative group cursor-pointer border border-white/5 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => onContinue(entry.folderPath)}
                onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
                onAuxClick={(e) => onAuxClick(e, entry.folderPath, entry.folderName)}
            >
                <HomeThumbnail
                    entryId={entry.id}
                    folderPath={entry.folderPath}
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="bg-accent text-white p-3 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        <BookOpenIcon />
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col items-start text-left">
                <div
                    className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-semibold mb-3 tracking-wider animate-slide-in-right"
                >
                    CONTINUE READING
                </div>

                <h1 className="text-3xl font-bold text-text-primary mb-2 line-clamp-2 animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
                    <Tooltip content={entry.folderName}>
                        <span>{entry.folderName}</span>
                    </Tooltip>
                </h1>

                <p className="text-text-secondary mb-6 line-clamp-1 opacity-60 text-sm animate-slide-in-right" style={{ animationDelay: '0.15s' }}>
                    {entry.folderPath}
                </p>

                <div className="w-full bg-surface-tertiary h-2 rounded-full mb-2 overflow-hidden">
                    <div
                        className="h-full bg-accent transition-all duration-1000 ease-out"
                        style={{
                            width: `${progress}%`,
                            transitionDelay: '0.5s'
                        }}
                    />
                </div>
                <div className="flex justify-between w-full text-sm text-text-muted mb-8">
                    <span>Page {entry.lastImageIndex + 1} of {entry.totalImages}</span>
                    <span>{progress}% Complete</span>
                </div>

                <div className="flex gap-4 w-full">
                    <Button
                        onClick={() => onContinue(entry.folderPath)}
                        variant="primary"
                        className="flex-1 py-3 text-lg shadow-lg shadow-accent/20"
                    >
                        Continue Reading
                    </Button>

                    <Tooltip content={t('common.remove') || "Remove from history"} placement="left">
                        <button
                            onClick={(e) => onRemove(entry.folderPath, e)}
                            className="px-4 py-3 rounded-xl bg-surface-tertiary text-text-muted hover:text-red-500 transition-all hover:scale-[1.05] active:scale-[0.95] border border-white/5"
                            aria-label={t('common.remove') || "Remove from history"}
                        >
                            <TrashIcon />
                        </button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}
