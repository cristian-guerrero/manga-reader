import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import { builtInThemes, ACCENT_COLORS } from '../../themes';
import {
    Palette,
    Trash2,
    RefreshCcw,
    RotateCcw
} from 'lucide-react';
import { Button } from '../common/Button';
import { useToast } from '../common/Toast';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Toggle } from '../common/Toggle';
import { SectionHeader } from '../common/SectionHeader';
import { HelpDialog } from '../common/HelpDialog';
import { languages, changeLanguage } from '../../i18n';

export const SettingsPage: React.FC = () => {
    const { t } = useTranslation();
    const {
        theme: currentThemeId,
        setTheme,
        language,
        setLanguage,
        viewerMode,
        setViewerMode,
        verticalWidth,
        setVerticalWidth,
        lateralMode,
        setLateralMode,
        readingDirection,
        setReadingDirection,
        resetSettings,
        enableHistory,
        setEnableHistory,
        processDroppedFolders,
        setProcessDroppedFolders,
        // clearHistory, // Backend handles this via wails
        themeAccents,
        setAccentColor,
        toggleMenuItem,
        enabledMenuItems,
        preloadImages,
        setPreloadImages,
        preloadCount,
        setPreloadCount,
        showImageInfo,
        setShowImageInfo,
        minImageSize,
        setMinImageSize,
        panicKey
    } = useSettingsStore();

    const { showToast } = useToast();
    const [isResetOpen, setIsResetOpen] = useState(false);
    const [isClearCacheOpen, setIsClearCacheOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    // Filter themes to show in the UI
    const themes = builtInThemes;

    // Derive current accent color for the active theme
    const currentAccentColor = themeAccents?.[currentThemeId];

    const handleLanguageChange = (newLang: string) => {
        setLanguage(newLang);
        changeLanguage(newLang as any);
    };

    const handleResetSettings = () => {
        resetSettings();
        setIsResetOpen(false);
        showToast(t('settings.resetSuccess') || 'Settings restored to defaults', 'success');
    };

    const confirmClearCache = async () => {
        try {
            // @ts-ignore
            await window.go?.main?.App?.ClearAllData();
            setIsClearCacheOpen(false);
            showToast(t('settings.clearCacheSuccess') || 'Cache cleared successfully', 'success');
        } catch (error) {
            console.error("Failed to clear cache:", error);
            showToast(t('settings.clearCacheError') || 'Failed to clear cache', 'error');
        }
    };

    return (
        <div className="h-full overflow-auto p-6" style={{ backgroundColor: 'var(--color-surface-primary)' }}>
            <div className="max-w-6xl mx-auto pb-24 animate-fade-in space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gradient">
                        {t('settings.title', 'Settings')}
                    </h1>
                    <button
                        onClick={() => setIsHelpOpen(true)}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        title={t('settings.help.title')}
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </button>
                </div>

                {/* Appearance Section */}
                <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center gap-3 mb-6">
                        <Palette className="w-6 h-6 text-accent" />
                        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('settings.appearance', 'Appearance')}</h2>
                    </div>

                    <div className="card p-6 space-y-8" style={{ backgroundColor: 'var(--color-surface-secondary)', borderRadius: 'var(--radius-lg)' }}>
                        {/* Theme Selection */}
                        <div>
                            <label className="block text-sm font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                                {t('settings.theme', 'Base Theme')}
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {themes.map((theme) => (
                                    <button
                                        key={theme.id}
                                        onClick={() => setTheme(theme.id)}
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
                        </div>

                        {/* Accent Color Selection */}
                        <div>
                            <label className="block text-sm font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                                {t('settings.accentColor', 'Accent Color')}
                            </label>
                            <div className="flex flex-wrap gap-3">
                                {/* Default / Reset */}
                                <button
                                    onClick={() => setAccentColor('default')}
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
                                {ACCENT_COLORS.filter(c => c.id !== 'default').map((color) => (
                                    <button
                                        key={color.id}
                                        onClick={() => setAccentColor(color.color)}
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
                                        onChange={(e) => setAccentColor(e.target.value)}
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
                            <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                {t('settings.accentHint', 'Select a preset or use the picker for a custom color. The "Default" option uses the base theme\'s defined accent.')}
                            </p>
                        </div>

                        {/* Language */}
                        <SettingRow label={t('settings.language')}>
                            <select
                                value={language}
                                onChange={(e) => handleLanguageChange(e.target.value)}
                                className="input-field w-full sm:w-64"
                                style={{
                                    backgroundColor: 'var(--color-surface-tertiary)',
                                    color: 'var(--color-text-primary)',
                                    borderColor: 'var(--color-border)',
                                    padding: '0.5rem',
                                    borderRadius: '0.5rem'
                                }}
                            >
                                {languages.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.nativeName}
                                    </option>
                                ))}
                            </select>
                        </SettingRow>

                        {/* Menu Items */}
                        <SettingRow
                            label={t('settings.menuItems', 'Menu Items')}
                            description={t('settings.menuItemsDesc', 'Toggle visibility of sidebar menu items')}
                        >
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                {['home', 'explorer', 'history', 'oneShot', 'series', 'download'].map((item) => {
                                    const isSettings = item === 'settings';
                                    const isEnabled = enabledMenuItems?.[item] !== false;

                                    return (
                                        <div
                                            key={item}
                                            className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${isSettings ? 'opacity-80 cursor-default' : 'hover:bg-white/5 cursor-pointer'}`}
                                            onClick={() => !isSettings && toggleMenuItem(item)}
                                        >
                                            <Toggle
                                                checked={isEnabled}
                                                onChange={() => toggleMenuItem(item)}
                                                disabled={isSettings}
                                            />
                                            <span className="text-sm font-medium select-none" style={{ color: 'var(--color-text-secondary)' }}>
                                                {t(`navigation.${item}`)}
                                                {isSettings && <span className="ml-1 opacity-50 text-[10px]">({t('common.alwaysOn') || 'Always On'})</span>}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </SettingRow>
                    </div>
                </section>

                {/* Viewer Section */}
                <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <SectionHeader title={t('settings.viewer', 'Viewer')} />

                    {/* Default Mode */}
                    <SettingRow label={t('settings.defaultMode')}>
                        <div className="flex gap-2">
                            <Button
                                variant={viewerMode === 'vertical' ? 'primary' : 'secondary'}
                                onClick={() => setViewerMode('vertical')}
                                size="sm"
                            >
                                {t('viewer.vertical')}
                            </Button>
                            <Button
                                variant={viewerMode === 'lateral' ? 'primary' : 'secondary'}
                                onClick={() => setViewerMode('lateral')}
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
                                value={verticalWidth}
                                onChange={(e) => setVerticalWidth(Number(e.target.value))}
                                className="flex-1"
                            />
                            <span
                                className="text-sm font-medium w-12 text-right"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                {verticalWidth}%
                            </span>
                        </div>
                    </SettingRow>

                    {/* Lateral Mode */}
                    <SettingRow label={t('settings.lateralMode')}>
                        <div className="flex gap-2">
                            <Button
                                variant={lateralMode === 'single' ? 'primary' : 'secondary'}
                                onClick={() => setLateralMode('single')}
                                size="sm"
                            >
                                {t('viewer.singlePage')}
                            </Button>
                            <Button
                                variant={lateralMode === 'double' ? 'primary' : 'secondary'}
                                onClick={() => setLateralMode('double')}
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
                                variant={readingDirection === 'ltr' ? 'primary' : 'secondary'}
                                onClick={() => setReadingDirection('ltr')}
                                size="sm"
                            >
                                {t('settings.leftToRight')}
                            </Button>
                            <Button
                                variant={readingDirection === 'rtl' ? 'primary' : 'secondary'}
                                onClick={() => setReadingDirection('rtl')}
                                size="sm"
                            >
                                {t('settings.rightToLeft')}
                            </Button>
                        </div>
                    </SettingRow>
                </section>

                {/* Keyboard Section */}
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
                            {panicKey}
                        </div>
                    </SettingRow>
                </section>

                {/* Advanced Section */}
                <section className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
                    <SectionHeader title={t('settings.advanced', 'Advanced')} />

                    <SettingRow label={t('settings.preloadImages', 'Preload Images')}>
                        <Toggle
                            checked={preloadImages}
                            onChange={setPreloadImages}
                        />
                    </SettingRow>

                    {
                        preloadImages && (
                            <SettingRow label={t('settings.preloadCount', 'Preload Count')}>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={preloadCount}
                                        onChange={(e) => setPreloadCount(Number(e.target.value))}
                                        className="flex-1 max-w-32"
                                    />
                                    <span
                                        className="text-sm font-medium w-8 text-right"
                                        style={{ color: 'var(--color-text-secondary)' }}
                                    >
                                        {preloadCount}
                                    </span>
                                </div>
                            </SettingRow>
                        )
                    }

                    <SettingRow label={t('settings.showImageInfo', 'Show Image Info')}>
                        <Toggle
                            checked={showImageInfo}
                            onChange={setShowImageInfo}
                        />
                    </SettingRow>

                    <SettingRow label={t('settings.enableHistory')}>
                        <Toggle
                            checked={enableHistory}
                            onChange={setEnableHistory}
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
                                value={minImageSize}
                                onChange={(e) => setMinImageSize(Number(e.target.value))}
                                className="flex-1 max-w-32"
                            />
                            <span
                                className="text-sm font-medium w-16 text-right"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                {minImageSize > 0 ? `${minImageSize} KB` : t('common.off', 'Off')}
                            </span>
                        </div>
                    </SettingRow>

                    <SettingRow label={t('settings.processDroppedFolders')}>
                        <Toggle
                            checked={processDroppedFolders}
                            onChange={setProcessDroppedFolders}
                        />
                    </SettingRow>
                </section>

                {/* Danger Zone */}
                <section className="animate-slide-up space-y-4" style={{ animationDelay: '0.5s' }}>
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            onClick={() => setIsResetOpen(true)}
                            variant="outline"
                            className="border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
                            icon={<RotateCcw className="w-4 h-4" />}
                        >
                            {t('settings.resetSettings')}
                        </Button>

                        <Button
                            onClick={() => setIsClearCacheOpen(true)}
                            variant="outline"
                            className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                            icon={<Trash2 className="w-4 h-4" />}
                        >
                            {t('settings.clearAllCache')}
                        </Button>
                    </div>
                </section>
            </div>

            {/* Reset Settings Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isResetOpen}
                onClose={() => setIsResetOpen(false)}
                onConfirm={handleResetSettings}
                title={t('settings.resetSettings')}
                message={t('settings.confirmReset')}
                isDestructive={false}
                confirmText={t('common.confirm') || 'Confirm'}
                cancelText={t('common.cancel') || 'Cancel'}
                icon={
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 3v5h5"></path>
                    </svg>
                }
            />

            {/* Clear Cache Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isClearCacheOpen}
                onClose={() => setIsClearCacheOpen(false)}
                onConfirm={confirmClearCache}
                title={t('settings.clearAllCache')}
                message={t('settings.confirmClearCache')}
                isDestructive={true}
                confirmText={t('common.confirm') || 'Confirm'}
                cancelText={t('common.cancel') || 'Cancel'}
                icon={
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                }
            />

            {/* Help Dialog */}
            <HelpDialog
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
                title={t('settings.help.title')}
            >
                <div>
                    <h4 className="font-semibold text-sm uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--color-accent)' }}>
                        <Palette className="w-4 h-4" />
                        {t('settings.help.appearance', 'Appearance')}
                    </h4>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('settings.help.appearanceDesc', 'Customize the look and feel of the application. Change themes and accent colors.')}
                    </p>
                </div>
            </HelpDialog>
        </div>
    );
};

// Setting row component
function SettingRow({
    label,
    description,
    children,
}: {
    label: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between py-4">
            <div>
                <span
                    className="font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                >
                    {label}
                </span>
                {description && (
                    <p
                        className="text-sm mt-1"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        {description}
                    </p>
                )}
            </div>
            <div>{children}</div>
        </div>
    );
}

export default SettingsPage;
