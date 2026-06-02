/**
 * ThemeSelector - Component for selecting themes
 * Shows solid and gradient themes in separate sections
 */

import { useTranslation } from 'react-i18next';
import { Layers } from 'lucide-react';

interface Theme {
    id: string;
    name: string;
    category?: 'solid' | 'gradient';
    colors: {
        surfacePrimary: string;
        titlebarBg: string;
        textDisabled: string;
        surfaceTertiary: string;
        surfaceSecondary: string;
        textPrimary: string;
        accent: string;
    };
}

interface ThemeSelectorProps {
    themes: Theme[];
    currentThemeId: string;
    onThemeChange: (themeId: string) => void;
}

function ThemeCard({ theme, isActive, onClick }: { theme: Theme; isActive: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`
                group relative overflow-hidden rounded-xl border-2 transition-all duration-300
                ${isActive
                    ? 'border-accent ring-2 ring-accent/20 scale-[1.02]'
                    : 'border-border hover:border-accent/50 hover:scale-[1.01]'
                }
            `}
            style={{
                borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border)'
            }}
        >
            {/* Preview */}
            <div className="h-24 w-full relative overflow-hidden"
                style={{ backgroundColor: theme.colors.surfacePrimary }}>
                {/* Gradient indicator for gradient themes */}
                {theme.category === 'gradient' && (
                    <div className="absolute inset-0 opacity-20"
                        style={{
                            background: `linear-gradient(180deg, transparent 0%, ${theme.colors.accent}22 100%)`,
                        }}
                    />
                )}

                {/* Title bar preview */}
                <div className="absolute top-0 left-0 right-0 h-4 flex items-center px-2 gap-1"
                    style={{ backgroundColor: theme.colors.titlebarBg }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.colors.textDisabled }}></div>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.colors.textDisabled }}></div>
                </div>

                {/* Content preview */}
                <div className="absolute top-8 left-3 right-3 h-2 rounded-sm"
                    style={{ backgroundColor: theme.colors.surfaceTertiary }}></div>
                <div className="absolute top-12 left-3 right-8 h-2 rounded-sm"
                    style={{ backgroundColor: theme.colors.surfaceTertiary }}></div>

                {/* Accent preview */}
                <div className="absolute bottom-3 right-3 w-8 h-8 rounded-lg shadow-lg flex items-center justify-center"
                    style={{ backgroundColor: theme.colors.accent }}>
                    <div className="w-3 h-3 bg-white/20 rounded-full"></div>
                </div>

                {/* Gradient badge */}
                {theme.category === 'gradient' && (
                    <div className="absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: theme.colors.accent }}>
                        <Layers className="w-2.5 h-2.5 text-white" />
                    </div>
                )}
            </div>

            {/* Label */}
            <div className="px-3 py-2 text-xs font-medium text-center truncate flex items-center justify-center gap-1.5"
                style={{ backgroundColor: theme.colors.surfaceSecondary, color: theme.colors.textPrimary }}>
                {theme.category === 'gradient' && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
                )}
                {theme.name}
            </div>

            {/* Active Indicator */}
            {isActive && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-accent)' }}></div>
            )}
        </button>
    );
}

export function ThemeSelector({ themes, currentThemeId, onThemeChange }: ThemeSelectorProps) {
    const { t } = useTranslation();

    const solidThemes = themes.filter(t => t.category !== 'gradient');
    const gradientThemes = themes.filter(t => t.category === 'gradient');

    return (
        <div className="space-y-6">
            {solidThemes.length > 0 && (
                <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-3"
                        style={{ color: 'var(--color-text-muted)' }}>
                        {t('settings.solidThemes', 'Solid')}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {solidThemes.map((theme) => (
                            <ThemeCard
                                key={theme.id}
                                theme={theme}
                                isActive={currentThemeId === theme.id}
                                onClick={() => onThemeChange(theme.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {gradientThemes.length > 0 && (
                <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-3"
                        style={{ color: 'var(--color-text-muted)' }}>
                        {t('settings.gradientThemes', 'Gradient')}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {gradientThemes.map((theme) => (
                            <ThemeCard
                                key={theme.id}
                                theme={theme}
                                isActive={currentThemeId === theme.id}
                                onClick={() => onThemeChange(theme.id)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
