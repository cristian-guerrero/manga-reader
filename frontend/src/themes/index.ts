/**
 * Theme System - Manga Visor
 * Centralized theme management with support for custom user themes
 */

export interface ThemeColors {
    // Accent
    accent: string;
    accentHover: string;
    accentGlow: string;

    // Surfaces
    surfacePrimary: string;
    surfaceSecondary: string;
    surfaceTertiary: string;
    surfaceElevated: string;
    surfaceOverlay: string;

    // Title bar
    titlebarBg: string;
    titlebarText: string;

    // Text
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textDisabled: string;

    // Borders
    border: string;
    borderHover: string;
    borderFocus: string;
}

export interface Theme {
    id: string;
    name: string;
    isDark: boolean;
    colors: ThemeColors;
}

// ============================================================================
// Built-in Themes
// ============================================================================

export const darkTheme: Theme = {
    id: 'dark',
    name: 'Dark',
    isDark: true,
    colors: {
        accent: '#8b5cf6',
        accentHover: '#a78bfa',
        accentGlow: 'rgba(139, 92, 246, 0.4)',

        surfacePrimary: '#0a0a0f',
        surfaceSecondary: '#12121a',
        surfaceTertiary: '#1a1a28',
        surfaceElevated: '#222233',
        surfaceOverlay: 'rgba(10, 10, 15, 0.95)',

        titlebarBg: '#0a0a0f',
        titlebarText: '#e5e7eb',

        textPrimary: '#f9fafb',
        textSecondary: '#d1d5db',
        textMuted: '#9ca3af',
        textDisabled: '#6b7280',

        border: 'rgba(255, 255, 255, 0.08)',
        borderHover: 'rgba(255, 255, 255, 0.15)',
        borderFocus: 'rgba(139, 92, 246, 0.5)',
    },
};

export const lightTheme: Theme = {
    id: 'light',
    name: 'Light',
    isDark: false,
    colors: {
        accent: '#7c3aed',
        accentHover: '#6d28d9',
        accentGlow: 'rgba(124, 58, 237, 0.3)',

        surfacePrimary: '#f8fafc',
        surfaceSecondary: '#f1f5f9',
        surfaceTertiary: '#e2e8f0',
        surfaceElevated: '#ffffff',
        surfaceOverlay: 'rgba(248, 250, 252, 0.98)',

        titlebarBg: '#f1f5f9',
        titlebarText: '#1e293b',

        textPrimary: '#0f172a',
        textSecondary: '#334155',
        textMuted: '#64748b',
        textDisabled: '#94a3b8',

        border: 'rgba(0, 0, 0, 0.08)',
        borderHover: 'rgba(0, 0, 0, 0.15)',
        borderFocus: 'rgba(124, 58, 237, 0.5)',
    },
};

export const midnightTheme: Theme = {
    id: 'midnight',
    name: 'Midnight Blue',
    isDark: true,
    colors: {
        accent: '#3b82f6',
        accentHover: '#60a5fa',
        accentGlow: 'rgba(59, 130, 246, 0.4)',

        surfacePrimary: '#0c1222',
        surfaceSecondary: '#111827',
        surfaceTertiary: '#1e293b',
        surfaceElevated: '#293548',
        surfaceOverlay: 'rgba(12, 18, 34, 0.95)',

        titlebarBg: '#0c1222',
        titlebarText: '#e2e8f0',

        textPrimary: '#f1f5f9',
        textSecondary: '#cbd5e1',
        textMuted: '#94a3b8',
        textDisabled: '#64748b',

        border: 'rgba(255, 255, 255, 0.06)',
        borderHover: 'rgba(255, 255, 255, 0.12)',
        borderFocus: 'rgba(59, 130, 246, 0.5)',
    },
};

export const sakuraTheme: Theme = {
    id: 'sakura',
    name: 'Sakura',
    isDark: false,
    colors: {
        accent: '#ec4899',
        accentHover: '#db2777',
        accentGlow: 'rgba(236, 72, 153, 0.3)',

        surfacePrimary: '#fdf2f8',
        surfaceSecondary: '#fce7f3',
        surfaceTertiary: '#fbcfe8',
        surfaceElevated: '#ffffff',
        surfaceOverlay: 'rgba(253, 242, 248, 0.98)',

        titlebarBg: '#fce7f3',
        titlebarText: '#831843',

        textPrimary: '#500724',
        textSecondary: '#831843',
        textMuted: '#9d174d',
        textDisabled: '#be185d',

        border: 'rgba(190, 24, 93, 0.1)',
        borderHover: 'rgba(190, 24, 93, 0.2)',
        borderFocus: 'rgba(236, 72, 153, 0.5)',
    },
};

export const amoldedTheme: Theme = {
    id: 'amoled',
    name: 'AMOLED Black',
    isDark: true,
    colors: {
        accent: '#22c55e',
        accentHover: '#4ade80',
        accentGlow: 'rgba(34, 197, 94, 0.4)',

        surfacePrimary: '#000000',
        surfaceSecondary: '#0a0a0a',
        surfaceTertiary: '#141414',
        surfaceElevated: '#1a1a1a',
        surfaceOverlay: 'rgba(0, 0, 0, 0.98)',

        titlebarBg: '#000000',
        titlebarText: '#e5e5e5',

        textPrimary: '#fafafa',
        textSecondary: '#d4d4d4',
        textMuted: '#a3a3a3',
        textDisabled: '#737373',

        border: 'rgba(255, 255, 255, 0.05)',
        borderHover: 'rgba(255, 255, 255, 0.1)',
        borderFocus: 'rgba(34, 197, 94, 0.5)',
    },
};

// All built-in themes
export const builtInThemes: Theme[] = [
    darkTheme,
    lightTheme,
    midnightTheme,
    sakuraTheme,
    amoldedTheme,
];

// ============================================================================
// Theme Application
// ============================================================================

/**
 * Apply a theme to the document by setting CSS variables
 */
export function applyTheme(theme: Theme): void {
    const root = document.documentElement;
    const { colors } = theme;

    // Set theme attribute for CSS selectors
    root.setAttribute('data-theme', theme.isDark ? 'dark' : 'light');
    root.setAttribute('data-theme-id', theme.id);

    // Apply all color variables
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-accent-hover', colors.accentHover);
    root.style.setProperty('--color-accent-glow', colors.accentGlow);

    root.style.setProperty('--color-surface-primary', colors.surfacePrimary);
    root.style.setProperty('--color-surface-secondary', colors.surfaceSecondary);
    root.style.setProperty('--color-surface-tertiary', colors.surfaceTertiary);
    root.style.setProperty('--color-surface-elevated', colors.surfaceElevated);
    root.style.setProperty('--color-surface-overlay', colors.surfaceOverlay);

    root.style.setProperty('--color-titlebar-bg', colors.titlebarBg);
    root.style.setProperty('--color-titlebar-text', colors.titlebarText);

    root.style.setProperty('--color-text-primary', colors.textPrimary);
    root.style.setProperty('--color-text-secondary', colors.textSecondary);
    root.style.setProperty('--color-text-muted', colors.textMuted);
    root.style.setProperty('--color-text-disabled', colors.textDisabled);

    root.style.setProperty('--color-border', colors.border);
    root.style.setProperty('--color-border-hover', colors.borderHover);
    root.style.setProperty('--color-border-focus', colors.borderFocus);
}

/**
 * Get theme by ID
 */
export function getThemeById(id: string): Theme | undefined {
    return builtInThemes.find((theme) => theme.id === id);
}

/**
 * Parse a custom theme from JSON
 */
export function parseCustomTheme(json: string): Theme | null {
    try {
        const parsed = JSON.parse(json);
        if (
            parsed.id &&
            parsed.name &&
            typeof parsed.isDark === 'boolean' &&
            parsed.colors
        ) {
            return parsed as Theme;
        }
        return null;
    } catch {
        return null;
    }
}

export default {
    builtInThemes,
    darkTheme,
    lightTheme,
    applyTheme,
    getThemeById,
    parseCustomTheme,
};
