/**
 * ViewerEmptyState - Empty state component for ViewerPage
 */

import { useTranslation } from 'react-i18next';
import { EmptyState } from '@shared/components';

interface ViewerEmptyStateProps {
    onBack: () => void;
}

export function ViewerEmptyState({ onBack }: ViewerEmptyStateProps) {
    const { t } = useTranslation();

    return (
        <EmptyState
            icon="📂"
            title={t('errors.noImages') || 'No images found'}
            action={{
                label: t('common.back') || 'Back',
                onClick: onBack,
                variant: 'primary',
            }}
            fullHeight={true}
        />
    );
}
