/**
 * HistoryListItem - List item component for history entries
 */

import { useTranslation } from 'react-i18next';
import { Tooltip } from '@shared/components';
import { HistoryThumbnail } from './HistoryThumbnail';
import { PlayIcon, TrashIcon } from './HistoryIcons';
import { formatDate, getProgress } from '../utils';
import type { HistoryEntry } from '../types';

interface HistoryListItemProps {
    entry: HistoryEntry;
    onContinue: (entry: HistoryEntry) => void;
    onAuxClick: (e: React.MouseEvent, entry: HistoryEntry) => void;
    onRemove: (entry: HistoryEntry, e: React.MouseEvent) => void;
}

export function HistoryListItem({ entry, onContinue, onAuxClick, onRemove }: HistoryListItemProps) {
    const { t } = useTranslation();
    const progress = getProgress(entry);

    return (
        <div
            onClick={() => onContinue(entry)}
            onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
            onAuxClick={(e) => onAuxClick(e, entry)}
            className="group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:border-accent hover-lift"
            style={{
                backgroundColor: 'var(--color-surface-secondary)',
                border: '1px solid var(--color-border)',
            }}
        >
            {/* Thumbnail */}
            <div
                className="relative w-20 h-28 rounded-lg overflow-hidden flex-shrink-0"
                style={{ backgroundColor: 'var(--color-surface-tertiary)' }}
            >
                <HistoryThumbnail entry={entry} />

                {/* Play overlay */}
                <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                >
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                        style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                    >
                        <PlayIcon />
                    </div>
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
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                backgroundColor: 'var(--color-accent)',
                                width: `${progress}%`
                            }}
                        />
                    </div>
                    <span
                        className="text-xs font-medium"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        {progress}%
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

                <Tooltip content={t('history.remove') || 'Remove'} placement="left">
                    <button
                        onClick={(e) => onRemove(entry, e)}
                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 active:scale-90"
                        style={{
                            backgroundColor: 'var(--color-surface-tertiary)',
                            color: '#ef4444',
                        }}
                    >
                        <TrashIcon />
                    </button>
                </Tooltip>
            </div>
        </div>
    );
}
