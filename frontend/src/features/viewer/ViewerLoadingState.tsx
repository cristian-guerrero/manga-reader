/**
 * ViewerLoadingState - Loading state component for ViewerPage
 */

import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function ViewerLoadingState() {
    const { t } = useTranslation();

    return (
        <LoadingSpinner
            size="lg"
            text={t('common.loading')}
            showText={true}
            fullHeight={true}
            className="h-full"
        />
    );
}
