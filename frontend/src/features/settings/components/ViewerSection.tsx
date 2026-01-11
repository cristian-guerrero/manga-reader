/**
 * ViewerSection - Viewer settings section
 */

import { useTranslation } from 'react-i18next';
import { Button } from '@shared/components';
import { SectionHeader } from '@shared/components';
import { SettingRow } from './SettingRow';
import type { SettingsState } from '@stores/settingsStore';

interface ViewerSectionProps {
    settings: Pick<SettingsState,
        'viewerMode' | 'setViewerMode' |
        'verticalWidth' | 'setVerticalWidth' |
        'lateralMode' | 'setLateralMode' |
        'readingDirection' | 'setReadingDirection'
    >;
}

export function ViewerSection({ settings }: ViewerSectionProps) {
    const { t } = useTranslation();

    return (
        <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <SectionHeader title={t('settings.viewer', 'Viewer')} />

            {/* Default Mode */}
            <SettingRow label={t('settings.defaultMode')}>
                <div className="flex gap-2">
                    <Button
                        variant={settings.viewerMode === 'vertical' ? 'primary' : 'secondary'}
                        onClick={() => settings.setViewerMode('vertical')}
                        size="sm"
                    >
                        {t('viewer.vertical')}
                    </Button>
                    <Button
                        variant={settings.viewerMode === 'lateral' ? 'primary' : 'secondary'}
                        onClick={() => settings.setViewerMode('lateral')}
                        size="sm"
                    >
                        {t('viewer.lateral')}
                    </Button>
                </div>
            </SettingRow>

            {/* Vertical Width */}
            <SettingRow label={t('settings.verticalWidth')}>
                <div className="flex items-center gap-4">
                    <input
                        type="range"
                        min="30"
                        max="100"
                        value={settings.verticalWidth}
                        onChange={(e) => settings.setVerticalWidth(Number(e.target.value))}
                        className="flex-1"
                    />
                    <span
                        className="text-sm font-medium w-12 text-right"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {settings.verticalWidth}%
                    </span>
                </div>
            </SettingRow>

            {/* Lateral Mode */}
            <SettingRow label={t('settings.lateralMode')}>
                <div className="flex gap-2">
                    <Button
                        variant={settings.lateralMode === 'single' ? 'primary' : 'secondary'}
                        onClick={() => settings.setLateralMode('single')}
                        size="sm"
                    >
                        {t('viewer.singlePage')}
                    </Button>
                    <Button
                        variant={settings.lateralMode === 'double' ? 'primary' : 'secondary'}
                        onClick={() => settings.setLateralMode('double')}
                        size="sm"
                    >
                        {t('viewer.doublePage')}
                    </Button>
                </div>
            </SettingRow>

            {/* Reading Direction */}
            <SettingRow label={t('settings.readingDirection')}>
                <div className="flex gap-2">
                    <Button
                        variant={settings.readingDirection === 'ltr' ? 'primary' : 'secondary'}
                        onClick={() => settings.setReadingDirection('ltr')}
                        size="sm"
                    >
                        {t('settings.leftToRight')}
                    </Button>
                    <Button
                        variant={settings.readingDirection === 'rtl' ? 'primary' : 'secondary'}
                        onClick={() => settings.setReadingDirection('rtl')}
                        size="sm"
                    >
                        {t('settings.rightToLeft')}
                    </Button>
                </div>
            </SettingRow>
        </section>
    );
}
