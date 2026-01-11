/**
 * DangerZoneSection - Danger zone with reset and clear cache buttons
 */

import { useTranslation } from 'react-i18next';
import { RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@shared/components';

interface DangerZoneSectionProps {
    onResetClick: () => void;
    onClearCacheClick: () => void;
}

export function DangerZoneSection({ onResetClick, onClearCacheClick }: DangerZoneSectionProps) {
    const { t } = useTranslation();

    return (
        <section className="animate-slide-up space-y-4" style={{ animationDelay: '0.5s' }}>
            <div className="grid grid-cols-2 gap-4">
                <Button
                    onClick={onResetClick}
                    variant="outline"
                    className="border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
                    icon={<RotateCcw className="w-4 h-4" />}
                >
                    {t('settings.resetSettings')}
                </Button>

                <Button
                    onClick={onClearCacheClick}
                    variant="outline"
                    className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                    icon={<Trash2 className="w-4 h-4" />}
                >
                    {t('settings.clearAllCache')}
                </Button>
            </div>
        </section>
    );
}
