/**
 * TabsSection - Tabs settings section
 */

import { useTranslation } from 'react-i18next';
import { SectionHeader } from '@shared/components';
import { Toggle } from '@shared/components';
import { SettingRow } from './SettingRow';
import type { SettingsState } from '@stores/settingsStore';

interface TabsSectionProps {
    settings: Pick<SettingsState,
        'tabMemorySaving' | 'setTabMemorySaving' |
        'restoreTabs' | 'setRestoreTabs'
    >;
}

export function TabsSection({ settings }: TabsSectionProps) {
    const { t } = useTranslation();

    return (
        <section className="animate-slide-up" style={{ animationDelay: '0.45s' }}>
            <SectionHeader title={t('settings.tabs', 'Tabs')} />
            <SettingRow
                label={t('settings.tabMemorySaving', 'Memory Saving')}
                description={t('settings.tabMemorySavingDesc', 'When enabled, inactive tabs are unmounted to save memory. When disabled, tabs stay in memory for instant switching.')}
            >
                <Toggle
                    checked={settings.tabMemorySaving}
                    onChange={settings.setTabMemorySaving}
                />
            </SettingRow>
            <SettingRow
                label={t('settings.restoreTabs', 'Continue where you left off')}
                description={t('settings.restoreTabsDesc', 'When enabled, your open tabs will be restored when you restart the app.')}
            >
                <Toggle
                    checked={settings.restoreTabs}
                    onChange={settings.setRestoreTabs}
                />
            </SettingRow>
        </section>
    );
}
