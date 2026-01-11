/**
 * HistoryGridItem - Grid item component for history entries
 */

import { useTranslation } from 'react-i18next';
import { GridItem, Tooltip } from '@shared/components';
import { HistoryThumbnail } from './HistoryThumbnail';
import { PlayIcon, TrashIcon } from './HistoryIcons';
import { formatDate, getProgress } from '../utils';
import type { HistoryEntry } from '../types';

interface HistoryGridItemProps {
    entry: HistoryEntry;
    onContinue: (entry: HistoryEntry) => void;
    onAuxClick: (e: React.MouseEvent, entry: HistoryEntry) => void;
    onRemove: (entry: HistoryEntry, e: React.MouseEvent) => void;
}

export function HistoryGridItem({ entry, onContinue, onAuxClick, onRemove }: HistoryGridItemProps) {
    const { t } = useTranslation();
    const progress = getProgress(entry);

    return (
        <GridItem>
            <div
                onClick={() => onContinue(entry)}
                onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
                onAuxClick={(e) => onAuxClick(e, entry)}
                className="group/card relative rounded-xl overflow-hidden cursor-pointer hover-lift shadow-sm hover:border-accent transition-all"
                style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    border: '1px solid var(--color-border)',
                }}
            >
                {/* Thumbnail */}
                <div
                    className="aspect-[3/4] relative overflow-hidden"
                    style={{ backgroundColor: 'var(--color-surface-tertiary)' }}
                >
                    <HistoryThumbnail entry={entry} />

                    {/* Play overlay */}
                    <div
                        className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none"
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                    >
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-2xl backdrop-blur-md"
                            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                        >
                            <PlayIcon />
                        </div>
                    </div>

                    {/* Remove button */}
                    <div className="absolute top-2 right-2 z-20 opacity-0 group-hover/card:opacity-100 transition-all">
                        <Tooltip content={t('history.remove') || 'Remove'} placement="left">
                            <button
                                onClick={(e) => onRemove(entry, e)}
                                className="p-2 rounded-full hover:scale-110 active:scale-90"
                                style={{
                                    backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                    color: 'white',
                                }}
                                aria-label={t('history.remove') || 'Remove'}
                            >
                                <TrashIcon />
                            </button>
                        </Tooltip>
                    </div>

                    {/* Progress overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                        <div className="flex items-center gap-2 mb-1">
                            <div
                                className="flex-1 h-1.5 rounded-full overflow-hidden"
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                            >
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        backgroundColor: 'var(--color-accent)',
                                        width: `${progress}%`
                                    }}
                                />
                            </div>
                            <span
                                className="text-xs font-medium text-white"
                            >
                                {progress}%
                            </span>
                        </div>
                        <span
                            className="text-xs text-white/80"
                        >
                            {entry.lastImageIndex + 1} / {entry.totalImages}
                        </span>
                    </div>
                </div>

                {/* Info */}
                <div className="p-3">
                    <h3
                        className="font-semibold truncate mb-1"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {entry.folderName}
                    </h3>
                    <p
                        className="text-xs"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        {formatDate(entry.lastRead)}
                    </p>
                </div>
            </div>
        </GridItem>
    );
}
