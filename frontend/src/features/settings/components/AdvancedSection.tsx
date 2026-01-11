/**
 * AdvancedSection - Advanced settings section
 */

import { useTranslation } from 'react-i18next';
import { SectionHeader } from '@shared/components';
import { Toggle } from '@shared/components';
import { SettingRow } from './SettingRow';
import type { SettingsState } from '@stores/settingsStore';

interface AdvancedSectionProps {
    settings: Pick<SettingsState,
        'showImageInfo' | 'setShowImageInfo' |
        'enableHistory' | 'setEnableHistory' |
        'minImageSize' | 'setMinImageSize' |
        'processDroppedFolders' | 'setProcessDroppedFolders'
    >;
}

export function AdvancedSection({ settings }: AdvancedSectionProps) {
    const { t } = useTranslation();

    return (
        <section className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <SectionHeader title={t('settings.advanced', 'Advanced')} />

            <SettingRow label={t('settings.showImageInfo', 'Show Image Info')}>
                <Toggle
                    checked={settings.showImageInfo}
                    onChange={settings.setShowImageInfo}
                />
            </SettingRow>

            <SettingRow label={t('settings.enableHistory')}>
                <Toggle
                    checked={settings.enableHistory}
                    onChange={settings.setEnableHistory}
                />
            </SettingRow>

            <SettingRow
                label={t('settings.minImageSize')}
                description={t('settings.minImageSizeDesc')}
            >
                <div className="flex items-center gap-4">
                    <input
                        type="range"
                        min="0"
                        max="500"
                        step="10"
                        value={settings.minImageSize}
                        onChange={(e) => settings.setMinImageSize(Number(e.target.value))}
                        className="flex-1 max-w-32"
                    />
                    <span
                        className="text-sm font-medium w-16 text-right"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {settings.minImageSize > 0 ? `${settings.minImageSize} KB` : t('common.off', 'Off')}
                    </span>
                </div>
            </SettingRow>

            <SettingRow label={t('settings.processDroppedFolders')}>
                <Toggle
                    checked={settings.processDroppedFolders}
                    onChange={settings.setProcessDroppedFolders}
                />
            </SettingRow>
        </section>
    );
}
