/**
 * SettingsPage - Main settings page refactored with hooks and components
 * Separated concerns: hooks handle logic, components handle UI
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useSettingsStore } from '@stores';
import { useSettingsActions, useSettingsDialogs } from './hooks';
import { SettingsHeader } from './components/SettingsHeader';
import { AppearanceSection } from './components/AppearanceSection';
import { ViewerSection } from './components/ViewerSection';
import { KeyboardSection } from './components/KeyboardSection';
import { AdvancedSection } from './components/AdvancedSection';
import { TabsSection } from './components/TabsSection';
import { NetworkServerSection } from './components/NetworkServerSection';
import { UpdateSection } from './components/UpdateSection';
import { DangerZoneSection } from './components/DangerZoneSection';
import { SettingsDialogs } from './components/SettingsDialogs';

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const settings = useSettingsStore(useShallow((s) => ({
    language: s.language,
    theme: s.theme,
    viewerMode: s.viewerMode,
    verticalWidth: s.verticalWidth,
    lateralMode: s.lateralMode,
    readingDirection: s.readingDirection,
    panicKey: s.panicKey,
    showImageInfo: s.showImageInfo,
    enableHistory: s.enableHistory,
    minImageSize: s.minImageSize,
    processDroppedFolders: s.processDroppedFolders,
    generateThumbnails: s.generateThumbnails,
    tabMemorySaving: s.tabMemorySaving,
    restoreTabs: s.restoreTabs,
    themeAccents: s.themeAccents,
    gradientOrigins: s.gradientOrigins,
    enabledMenuItems: s.enabledMenuItems,
    setTheme: s.setTheme,
    setAccentColor: s.setAccentColor,
    setGradientOrigin: s.setGradientOrigin,
    setLanguage: s.setLanguage,
    toggleMenuItem: s.toggleMenuItem,
    setViewerMode: s.setViewerMode,
    setVerticalWidth: s.setVerticalWidth,
    setLateralMode: s.setLateralMode,
    setReadingDirection: s.setReadingDirection,
    setShowImageInfo: s.setShowImageInfo,
    setEnableHistory: s.setEnableHistory,
    setMinImageSize: s.setMinImageSize,
    setProcessDroppedFolders: s.setProcessDroppedFolders,
    setGenerateThumbnails: s.setGenerateThumbnails,
    setTabMemorySaving: s.setTabMemorySaving,
    setRestoreTabs: s.setRestoreTabs,
  })));
  const { handleLanguageChange, handleResetSettings, handleClearCache } = useSettingsActions();
  const {
    isResetOpen,
    setIsResetOpen,
    isClearCacheOpen,
    setIsClearCacheOpen,
    isHelpOpen,
    setIsHelpOpen,
  } = useSettingsDialogs();

  const handleResetConfirm = () => {
    handleResetSettings();
    setIsResetOpen(false);
  };

  const handleClearCacheConfirm = async () => {
    await handleClearCache();
    setIsClearCacheOpen(false);
  };

  return (
    <div className="h-full overflow-auto p-6" style={{ background: 'var(--gradient-surface-primary)' }}>
      <div className="max-w-6xl mx-auto pb-24 animate-fade-in space-y-8">
        {/* Header */}
        <SettingsHeader onHelpClick={() => setIsHelpOpen(true)} />

        {/* Appearance Section */}
        <AppearanceSection
          settings={{
            theme: settings.theme,
            setTheme: settings.setTheme,
            themeAccents: settings.themeAccents,
            setAccentColor: settings.setAccentColor,
            gradientOrigins: settings.gradientOrigins,
            setGradientOrigin: settings.setGradientOrigin,
            language: settings.language,
            setLanguage: settings.setLanguage,
            toggleMenuItem: settings.toggleMenuItem,
            enabledMenuItems: settings.enabledMenuItems,
          }}
          onLanguageChange={handleLanguageChange}
        />

        {/* Network Server Section */}
        <NetworkServerSection />

        {/* Viewer Section */}
        <ViewerSection
          settings={{
            viewerMode: settings.viewerMode,
            setViewerMode: settings.setViewerMode,
            verticalWidth: settings.verticalWidth,
            setVerticalWidth: settings.setVerticalWidth,
            lateralMode: settings.lateralMode,
            setLateralMode: settings.setLateralMode,
            readingDirection: settings.readingDirection,
            setReadingDirection: settings.setReadingDirection,
          }}
        />

        {/* Keyboard Section */}
        <KeyboardSection
          settings={{
            panicKey: settings.panicKey,
          }}
        />

        {/* Advanced Section */}
        <AdvancedSection
          settings={{
            showImageInfo: settings.showImageInfo,
            setShowImageInfo: settings.setShowImageInfo,
            enableHistory: settings.enableHistory,
            setEnableHistory: settings.setEnableHistory,
            minImageSize: settings.minImageSize,
            setMinImageSize: settings.setMinImageSize,
            processDroppedFolders: settings.processDroppedFolders,
            setProcessDroppedFolders: settings.setProcessDroppedFolders,
            generateThumbnails: settings.generateThumbnails,
            setGenerateThumbnails: settings.setGenerateThumbnails,
          }}
        />

        {/* Tabs Section */}
        <TabsSection
          settings={{
            tabMemorySaving: settings.tabMemorySaving,
            setTabMemorySaving: settings.setTabMemorySaving,
            restoreTabs: settings.restoreTabs,
            setRestoreTabs: settings.setRestoreTabs,
          }}
        />

        {/* Updates Section */}
        <UpdateSection />

        {/* Danger Zone */}
        <DangerZoneSection
          onResetClick={() => setIsResetOpen(true)}
          onClearCacheClick={() => setIsClearCacheOpen(true)}
        />
      </div>

      {/* Dialogs */}
      <SettingsDialogs
        isResetOpen={isResetOpen}
        onResetClose={() => setIsResetOpen(false)}
        onResetConfirm={handleResetConfirm}
        isClearCacheOpen={isClearCacheOpen}
        onClearCacheClose={() => setIsClearCacheOpen(false)}
        onClearCacheConfirm={handleClearCacheConfirm}
        isHelpOpen={isHelpOpen}
        onHelpClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
};

export default SettingsPage;
