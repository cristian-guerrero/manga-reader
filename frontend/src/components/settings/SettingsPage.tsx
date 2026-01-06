/**
 * SettingsPage - Application settings and preferences
 */

import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToast } from '../common/Toast';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Button } from '../common/Button';
import { Toggle } from '../common/Toggle';
import { SectionHeader } from '../common/SectionHeader';
import { HelpDialog } from '../common/HelpDialog';
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
                                <Button
                                    key={themeOption.id}
                                    onClick={() => handleThemeChange(themeOption.id)}
                                    variant={theme === themeOption.id ? 'primary' : 'secondary'}
                                    size="sm"
                                >
                                    {t(`themes.${themeOption.id}`)}
                                </Button>
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
                        <Button
                            onClick={handleResetClick}
                            variant="outline"
                            className="border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
                        >
                            {t('settings.resetSettings')}
                        </Button>

                        <Button
                            onClick={handleClearCacheClick}
                            variant="outline"
                            className="border-red-500/30 text-red-500 hover:bg-red-500/10"
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
            <HelpDialog
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
                title={t('settings.help.title')}
            >
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
            </HelpDialog>
        </div>
    );
}

// Section header component removed (using shared component)

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

// ModeButton and Toggle removed (using shared components)

export default SettingsPage;
