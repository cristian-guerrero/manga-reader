/**
 * AccentColorSelector - Component for selecting accent colors
 */

import { useTranslation } from 'react-i18next';
import { Palette } from 'lucide-react';
import { ACCENT_COLORS } from '@themes';

interface AccentColorSelectorProps {
    currentAccentColor?: string;
    onAccentColorChange: (color: string) => void;
}

export function AccentColorSelector({ currentAccentColor, onAccentColorChange }: AccentColorSelectorProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-wrap gap-3">
            {/* Default / Reset */}
            <button
                onClick={() => onAccentColorChange('default')}
                className={`
                    w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all
                    ${!currentAccentColor
                        ? 'ring-2 ring-offset-2 scale-110'
                        : 'hover:scale-105'
                    }
                `}
                style={{
                    background: 'conic-gradient(from 180deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #d946ef, #ef4444)',
                    borderColor: !currentAccentColor ? 'var(--color-text-primary)' : 'var(--color-border)'
                }}
                title={t('settings.accentDefault', 'Default Theme Accent')}
            >
                {!currentAccentColor && <div className="w-3 h-3 rounded-full bg-white shadow-sm" />}
            </button>

            {/* Preset Colors */}
            {ACCENT_COLORS.filter((c: { id: string; color: string; name: string }) => c.id !== 'default').map((color: { id: string; color: string; name: string }) => (
                <button
                    key={color.id}
                    onClick={() => onAccentColorChange(color.color)}
                    className={`
                        w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all
                        ${currentAccentColor === color.color
                            ? 'scale-110'
                            : 'border-transparent hover:scale-105'
                        }
                    `}
                    style={{
                        backgroundColor: color.color,
                        borderColor: currentAccentColor === color.color ? 'var(--color-text-primary)' : 'transparent',
                        boxShadow: currentAccentColor === color.color ? `0 0 10px ${color.color}66` : 'none'
                    }}
                    title={color.name}
                >
                    {currentAccentColor === color.color && (
                        <div className="w-3 h-3 rounded-full bg-white/90" />
                    )}
                </button>
            ))}

            {/* Custom Color Picker */}
            <div className="relative group">
                <input
                    type="color"
                    value={currentAccentColor || '#ffffff'}
                    onChange={(e) => onAccentColorChange(e.target.value)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10 rounded-full"
                />
                <div className={`
                    w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all
                    group-hover:border-accent
                `}
                    style={{
                        backgroundColor: 'var(--color-surface-tertiary)',
                        borderColor: 'var(--color-border)'
                    }}>
                    <Palette className="w-4 h-4 text-text-muted group-hover:text-accent" style={{ color: 'var(--color-text-secondary)' }} />
                </div>
            </div>
        </div>
    );
}
