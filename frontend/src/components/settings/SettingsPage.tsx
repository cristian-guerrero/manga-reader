/**
 * SettingsPage - Application settings and preferences
 */

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
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

    const handleReset = () => {
        if (confirm(t('settings.confirmReset'))) {
            resetSettings();
        }
    };

    // Animation variants
    const sectionVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <div
            className="h-full overflow-auto p-6"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            <motion.div
                className="max-w-2xl mx-auto space-y-8"
                initial="hidden"
                animate="visible"
                variants={{
                    visible: { transition: { staggerChildren: 0.1 } },
                }}
            >
                {/* Header */}
                <motion.h1
                    variants={sectionVariants}
                    className="text-2xl font-bold"
                    style={{ color: 'var(--color-text-primary)' }}
                >
                    {t('settings.title')}
                </motion.h1>

                {/* Appearance Section */}
                <motion.section variants={sectionVariants}>
                    <SectionHeader title={t('settings.appearance')} />

                    {/* Theme */}
                    <SettingRow label={t('settings.theme')}>
                        <div className="flex flex-wrap gap-2">
                            {builtInThemes.map((themeOption) => (
                                <motion.button
                                    key={themeOption.id}
                                    onClick={() => handleThemeChange(themeOption.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${theme === themeOption.id ? 'ring-2 ring-offset-2' : ''
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
                                    } as React.CSSProperties}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {t(`themes.${themeOption.id}`)}
                                </motion.button>
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
                            {['home', 'explorer', 'history', 'folders', 'series'].map((item) => {
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
                </motion.section>

                {/* Viewer Section */}
                <motion.section variants={sectionVariants}>
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
                </motion.section>

                {/* Keyboard Section */}
                <motion.section variants={sectionVariants}>
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
                </motion.section>

                {/* Advanced Section */}
                <motion.section variants={sectionVariants}>
                    <SectionHeader title={t('settings.advanced')} />

                    <SettingRow label={t('settings.preloadImages')}>
                        <Toggle
                            checked={preloadImages}
                            onChange={setPreloadImages}
                        />
                    </SettingRow>

                    {preloadImages && (
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
                    )}

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
                </motion.section>

                {/* Reset */}
                <motion.section variants={sectionVariants}>
                    <motion.button
                        onClick={handleReset}
                        className="w-full py-3 rounded-lg text-sm font-medium transition-colors"
                        style={{
                            backgroundColor: 'var(--color-surface-tertiary)',
                            color: '#ef4444',
                            border: '1px solid var(--color-border)',
                        }}
                        whileHover={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderColor: '#ef4444',
                        }}
                        whileTap={{ scale: 0.99 }}
                    >
                        {t('settings.resetSettings')}
                    </motion.button>
                </motion.section>
            </motion.div>
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
        <motion.button
            onClick={onClick}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
                backgroundColor: active
                    ? 'var(--color-accent)'
                    : 'var(--color-surface-tertiary)',
                color: active ? 'white' : 'var(--color-text-secondary)',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {label}
        </motion.button>
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
        <motion.button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!disabled) {
                    onChange(!checked);
                }
            }}
            className={`relative w-12 h-6 rounded-full transition-colors ${disabled ? 'opacity-50 cursor-default' : ''
                }`}
            style={{
                backgroundColor: checked
                    ? 'var(--color-accent)'
                    : 'var(--color-surface-tertiary)',
            }}
            whileTap={disabled ? {} : { scale: 0.95 }}
        >
            <motion.div
                className="absolute top-1 w-4 h-4 rounded-full bg-white"
                animate={{ left: checked ? '1.5rem' : '0.25rem' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
        </motion.button>
    );
}

export default SettingsPage;
