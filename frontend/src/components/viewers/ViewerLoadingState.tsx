/**
 * ViewerLoadingState - Loading state component for ViewerPage
 */

import { useTranslation } from 'react-i18next';

export function ViewerLoadingState() {
    const { t } = useTranslation();

    return (
        <div
            className="flex items-center justify-center h-full"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div
                    className="w-16 h-16 border-4 rounded-full animate-spin-slow"
                    style={{
                        borderColor: 'var(--color-accent)',
                        borderTopColor: 'transparent',
                    }}
                />
                <span style={{ color: 'var(--color-text-secondary)' }}>
                    {t('common.loading')}
                </span>
            </div>
        </div>
    );
}
