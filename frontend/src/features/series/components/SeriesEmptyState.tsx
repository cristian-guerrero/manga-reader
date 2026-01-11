/**
 * SeriesEmptyState - Empty state component for series page
 */

import { useTranslation } from 'react-i18next';
import { SeriesIcon } from './SeriesIcons';

interface SeriesEmptyStateProps {
    onSelectFolder: () => void;
}

export function SeriesEmptyState({ onSelectFolder }: SeriesEmptyStateProps) {
    const { t } = useTranslation();

    return (
        <div
            className="flex flex-col items-center justify-center py-20 rounded-2xl animate-scale-in"
            style={{
                backgroundColor: 'var(--color-surface-secondary)',
                border: '2px dashed var(--color-border)',
            }}
        >
            <div
                className="mb-4 animate-bounce"
                style={{ color: 'var(--color-text-muted)' }}
            >
                <SeriesIcon />
            </div>
            <p
                className="text-lg font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
            >
                {t('series.noSeries')}
            </p>
            <button
                onClick={onSelectFolder}
                className="btn-secondary transition-transform hover:scale-105 active:scale-95"
            >
                {t('folders.selectFolder')}
            </button>
        </div>
    );
}
