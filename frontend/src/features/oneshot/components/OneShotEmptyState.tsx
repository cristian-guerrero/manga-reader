/**
 * OneShotEmptyState - Empty state component for oneshot page
 */

import { useTranslation } from 'react-i18next';
import { OneShotIcon } from './OneShotIcons';

interface OneShotEmptyStateProps {
    onSelectFolder: () => void;
}

export function OneShotEmptyState({ onSelectFolder }: OneShotEmptyStateProps) {
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
                <OneShotIcon />
            </div>
            <p
                className="text-lg font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
            >
                {t('oneShot.noFolders')}
            </p>
            <p
                className="text-sm mb-4"
                style={{ color: 'var(--color-text-muted)' }}
            >
                {t('oneShot.dragDrop')}
            </p>
            <button
                onClick={onSelectFolder}
                className="btn-secondary transition-transform hover:scale-105 active:scale-95"
            >
                {t('oneShot.selectFolder')}
            </button>
        </div>
    );
}
