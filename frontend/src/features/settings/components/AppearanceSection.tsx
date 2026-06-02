/**
 * AppearanceSection - Appearance settings section
 */

import { useTranslation } from 'react-i18next';
import { Palette } from 'lucide-react';
import { Toggle } from '@shared/components';
import { SettingRow } from './SettingRow';
import { ThemeSelector } from './ThemeSelector';
import { AccentColorSelector } from './AccentColorSelector';
import { GradientOriginSelector } from './GradientOriginSelector';
import { LanguageSelector } from './LanguageSelector';
import { MenuItemsSelector } from './MenuItemsSelector';
import { builtInThemes, getThemeById } from '@themes';
import type { SettingsState } from '@stores/settingsStore';

interface AppearanceSectionProps {
    settings: Pick<SettingsState, 
        'theme' | 'setTheme' | 
        'themeAccents' | 'setAccentColor' |
        'gradientOrigins' | 'setGradientOrigin' |
        'language' | 'setLanguage' |
        'toggleMenuItem' | 'enabledMenuItems'
    >;
    onLanguageChange: (lang: string, setLanguage: (lang: string) => void) => void;
}

export function AppearanceSection({ settings, onLanguageChange }: AppearanceSectionProps) {
    const { t } = useTranslation();
    const currentAccentColor = settings.themeAccents?.[settings.theme];
    const currentTheme = getThemeById(settings.theme);
    const isGradientTheme = currentTheme?.category === 'gradient';
    const currentOrigin = settings.gradientOrigins?.[settings.theme] ?? { x: 0, y: 0 };

    return (
        <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3 mb-6">
                <Palette className="w-6 h-6 text-accent" />
                <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {t('settings.appearance', 'Appearance')}
                </h2>
            </div>

            <div className="card p-6 space-y-8" style={{ backgroundColor: 'var(--color-surface-secondary)', borderRadius: 'var(--radius-lg)' }}>
                {/* Theme Selection */}
                <div>
                    <label className="block text-sm font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('settings.theme', 'Base Theme')}
                    </label>
                    <ThemeSelector
                        themes={builtInThemes}
                        currentThemeId={settings.theme}
                        onThemeChange={settings.setTheme}
                    />
                </div>

                {/* Accent Color Selection */}
                <div>
                    <label className="block text-sm font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('settings.accentColor', 'Accent Color')}
                    </label>
                    <AccentColorSelector
                        currentAccentColor={currentAccentColor}
                        onAccentColorChange={settings.setAccentColor}
                    />
                    <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {t('settings.accentHint', 'Select a preset or use the picker for a custom color. The "Default" option uses the base theme\'s defined accent.')}
                    </p>
                </div>

                {/* Gradient Origin (only for gradient themes) */}
                {isGradientTheme && (
                    <div>
                        <GradientOriginSelector
                            currentThemeId={settings.theme}
                            origin={currentOrigin}
                            onChange={settings.setGradientOrigin}
                        />
                    </div>
                )}

                {/* Language */}
                <SettingRow label={t('settings.language')}>
                    <LanguageSelector
                        language={settings.language}
                        onLanguageChange={(lang) => onLanguageChange(lang, settings.setLanguage)}
                    />
                </SettingRow>

                {/* Menu Items */}
                <SettingRow
                    label={t('settings.menuItems', 'Menu Items')}
                    description={t('settings.menuItemsDesc', 'Toggle visibility of sidebar menu items')}
                >
                    <MenuItemsSelector
                        enabledMenuItems={settings.enabledMenuItems}
                        onToggleMenuItem={settings.toggleMenuItem}
                    />
                </SettingRow>
            </div>
        </section>
    );
}
