/**
 * SettingsPage - Application settings and preferences
 */

import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToast } from '../common/Toast';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { builtInThemes, applyTheme, getThemeById } from '../../themes';
import { languages, changeLanguage } from '../../i18n';

export function SettingsPage() {
    console.log("[SettingsPage] Rendering with enabledMenuItems:", useSettingsStore.getState().enabledMenuItems);
    const { t } = useTranslation();
    const {
        language,
        setLanguage,
        theme,
        setTheme,
        viewerMode,
        setViewerMode,
        verticalWidth,
        setVerticalWidth,
        lateralMode,
        setLateralMode,
        readingDirection,
        setReadingDirection,
        panicKey,
        preloadImages,
        setPreloadImages,
        preloadCount,
        setPreloadCount,
        showImageInfo,
        setShowImageInfo,
        enableHistory,
        setEnableHistory,
        minImageSize,
        setMinImageSize,
        processDroppedFolders,
        setProcessDroppedFolders,
        resetSettings,
        enabledMenuItems,
        toggleMenuItem,

    } = useSettingsStore();

    const { showToast } = useToast();
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isClearCacheOpen, setIsClearCacheOpen] = useState(false);
    const [isResetOpen, setIsResetOpen] = useState(false);


    const handleLanguageChange = (newLang: string) => {
        setLanguage(newLang);
        changeLanguage(newLang as any);
    };

    const handleThemeChange = (themeId: string) => {
        setTheme(themeId);
        const newTheme = getThemeById(themeId);
        if (newTheme) {
            applyTheme(newTheme);
        }
    };

    const handleResetClick = () => {
        setIsResetOpen(true);
    };

    const confirmReset = () => {
        resetSettings();
        setIsResetOpen(false);
        showToast(t('settings.resetSuccess') || 'Settings reset to defaults', 'success');
    };



    const handleClearCacheClick = () => {
        setIsClearCacheOpen(true);
    };

    const confirmClearCache = async () => {
        try {
            // @ts-ignore
            await window.go?.main?.App?.ClearAllData();
            setIsClearCacheOpen(false);
            showToast(t('settings.clearCacheSuccess'), 'success');
        } catch (error) {
            console.error("Failed to clear cache:", error);
            showToast(t('settings.clearCacheError'), 'error');
        }
    };

    return (
        <div
            className="h-full overflow-auto p-6"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h1
                        className="text-2xl font-bold"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {t('settings.title')}
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
                    <SectionHeader title={t('settings.appearance')} />

                    {/* Theme */}
                    <SettingRow label={t('settings.theme')}>
                        <div className="flex flex-wrap gap-2">
                            {builtInThemes.map((themeOption) => (
                                <button
                                    key={themeOption.id}
                                    onClick={() => handleThemeChange(themeOption.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95 ${theme === themeOption.id ? 'shadow-lg brightness-110' : ''
                                        }`}
                                    style={{
                                        backgroundColor: theme === themeOption.id
                                            ? 'var(--color-accent)'
                                            : 'var(--color-surface-tertiary)',
                                        color: theme === themeOption.id
                                            ? 'white'
                                            : 'var(--color-text-secondary)',
                                        '--tw-ring-color': 'var(--color-accent)',
                                        '--tw-ring-offset-color': 'var(--color-surface-primary)',
                                        border: 'none',
                                    } as React.CSSProperties}
                                >
                                    {t(`themes.${themeOption.id}`)}
                                </button>
                            ))}
                        </div>
                    </SettingRow>

                    {/* Language */}
                    <SettingRow label={t('settings.language')}>
                        <select
                            value={language}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            className="input w-48"
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
                        label={t('settings.menuItems')}
                        description={t('settings.menuItemsDesc')}
                    >
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            {['home', 'explorer', 'history', 'folders', 'series', 'download'].map((item) => {
                                const isSettings = item === 'settings';
                                const isEnabled = enabledMenuItems?.[item] !== false;

                                return (
                                    <div
                                        key={item}
                                        className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${isSettings ? 'opacity-80 cursor-default' : 'hover:bg-white/5 cursor-pointer'
                                            }`}
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
                </section>

                {/* Viewer Section */}
                <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <SectionHeader title={t('settings.viewer')} />

                    {/* Default Mode */}
                    <SettingRow label={t('settings.defaultMode')}>
                        <div className="flex gap-2">
                            <ModeButton
                                active={viewerMode === 'vertical'}
                                onClick={() => setViewerMode('vertical')}
                                label={t('viewer.vertical')}
                            />
                            <ModeButton
                                active={viewerMode === 'lateral'}
                                onClick={() => setViewerMode('lateral')}
                                label={t('viewer.lateral')}
                            />
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
                            <ModeButton
                                active={lateralMode === 'single'}
                                onClick={() => setLateralMode('single')}
                                label={t('viewer.singlePage')}
                            />
                            <ModeButton
                                active={lateralMode === 'double'}
                                onClick={() => setLateralMode('double')}
                                label={t('viewer.doublePage')}
                            />
                        </div>
                    </SettingRow>

                    {/* Reading Direction */}
                    <SettingRow label={t('settings.readingDirection')}>
                        <div className="flex gap-2">
                            <ModeButton
                                active={readingDirection === 'ltr'}
                                onClick={() => setReadingDirection('ltr')}
                                label={t('settings.leftToRight')}
                            />
                            <ModeButton
                                active={readingDirection === 'rtl'}
                                onClick={() => setReadingDirection('rtl')}
                                label={t('settings.rightToLeft')}
                            />
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
                    <SectionHeader title={t('settings.advanced')} />

                    <SettingRow label={t('settings.preloadImages')}>
                        <Toggle
                            checked={preloadImages}
                            onChange={setPreloadImages}
                        />
                    </SettingRow>

                    {
                        preloadImages && (
                            <SettingRow label={t('settings.preloadCount')}>
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

                    <SettingRow label={t('settings.showImageInfo')}>
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
                                {minImageSize > 0 ? `${minImageSize} KB` : t('common.off')}
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
                        <button
                            onClick={handleResetClick}
                            className="py-3 rounded-lg text-sm font-medium transition-all hover:scale-[1.01] active:scale-[0.99] border border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
                        >
                            {t('settings.resetSettings')}
                        </button>

                        <button
                            onClick={handleClearCacheClick}
                            className="py-3 rounded-lg text-sm font-medium transition-all hover:scale-[1.01] active:scale-[0.99] border border-red-500/30 text-red-500 hover:bg-red-500/10"
                        >
                            {t('settings.clearAllCache')}
                        </button>
                    </div>
                </section>
            </div>

            {/* Reset Settings Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isResetOpen}
                onClose={() => setIsResetOpen(false)}
                onConfirm={confirmReset}
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
            {isHelpOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setIsHelpOpen(false)}>
                    <div className="card w-full max-w-lg p-6 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--color-surface-elevated)' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                {t('settings.help.title')}
                            </h3>
                            <button
                                onClick={() => setIsHelpOpen(false)}
                                className="p-1 rounded hover:bg-white/10 transition-colors"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                            {/* Appearance */}
                            <div>
                                <h4 className="font-semibold text-sm uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--color-accent)' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <circle cx="12" cy="12" r="4" />
                                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                    </svg>
                                    {t('settings.help.appearance')}
                                </h4>
                                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                    {t('settings.help.appearanceDesc')}
                                </p>
                            </div>

                            {/* Viewer */}
                            <div>
                                <h4 className="font-semibold text-sm uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--color-accent)' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                    </svg>
                                    {t('settings.help.viewer')}
                                </h4>
                                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                    {t('settings.help.viewerDesc')}
                                </p>
                            </div>

                            {/* Advanced */}
                            <div>
                                <h4 className="font-semibold text-sm uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--color-accent)' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="3" />
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                    </svg>
                                    {t('settings.help.advanced')}
                                </h4>
                                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                    {t('settings.help.advancedDesc')}
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={() => setIsHelpOpen(false)}
                                className="btn btn-primary px-6"
                            >
                                {t('common.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Section header component
function SectionHeader({ title }: { title: string }) {
    return (
        <h2
            className="text-lg font-semibold mb-4 pb-2 border-b"
            style={{
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border)',
            }}
        >
            {title}
        </h2>
    );
}

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

// Mode button component
function ModeButton({
    active,
    onClick,
    label,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95 ${active ? 'shadow-md brightness-110' : ''}`}
            style={{
                backgroundColor: active
                    ? 'var(--color-accent)'
                    : 'var(--color-surface-tertiary)',
                color: active ? 'white' : 'var(--color-text-secondary)',
                '--tw-ring-color': 'var(--color-accent)',
                '--tw-ring-offset-color': 'var(--color-surface-primary)',
                border: 'none',
            } as React.CSSProperties}
        >
            {label}
        </button>
    );
}

// Toggle component
function Toggle({
    checked,
    onChange,
    disabled = false,
}: {
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (!disabled) {
                    onChange(!checked);
                }
            }}
            className={`relative w-12 h-6 rounded-full transition-all active:scale-95 ${disabled ? 'opacity-50 cursor-default' : ''
                }`}
            style={{
                backgroundColor: checked
                    ? 'var(--color-accent)'
                    : 'var(--color-surface-tertiary)',
            }}
        >
            <div
                className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300"
                style={{ left: checked ? '1.5rem' : '0.25rem' }}
            />
        </button>
    );
}

export default SettingsPage;
