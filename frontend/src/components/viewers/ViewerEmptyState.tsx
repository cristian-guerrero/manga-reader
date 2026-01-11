/**
 * ViewerEmptyState - Empty state component for ViewerPage
 */

import { useTranslation } from 'react-i18next';

interface ViewerEmptyStateProps {
    onBack: () => void;
}

export function ViewerEmptyState({ onBack }: ViewerEmptyStateProps) {
    const { t } = useTranslation();

    return (
        <div
            className="flex flex-col items-center justify-center h-full gap-4"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            <div className="text-6xl animate-scale-in">
                📂
            </div>
            <span style={{ color: 'var(--color-text-secondary)' }}>
                {t('errors.noImages')}
            </span>
            <button
                onClick={onBack}
                className="btn-primary hover:scale-105 active:scale-95 transition-transform"
            >
                {t('common.back')}
            </button>
        </div>
    );
}
