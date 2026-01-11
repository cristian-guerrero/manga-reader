/**
 * SeriesDetailsNotFound - Not found state component for series details page
 */

import { useTranslation } from 'react-i18next';

interface SeriesDetailsNotFoundProps {
    onBack: () => void;
}

export function SeriesDetailsNotFound({ onBack }: SeriesDetailsNotFoundProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <p className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                {t('series.seriesNotFound')}
            </p>
            <button onClick={onBack} className="btn-primary">
                {t('common.back')}
            </button>
        </div>
    );
}
