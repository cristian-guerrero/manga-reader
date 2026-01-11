/**
 * KeyboardSection - Keyboard settings section
 */

import { useTranslation } from 'react-i18next';
import { SectionHeader } from '@shared/components';
import { SettingRow } from './SettingRow';
import type { SettingsState } from '@stores/settingsStore';

interface KeyboardSectionProps {
    settings: Pick<SettingsState, 'panicKey'>;
}

export function KeyboardSection({ settings }: KeyboardSectionProps) {
    const { t } = useTranslation();

    return (
        <section className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <SectionHeader title={t('settings.keyboard')} />

            <SettingRow
                label={t('settings.panicKey')}
                description={t('settings.panicKeyDesc')}
            >
                <div
                    className="px-4 py-2 rounded-lg text-sm font-mono"
                    style={{
                        backgroundColor: 'var(--color-surface-tertiary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border)',
                    }}
                >
                    {settings.panicKey}
                </div>
            </SettingRow>
        </section>
    );
}
