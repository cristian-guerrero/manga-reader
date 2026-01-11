/**
 * RecentHistoryGrid - Grid of recent history entries
 */

import { useTranslation } from 'react-i18next';
import { Tooltip } from '@shared/components';
import { HomeThumbnail } from './HomeThumbnail';
import { ArrowRightIcon, TrashIcon } from './HomeIcons';
import type { HistoryEntry } from '../types';

interface RecentHistoryGridProps {
    entries: HistoryEntry[];
    onContinue: (path: string) => void;
    onAuxClick: (e: React.MouseEvent, path: string, name: string) => void;
    onRemove: (path: string, e: React.MouseEvent) => void;
    onViewFullHistory: () => void;
}

export function RecentHistoryGrid({
    entries,
    onContinue,
    onAuxClick,
    onRemove,
    onViewFullHistory,
}: RecentHistoryGridProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <span className="w-1 h-6 bg-accent rounded-full" />
                Recent History
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {entries.map((entry, idx) => {
                    const progress = Math.round(((entry.lastImageIndex + 1) / entry.totalImages) * 100);
                    return (
                        <div
                            key={entry.id}
                            className="bg-surface-secondary rounded-xl overflow-hidden border border-white/5 hover:border-accent/30 transition-all group flex flex-col hover:-translate-y-1 animate-scale-in"
                            style={{ animationDelay: `${(idx + 1) * 0.05}s` }}
                            onClick={() => onContinue(entry.folderPath)}
                            onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
                            onAuxClick={(e) => onAuxClick(e, entry.folderPath, entry.folderName)}
                        >
                            <div className="aspect-[3/4] relative overflow-hidden bg-surface-tertiary">
                                <HomeThumbnail
                                    entryId={entry.id}
                                    folderPath={entry.folderPath}
                                />
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-tertiary">
                                    <div
                                        className="h-full bg-accent"
                                        style={{ width: `${progress}%` }}
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
                                <div className="mt-4 flex items-end justify-between">
                                    <div className="text-xs font-semibold text-accent uppercase tracking-tighter">
                                        Page {entry.lastImageIndex + 1} of {entry.totalImages}
                                    </div>
                                    <Tooltip content={t('common.remove') || "Remove"} placement="top">
                                        <button
                                            onClick={(e) => onRemove(entry.folderPath, e)}
                                            className="p-1.5 rounded-lg bg-surface-tertiary/50 text-text-muted hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-90"
                                            aria-label={t('common.remove') || "Remove"}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Browse More Card */}
                <div
                    className="bg-surface-secondary/50 rounded-xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center cursor-pointer hover:border-accent/40 transition-all py-12 hover:scale-[0.98] animate-scale-in"
                    style={{ animationDelay: '0.2s' }}
                    onClick={onViewFullHistory}
                >
                    <div className="w-12 h-12 rounded-full bg-surface-tertiary flex items-center justify-center mb-4 text-text-muted group-hover:text-accent transition-colors">
                        <ArrowRightIcon />
                    </div>
                    <span className="text-sm font-bold text-text-secondary">View Full History</span>
                </div>
            </div>
        </div>
    );
}
