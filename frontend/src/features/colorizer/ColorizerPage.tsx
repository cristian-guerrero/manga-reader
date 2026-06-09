import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useColorizerServer, useColorizerImages, useColorizerProcessing, useColorizerDownload } from "./hooks";
import { ServerControls, ImageList, ImagePreview, ProcessingOverlay, ActionBar, DownloadDialog } from "./components";
import { HelpDialog } from "@shared/components";
import type { ColorizeSettings } from "./types";

export function ColorizerPage() {
  const { t } = useTranslation();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const { status, isServerRunning, isStarting, startServer, stopServer } = useColorizerServer();
  const {
    droppedImages, currentImage, selectImage, currentImagePreview,
    isLoadingImages, selectFolder, clearImages,
  } = useColorizerImages();

  const [settings, setSettings] = useState<ColorizeSettings>({
    colorize: true, upscale: false, denoise: false,
    upscaleFactor: 2, denoiseSigma: 25,
  });

  const [colorizedCache, setColorizedCache] = useState<Record<string, string>>({});
  const [useDefaultFolder, setUseDefaultFolder] = useState(true);

  const {
    isColorizing, isColorizingAll, colorizeAllProgress, currentProcessingImage,
    handleColorize, handleColorizeAll, handleCancelColorize,
  } = useColorizerProcessing(isServerRunning, settings, droppedImages, currentImage, setColorizedCache);

  const {
    currentColorizedImage, dialogOpen, downloadState, singleItem, multipleItems,
    handleDownload, handleDownloadAll, executeDownload, closeDialog,
  } = useColorizerDownload(droppedImages, currentImage, colorizedCache, useDefaultFolder);

  const handleSettingsChange = useCallback((key: keyof ColorizeSettings, value: boolean | number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const isReady = status.status === "ready" || status.status === "running";
  const canColorize = isServerRunning && !!currentImage && !isColorizing;

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--gradient-surface-primary)" }}
    >
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {t("colorizer.title")}
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {t("colorizer.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ServerControls
            isServerRunning={isServerRunning}
            isStarting={isStarting}
            status={status}
            useDefaultFolder={useDefaultFolder}
            onStart={startServer}
            onStop={stopServer}
            onToggleDefaultFolder={() => setUseDefaultFolder((v) => !v)}
          />

          <button
            onClick={() => setIsHelpOpen(true)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            style={{ color: "var(--color-text-secondary)" }}
            title={t("colorizer.help.title")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>

      {!isReady && status.status !== "not_installed" && (
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {status.message}
            </span>
            <div
              className="flex-1 h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--color-surface-tertiary)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${status.percent}%`,
                  backgroundColor: "var(--color-accent)",
                }}
              />
            </div>
            <span className="text-sm font-mono" style={{ color: "var(--color-text-secondary)" }}>
              {Math.round(status.percent)}%
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ImageList
          images={droppedImages}
          currentImage={currentImage}
          isLoading={isLoadingImages}
          onSelectImage={selectImage}
          onSelectFolder={selectFolder}
          onClear={clearImages}
        />

        <div className="flex-1 flex flex-col min-h-0">
          <ImagePreview
            originalPreview={currentImagePreview}
            colorizedPreview={currentColorizedImage}
          >
            <ProcessingOverlay
              isColorizing={isColorizing}
              isColorizingAll={isColorizingAll}
              status={status}
              colorizeAllProgress={colorizeAllProgress}
              currentProcessingImage={currentProcessingImage}
              currentImage={currentImage}
              onCancel={handleCancelColorize}
            />
          </ImagePreview>

          <ActionBar
            settings={settings}
            onSettingsChange={handleSettingsChange}
            canColorize={canColorize}
            hasColorizedImage={!!currentColorizedImage}
            hasColorizedImagesToDownload={droppedImages.filter((img) => colorizedCache[img.path]).length > 0}
            hasImages={droppedImages.length > 0}
            isServerRunning={isServerRunning}
            isColorizing={isColorizing}
            isColorizingAll={isColorizingAll}
            colorizeAllProgress={colorizeAllProgress}
            onColorize={handleColorize}
            onColorizeAll={handleColorizeAll}
            onDownload={handleDownload}
            onDownloadAll={handleDownloadAll}
          />
        </div>
      </div>

      <DownloadDialog
        isOpen={dialogOpen}
        onClose={closeDialog}
        state={downloadState}
        onStartDownload={executeDownload}
        singleItem={singleItem}
        multipleItems={multipleItems}
      />

      <HelpDialog
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title={t("colorizer.help.title")}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--color-surface-secondary)" }}>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: "var(--color-accent)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              {t("colorizer.help.overview")}
            </h4>
            <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
              {t("colorizer.help.overviewDesc")}
            </p>
          </div>

          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--color-surface-secondary)" }}>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: "var(--color-accent)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </svg>
              {t("colorizer.help.gettingStarted")}
            </h4>
            <ol className="list-decimal pl-5 space-y-1 text-sm" style={{ color: "var(--color-text-primary)" }}>
              <li>{t("colorizer.help.step1")}</li>
              <li>{t("colorizer.help.step2")}</li>
              <li>{t("colorizer.help.step3")}</li>
            </ol>
          </div>

          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--color-surface-secondary)" }}>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: "var(--color-accent)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              {t("colorizer.help.settings")}
            </h4>
            <p className="text-sm mb-2" style={{ color: "var(--color-text-primary)" }}>
              {t("colorizer.help.settingsDesc")}
            </p>
            <div className="space-y-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              <p className="flex items-start gap-2">
                <span className="mt-1">•</span>
                {t("colorizer.help.colorize")}
              </p>
              <p className="flex items-start gap-2">
                <span className="mt-1">•</span>
                {t("colorizer.help.upscale")}
              </p>
              <p className="flex items-start gap-2">
                <span className="mt-1">•</span>
                {t("colorizer.help.denoise")}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--color-surface-secondary)" }}>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: "var(--color-accent)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              {t("colorizer.help.download")}
            </h4>
            <p className="text-sm mb-2" style={{ color: "var(--color-text-primary)" }}>
              {t("colorizer.help.downloadDesc")}
            </p>
            <div className="space-y-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              <p className="flex items-start gap-2">
                <span className="mt-1">•</span>
                {t("colorizer.help.autoFolder")}
              </p>
              <p className="flex items-start gap-2">
                <span className="mt-1">•</span>
                {t("colorizer.help.manualFolder")}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--color-surface-secondary)" }}>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: "var(--color-accent)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
              {t("colorizer.help.tips")}
            </h4>
            <div className="space-y-1 text-sm" style={{ color: "var(--color-text-primary)" }}>
              <p className="flex items-start gap-2">
                <span className="mt-1">•</span>
                {t("colorizer.help.tipServer")}
              </p>
              <p className="flex items-start gap-2">
                <span className="mt-1">•</span>
                {t("colorizer.help.tipUpscale")}
              </p>
              <p className="flex items-start gap-2">
                <span className="mt-1">•</span>
                {t("colorizer.help.tipBatch")}
              </p>
            </div>
          </div>
        </div>
      </HelpDialog>
    </div>
  );
}

export default ColorizerPage;
