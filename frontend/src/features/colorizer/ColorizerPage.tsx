import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useColorizerServer, useColorizerImages, useColorizerProcessing, useColorizerDownload } from "./hooks";
import { ServerControls, ImageList, ImagePreview, ProcessingOverlay, ActionBar, DownloadDialog } from "./components";
import type { ColorizeSettings } from "./types";

export function ColorizerPage() {
  const { t } = useTranslation();

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
      style={{ backgroundColor: "var(--color-surface-primary)" }}
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

        <ServerControls
          isServerRunning={isServerRunning}
          isStarting={isStarting}
          status={status}
          useDefaultFolder={useDefaultFolder}
          onStart={startServer}
          onStop={stopServer}
          onToggleDefaultFolder={() => setUseDefaultFolder((v) => !v)}
        />
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
    </div>
  );
}

export default ColorizerPage;
