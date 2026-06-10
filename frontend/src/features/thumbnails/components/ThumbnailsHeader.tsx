/**
 * ThumbnailsHeader - Header component for thumbnails page
 */

import { useTranslation } from 'react-i18next';
import { BackIcon, ResetIcon } from './ThumbnailsIcons';

interface ThumbnailsHeaderProps {
    imageCount: number;
    sortMode: string;
    hasCustomOrder: boolean;
    onBack: () => void;
    onSortChange: (mode: string) => void;
    onReset: () => void;
}

export function ThumbnailsHeader({
    imageCount,
    sortMode,
    hasCustomOrder,
    onBack,
    onSortChange,
    onReset,
}: ThumbnailsHeaderProps) {
    const { t } = useTranslation();

    return (
        <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: 'var(--color-border)' }}
        >
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="btn-icon btn-ghost transition-transform hover:scale-110 active:scale-90"
                >
                    <BackIcon />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gradient">
                        {t('thumbnails.title')}
                    </h1>
                    <p
                        className="text-sm"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        {imageCount} {t('folders.images')} • {t('thumbnails.dragToReorder')}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-surface-secondary/50 rounded-lg p-1 border border-white/5">
                    <select
                        value={sortMode}
                        onChange={(e) => onSortChange(e.target.value)}
                        className="bg-transparent text-sm text-text-primary focus:outline-none border-none cursor-pointer py-1 px-2"
                        style={{ backgroundImage: 'none' }}
                    >
                        <option value="name" className="bg-surface-secondary text-text-primary">Name</option>
                        <option value="dateDesc" className="bg-surface-secondary text-text-primary">Date (Newest)</option>
                        <option value="dateAsc" className="bg-surface-secondary text-text-primary">Date (Oldest)</option>
                        {hasCustomOrder && <option value="custom" className="bg-surface-secondary text-text-primary">Custom Order</option>}
                    </select>
                </div>
                {hasCustomOrder && (
                    <button
                        onClick={onReset}
                        className="btn-ghost flex items-center gap-2 text-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <ResetIcon />
                        {t('thumbnails.resetOrder')}
                    </button>
                )}
            </div>
        </div>
    );
}
