/**
 * ThemeSelector - Component for selecting themes
 */

import { useTranslation } from 'react-i18next';

interface Theme {
    id: string;
    name: string;
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

export function ThemeSelector({ themes, currentThemeId, onThemeChange }: ThemeSelectorProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {themes.map((theme) => (
                <button
                    key={theme.id}
                    onClick={() => onThemeChange(theme.id)}
                    className={`
                        group relative overflow-hidden rounded-xl border-2 transition-all duration-300
                        ${currentThemeId === theme.id
                            ? 'border-accent ring-2 ring-accent/20 scale-[1.02]'
                            : 'border-border hover:border-accent/50 hover:scale-[1.01]'
                        }
                    `}
                    style={{
                        borderColor: currentThemeId === theme.id ? 'var(--color-accent)' : 'var(--color-border)'
                    }}
                >
                    {/* Preview */}
                    <div className="h-24 w-full relative" style={{ backgroundColor: theme.colors.surfacePrimary }}>
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
                    </div>

                    {/* Label */}
                    <div className="px-3 py-2 text-xs font-medium text-center truncate"
                        style={{ backgroundColor: theme.colors.surfaceSecondary, color: theme.colors.textPrimary }}>
                        {theme.name}
                    </div>

                    {/* Active Indicator */}
                    {currentThemeId === theme.id && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-accent)' }}></div>
                    )}
                </button>
            ))}
        </div>
    );
}
