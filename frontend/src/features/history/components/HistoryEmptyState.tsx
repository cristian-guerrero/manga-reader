/**
 * HistoryEmptyState - Empty state component for history
 */

import { useTranslation } from 'react-i18next';
import { ClockIcon } from './HistoryIcons';

interface HistoryEmptyStateProps {
    enableHistory: boolean;
}

export function HistoryEmptyState({ enableHistory }: HistoryEmptyStateProps) {
    const { t } = useTranslation();

    if (!enableHistory) {
        return (
            <div
                className="flex flex-col items-center justify-center py-20 animate-fade-in"
            >
                <div
                    className="mb-4 text-4xl"
                    style={{ color: 'var(--color-text-muted)' }}
                >
                    🚫
                </div>
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
            </div>
        );
    }

    return (
        <div
            className="flex flex-col items-center justify-center py-20 rounded-2xl animate-scale-in"
            style={{
                backgroundColor: 'var(--color-surface-secondary)',
                border: '1px solid var(--color-border)',
            }}
        >
            <div
                className="mb-4 animate-pulse"
                style={{ color: 'var(--color-text-muted)' }}
            >
                <ClockIcon />
            </div>
            <p
                className="text-lg font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
            >
                {t('history.noHistory')}
            </p>
        </div>
    );
}
