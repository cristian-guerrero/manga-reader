/**
 * GradientOriginSelector - Drag or click to set the gradient origin point
 */

import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Move } from 'lucide-react';
import { getThemeById } from '@themes';

interface GradientOriginSelectorProps {
    currentThemeId: string;
    origin: { x: number; y: number };
    onChange: (origin: { x: number; y: number }) => void;
}

export function GradientOriginSelector({ currentThemeId, origin, onChange }: GradientOriginSelectorProps) {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const theme = getThemeById(currentThemeId);
    const gradTemplate = theme?.gradients?.surfacePrimary;
    const isGradientTheme = theme?.category === 'gradient' && gradTemplate?.includes('radial-gradient');

    const handleMove = useCallback((clientX: number, clientY: number) => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = Math.round(((clientX - rect.left) / rect.width) * 100);
        const y = Math.round(((clientY - rect.top) / rect.height) * 100);
        onChange({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
    }, [onChange]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setIsDragging(true);
        handleMove(e.clientX, e.clientY);
    }, [handleMove]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isDragging) handleMove(e.clientX, e.clientY);
    }, [isDragging, handleMove]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const previewGrad = isGradientTheme
        ? gradTemplate!.replace(/at\s+\d+%\s+\d+%/g, `at ${origin.x}% ${origin.y}%`)
        : undefined;

    return (
        <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                <div className="flex items-center gap-2">
                    <Move className="w-4 h-4" />
                    {t('settings.gradientOrigin', 'Gradient Origin')}
                </div>
            </label>

            <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="relative w-full h-32 rounded-xl overflow-hidden cursor-crosshair select-none border"
                style={{
                    borderColor: 'var(--color-border)',
                    background: previewGrad ?? undefined,
                    backgroundColor: previewGrad ? undefined : 'var(--color-surface-tertiary)',
                }}
            >
                {/* Grid lines */}
                <div className="absolute inset-0 pointer-events-none opacity-10"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, var(--color-text-primary) 1px, transparent 1px),
                            linear-gradient(to bottom, var(--color-text-primary) 1px, transparent 1px)
                        `,
                        backgroundSize: '25% 25%',
                    }}
                />

                {/* Drag handle dot */}
                <div
                    className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg transition-shadow duration-150 pointer-events-none z-10"
                    style={{
                        left: `${origin.x}%`,
                        top: `${origin.y}%`,
                        backgroundColor: theme?.colors.accent ?? 'var(--color-accent)',
                        boxShadow: isDragging
                            ? `0 0 0 4px ${theme?.colors.accent ?? 'var(--color-accent)'}44, 0 2px 8px rgba(0,0,0,0.4)`
                            : `0 0 0 2px ${theme?.colors.accent ?? 'var(--color-accent)'}44, 0 2px 6px rgba(0,0,0,0.3)`,
                    }}
                >
                    <div className="absolute inset-1 rounded-full bg-white/30" />
                </div>

                {/* Labels */}
                <div className="absolute top-1 left-2 text-[10px] font-mono opacity-50"
                    style={{ color: 'var(--color-text-muted)' }}>
                    0%,0%
                </div>
                <div className="absolute top-1 right-2 text-[10px] font-mono opacity-50"
                    style={{ color: 'var(--color-text-muted)' }}>
                    100%,0%
                </div>
                <div className="absolute bottom-1 left-2 text-[10px] font-mono opacity-50"
                    style={{ color: 'var(--color-text-muted)' }}>
                    0%,100%
                </div>
            </div>

            {/* Position display */}
            <div className="flex items-center gap-4 mt-2">
                <div className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                    {t('settings.x', 'X')}: {origin.x}%
                </div>
                <div className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                    {t('settings.y', 'Y')}: {origin.y}%
                </div>
                {isGradientTheme && (
                    <button
                        onClick={() => onChange({ x: 0, y: 0 })}
                        className="ml-auto text-xs px-2 py-1 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-muted)' }}
                    >
                        {t('settings.reset', 'Reset')}
                    </button>
                )}
            </div>
        </div>
    );
}
