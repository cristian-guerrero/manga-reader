/**
 * ColorizerPage - Manga colorization page
 * Allows users to drag/drop manga images, colorize them using AI, and download results
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@hooks";
import { useToast } from "@components/common/Toast";
import * as AppBackend from "../../../wailsjs/go/main/App";
import { OnFileDrop, OnFileDropOff } from "../../../wailsjs/runtime";
import type { colorizer } from "../../../wailsjs/go/models";

interface ImageFile {
  path: string;
  name: string;
}

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"];

type InstallStatus = colorizer.InstallProgress["status"];

interface ColorizeSettings {
  colorize: boolean;
  upscale: boolean;
  denoise: boolean;
  upscaleFactor: 2 | 4;
  denoiseSigma: number;
}

export function ColorizerPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { navigate, params, setParams, setIsProcessing } = useNavigation();

  const [status, setStatus] = useState<colorizer.InstallProgress>({
    status: "not_installed",
    message: t("colorizer.status.not_installed"),
    percent: 0,
  });
  const [isStarting, setIsStarting] = useState(false);
  const [isServerRunning, setIsServerRunning] = useState(false);

  const [droppedImages, setDroppedImages] = useState<ImageFile[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentImagePreview, setCurrentImagePreview] = useState<string | null>(
    null,
  );
  const [isColorizing, setIsColorizing] = useState(false);
  const [colorizedCache, setColorizedCache] = useState<Record<string, string>>(
    {},
  );
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  const [settings, setSettings] = useState<ColorizeSettings>({
    colorize: true,
    upscale: false,
    denoise: false,
    upscaleFactor: 2,
    denoiseSigma: 25,
  });

  const [isColorizingAll, setIsColorizingAll] = useState(false);
  const [colorizeAllProgress, setColorizeAllProgress] = useState({
    current: 0,
    total: 0,
  });
  const [currentProcessingImage, setCurrentProcessingImage] = useState<
    string | null
  >(null);

  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelColorizeRef = useRef(false);

  // Poll status updates from backend
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const s = await AppBackend.ColorizerGetStatus();
        setStatus(s);

        if (s.status === "running") {
          setIsServerRunning(true);
          setIsStarting(false);
        } else if (s.status === "ready" || s.status === "not_installed") {
          setIsServerRunning(false);
        }

        if (s.status === "error" && s.error) {
          showToast(s.error, "error");
          setIsStarting(false);
        }
      } catch (e) {
        // Ignore errors during polling
      }
    };

    pollStatus();
    statusPollRef.current = setInterval(pollStatus, 500);

    return () => {
      if (statusPollRef.current) {
        clearInterval(statusPollRef.current);
      }
    };
  }, [showToast, t]);

  // Load image preview as base64 when currentImage changes
  useEffect(() => {
    if (!currentImage) {
      setCurrentImagePreview(null);
      return;
    }

    const loadImage = async () => {
      try {
        const base64 = await AppBackend.LoadImageAsBase64(currentImage);
        setCurrentImagePreview(base64);
      } catch (e) {
        console.error("Failed to load image preview:", e);
      }
    };
    loadImage();
  }, [currentImage]);

  const currentColorizedImage = currentImage
    ? colorizedCache[currentImage]
    : null;

  useEffect(() => {
    console.log("[Colorizer] currentImage:", currentImage);
    console.log(
      "[Colorizer] colorizedCache keys:",
      Object.keys(colorizedCache),
    );
    console.log(
      "[Colorizer] currentColorizedImage length:",
      currentColorizedImage?.length ?? null,
    );
  }, [currentImage, colorizedCache, currentColorizedImage]);

  // Register drag and drop for this page
  useEffect(() => {
    OnFileDrop(async (_x, _y, paths) => {
      if (!paths || paths.length === 0) return;

      try {
        setIsLoadingImages(true);
        const newImages: ImageFile[] = [];

        for (const p of paths) {
          const resolved = await AppBackend.ResolveFolder(p);
          // Try to explore folder and get image files
          try {
            const entries = await AppBackend.ExploreFolder(resolved);
            for (const entry of entries) {
              if (!entry.isDirectory && entry.hasImages) {
                newImages.push({
                  path: entry.coverImage || entry.path,
                  name: entry.name,
                });
              }
            }
          } catch {
            // Single file - check if it's an image
            const ext = p.split(".").pop()?.toLowerCase();
            if (ext && IMAGE_EXTENSIONS.includes(`.${ext}`)) {
              const name = p.split(/[\\/]/).pop() || p;
              newImages.push({ path: p, name });
            }
          }
        }

        if (newImages.length > 0) {
          setDroppedImages((prev) => [...prev, ...newImages]);
          if (!currentImage) {
            setCurrentImage(newImages[0].path);
          }
          showToast(`Added ${newImages.length} image(s)`, "success");
        } else {
          showToast("No images found in dropped items", "info");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to process files";
        showToast(msg, "error");
      } finally {
        setIsLoadingImages(false);
      }
    }, false);

    return () => {
      OnFileDropOff();
    };
  }, [showToast, currentImage]);

  useEffect(() => {
    const folderPath = params?.folderPath;
    if (!folderPath || droppedImages.length > 0) return;

    const loadFolderImages = async () => {
      try {
        setIsLoadingImages(true);
        const entries = await AppBackend.ExploreFolder(folderPath);
        const newImages: ImageFile[] = [];
        for (const entry of entries) {
          if (!entry.isDirectory && entry.hasImages) {
            newImages.push({
              path: entry.coverImage || entry.path,
              name: entry.name,
            });
          }
        }
        if (newImages.length > 0) {
          setDroppedImages(newImages);
          setCurrentImage(newImages[0].path);
          showToast(`Loaded ${newImages.length} images from folder`, "success");
        }
      } catch (e) {
        console.error("Failed to load folder images:", e);
        showToast("Failed to load folder images", "error");
      } finally {
        setIsLoadingImages(false);
      }
    };

    loadFolderImages();
    setParams({});
  }, [params?.folderPath]);

  const handleStartServer = useCallback(async () => {
    try {
      setIsStarting(true);
      if (status.status === "not_installed" || status.status === "error") {
        showToast(t("colorizer.firstTimeSetup"), "warning");
      }
      await AppBackend.ColorizerStartServer();
      showToast(t("colorizer.status.starting_server"), "info");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to start server";
      showToast(msg, "error");
      setIsStarting(false);
    }
  }, [showToast, t, status.status]);

  const handleStopServer = useCallback(async () => {
    try {
      await AppBackend.ColorizerStopServer();
      setIsServerRunning(false);
      showToast(t("colorizer.status.stopping"), "info");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to stop server";
      showToast(msg, "error");
    }
  }, [showToast, t]);

  const handleColorize = useCallback(async () => {
    if (!currentImage) {
      showToast("No image selected", "info");
      return;
    }

    if (!isServerRunning) {
      showToast(t("colorizer.notRunning"), "info");
      return;
    }

    try {
      setIsColorizing(true);
      setCurrentProcessingImage(
        currentImage?.split(/[\\/]/).pop() || "current image",
      );

      const result = await AppBackend.ColorizeImage(
        currentImage,
        settings.colorize,
        settings.upscale,
        settings.denoise,
        settings.denoiseSigma,
        settings.upscaleFactor,
      );

      console.log(
        "[Colorize] Result:",
        JSON.stringify(result).substring(0, 500),
      );
      console.log(
        "[Colorize] success:",
        result.success,
        "output_base64 length:",
        result.output_base64?.length,
      );

      if (result.success && result.output_base64) {
        const imgSrc = result.output_base64.startsWith("data:")
          ? result.output_base64
          : `data:image/png;base64,${result.output_base64}`;
        setColorizedCache((prev) => ({ ...prev, [currentImage]: imgSrc }));
        showToast("Colorization complete!", "success");
      } else {
        showToast(result.message || "Colorization failed", "error");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Colorization failed";
      showToast(msg, "error");
    } finally {
      setIsColorizing(false);
      setIsProcessing(false);
      setCurrentProcessingImage(null);
    }
  }, [currentImage, isServerRunning, settings, showToast, setIsProcessing, t]);

  const handleDownload = useCallback(async () => {
    if (!currentColorizedImage) {
      showToast("No colorized image to download", "info");
      return;
    }

    try {
      const link = document.createElement("a");
      link.href = currentColorizedImage;
      link.download = "colorized_manga.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Download started", "success");
    } catch {
      showToast("Download failed", "error");
    }
  }, [currentColorizedImage, showToast]);

  const handleClearImages = useCallback(() => {
    setDroppedImages([]);
    setCurrentImage(null);
    setCurrentImagePreview(null);
    setColorizedCache({});
    showToast("Image list cleared", "info");
  }, [showToast]);

  const handleColorizeAll = useCallback(async () => {
    if (droppedImages.length === 0) {
      showToast("No images to colorize", "info");
      return;
    }

    if (!isServerRunning) {
      showToast(t("colorizer.notRunning"), "info");
      return;
    }

    cancelColorizeRef.current = false;
    let wasCancelled = false;

    try {
      setIsColorizingAll(true);
      setColorizeAllProgress({ current: 0, total: droppedImages.length });

      const newCache = { ...colorizedCache };
      let successCount = 0;

      for (let i = 0; i < droppedImages.length; i++) {
        if (cancelColorizeRef.current) {
          wasCancelled = true;
          break;
        }

        const img = droppedImages[i];
        setColorizeAllProgress({ current: i + 1, total: droppedImages.length });
        setCurrentProcessingImage(img.name);

        try {
          const result = await AppBackend.ColorizeImage(
            img.path,
            settings.colorize,
            settings.upscale,
            settings.denoise,
            settings.denoiseSigma,
            settings.upscaleFactor,
          );

          if (result.success && result.output_base64) {
            const imgSrc = result.output_base64.startsWith("data:")
              ? result.output_base64
              : `data:image/png;base64,${result.output_base64}`;
            newCache[img.path] = imgSrc;
            successCount++;
          }
        } catch (e) {
          console.error(`Failed to colorize ${img.name}:`, e);
        }
      }

      setColorizedCache(newCache);

      if (wasCancelled) {
        const processedCount = colorizeAllProgress.current;
        showToast(`Cancelled after ${processedCount} image(s)`, "info");
      } else {
        setCurrentProcessingImage(null);
        showToast(
          `Colorized ${successCount}/${droppedImages.length} image(s)`,
          "success",
        );
      }

      try {
        await AppBackend.ColorizerRestartServer();
        showToast("Server restarted due to memory cleanup", "info");
      } catch (e) {
        console.warn("Failed to restart server after colorize all:", e);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Colorization failed";
      showToast(msg, "error");
    } finally {
      setIsColorizingAll(false);
      setIsProcessing(false);
      setColorizeAllProgress({ current: 0, total: 0 });
      setCurrentProcessingImage(null);
    }
  }, [
    droppedImages,
    isServerRunning,
    settings,
    colorizedCache,
    showToast,
    setIsProcessing,
    t,
  ]);

  const handleCancelColorize = useCallback(() => {
    cancelColorizeRef.current = true;
  }, []);

  const handleDownloadAll = useCallback(async () => {
    const colorizedImages = droppedImages.filter(
      (img) => colorizedCache[img.path],
    );

    if (colorizedImages.length === 0) {
      showToast("No colorized images to download", "info");
      return;
    }

    try {
      for (const img of colorizedImages) {
        const link = document.createElement("a");
        link.href = colorizedCache[img.path];
        link.download = `colorized_${img.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Small delay between downloads to avoid browser blocking
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      showToast(`Downloaded ${colorizedImages.length} image(s)`, "success");
    } catch {
      showToast("Download failed", "error");
    }
  }, [droppedImages, colorizedCache, showToast]);

  const handleSelectFolder = useCallback(async () => {
    try {
      const path = await AppBackend.SelectFolder();
      if (path) {
        setIsLoadingImages(true);
        try {
          const entries = await AppBackend.ExploreFolder(path);
          const newImages: ImageFile[] = [];
          for (const entry of entries) {
            if (!entry.isDirectory && entry.hasImages) {
              newImages.push({
                path: entry.coverImage || entry.path,
                name: entry.name,
              });
            }
          }
          if (newImages.length > 0) {
            setDroppedImages((prev) => [...prev, ...newImages]);
            if (!currentImage) {
              setCurrentImage(newImages[0].path);
            }
            showToast(`Loaded ${newImages.length} images`, "success");
          }
        } finally {
          setIsLoadingImages(false);
        }
      }
    } catch {
      // User cancelled
    }
  }, [currentImage, showToast]);

  const isReady = status.status === "ready" || status.status === "running";
  const canColorize = isServerRunning && currentImage && !isColorizing;

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: "var(--color-surface-primary)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {t("colorizer.title")}
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t("colorizer.subtitle")}
          </p>
        </div>

        {/* Server Controls */}
        <div className="flex items-center gap-2">
          {isServerRunning ? (
            <button
              onClick={handleStopServer}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: "var(--color-danger)",
                color: "white",
              }}
            >
              {t("colorizer.stop")}
            </button>
          ) : (
            <button
              onClick={handleStartServer}
              disabled={isStarting}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: "var(--color-success)",
                color: "white",
                opacity: isStarting ? 0.6 : 1,
              }}
            >
              {isStarting
                ? t("colorizer.status.starting_server")
                : t("colorizer.start")}
            </button>
          )}

          {/* Status Indicator */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: isServerRunning
                ? "rgba(34, 197, 94, 0.1)"
                : "var(--color-surface-tertiary)",
              color: isServerRunning
                ? "rgb(34, 197, 94)"
                : "var(--color-text-secondary)",
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: isServerRunning
                  ? "rgb(34, 197, 94)"
                  : "var(--color-text-muted)",
              }}
            />
            {t(`colorizer.status.${status.status}`)}
          </div>
        </div>
      </div>

      {/* Installation Progress */}
      {!isReady && status.status !== "not_installed" && (
        <div
          className="px-6 py-4 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-4">
            <span
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
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
            <span
              className="text-sm font-mono"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {Math.round(status.percent)}%
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Panel - Image List */}
        <div
          className="w-64 border-r flex flex-col min-h-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div
            className="p-4 border-b space-y-2"
            style={{ borderColor: "var(--color-border)" }}
          >
            <button
              onClick={handleSelectFolder}
              className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: "var(--color-surface-tertiary)",
                color: "var(--color-text-primary)",
              }}
            >
              {t("colorizer.selectFolder")}
            </button>
            {droppedImages.length > 0 && (
              <button
                onClick={handleClearImages}
                className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: "var(--color-danger)",
                  color: "white",
                }}
              >
                {t("colorizer.clear")}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoadingImages ? (
              <div className="flex items-center justify-center h-full">
                <div
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Loading images...
                </div>
              </div>
            ) : droppedImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p
                  className="mt-3 text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t("colorizer.dragDrop")}
                </p>
              </div>
            ) : (
              droppedImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentImage(img.path);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-sm text-left truncate transition-all ${
                    currentImage === img.path
                      ? "bg-accent/20 border-accent"
                      : "hover:bg-surface-hover"
                  }`}
                  style={{
                    backgroundColor:
                      currentImage === img.path
                        ? "var(--color-accent)"
                        : "rgba(0,0,0,0)",
                    color:
                      currentImage === img.path
                        ? "white"
                        : "var(--color-text-primary)",
                    border:
                      currentImage === img.path
                        ? "1px solid var(--color-accent)"
                        : "1px solid transparent",
                  }}
                >
                  {img.name}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Center Panel - Image Preview */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 flex items-center justify-center p-6 relative">
            {currentColorizedImage ? (
              <img
                src={currentColorizedImage}
                alt="Colorized manga"
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            ) : currentImagePreview ? (
              <img
                src={currentImagePreview}
                alt="Original manga"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : (
              <div className="text-center">
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  style={{ color: "var(--color-text-muted)", margin: "0 auto" }}
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <p
                  className="mt-4"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t("colorizer.dragDrop")}
                </p>
              </div>
            )}

            {/* Processing Overlay */}
            {(isColorizing || isColorizingAll) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/95 rounded-lg z-20">
                <div className="text-center px-8 min-w-[300px]">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>

                  <div className="text-white font-bold text-xl mb-2">
                    {isColorizingAll
                      ? status.status === "colorizing"
                        ? t("colorizer.processingAll") ||
                          "Processing All Images"
                        : status.status || "Processing All Images"
                      : status.status === "colorizing"
                        ? t("colorizer.colorizing") || "Colorizing Image"
                        : status.status || "Processing"}
                  </div>

                  {(status.message ||
                    currentProcessingImage ||
                    currentImage) && (
                    <div className="text-gray-300 text-base mb-4">
                      {status.message ||
                        currentProcessingImage ||
                        currentImage?.split("/").pop() ||
                        "Please wait..."}
                    </div>
                  )}

                  {isColorizingAll && (
                    <div className="mt-4">
                      <div className="text-white font-semibold text-lg mb-2">
                        {colorizeAllProgress.current} /{" "}
                        {colorizeAllProgress.total}
                      </div>
                      <div className="w-64 h-3 bg-gray-700 rounded-full mx-auto overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{
                            width: `${colorizeAllProgress.total > 0 ? (colorizeAllProgress.current / colorizeAllProgress.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <button
                        onClick={handleCancelColorize}
                        className="mt-4 px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                          backgroundColor: "var(--color-danger)",
                          color: "white",
                        }}
                      >
                        {t("common.cancel") || "Cancel"}
                      </button>
                    </div>
                  )}

                  <div className="mt-6 text-gray-500 text-sm">
                    {isColorizingAll
                      ? t("colorizer.dontClose") || "Don't close this window"
                      : t("colorizer.pleaseWait") ||
                        "Please wait while we prepare your content"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div
            className="flex items-center justify-between px-6 py-3 border-t flex-shrink-0"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-surface-secondary)",
            }}
          >
            {/* Settings */}
            <div className="flex items-center gap-4">
              <label
                className="flex items-center gap-2 text-sm cursor-pointer"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <input
                  type="checkbox"
                  checked={settings.colorize}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, colorize: e.target.checked }))
                  }
                  className="rounded"
                  disabled={isColorizing || isColorizingAll}
                />
                {t("colorizer.settings.colorize")}
              </label>
              <label
                className="flex items-center gap-2 text-sm cursor-pointer"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <input
                  type="checkbox"
                  checked={settings.upscale}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, upscale: e.target.checked }))
                  }
                  className="rounded"
                  disabled={isColorizing || isColorizingAll}
                />
                {t("colorizer.settings.upscale")}
              </label>
              <label
                className="flex items-center gap-2 text-sm cursor-pointer"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <input
                  type="checkbox"
                  checked={settings.denoise}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, denoise: e.target.checked }))
                  }
                  className="rounded"
                  disabled={isColorizing || isColorizingAll}
                />
                {t("colorizer.settings.denoise")}
              </label>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleColorize}
                disabled={!canColorize}
                className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: canColorize
                    ? "var(--color-accent)"
                    : "var(--color-surface-tertiary)",
                  color: canColorize ? "white" : "var(--color-text-muted)",
                  opacity: canColorize ? 1 : 0.5,
                }}
              >
                {isColorizing
                  ? t("common.processing")
                  : t("colorizer.colorize")}
              </button>
              <button
                onClick={handleColorizeAll}
                disabled={
                  !isServerRunning ||
                  droppedImages.length === 0 ||
                  isColorizingAll
                }
                className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor:
                    isServerRunning && droppedImages.length > 0
                      ? "var(--color-accent)"
                      : "var(--color-surface-tertiary)",
                  color:
                    isServerRunning && droppedImages.length > 0
                      ? "white"
                      : "var(--color-text-muted)",
                  opacity:
                    isServerRunning && droppedImages.length > 0 ? 1 : 0.5,
                }}
              >
                {isColorizingAll
                  ? `${colorizeAllProgress.current}/${colorizeAllProgress.total}`
                  : t("colorizer.colorizeAll")}
              </button>
              <button
                onClick={handleDownload}
                disabled={!currentColorizedImage}
                className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: currentColorizedImage
                    ? "var(--color-success)"
                    : "var(--color-surface-tertiary)",
                  color: currentColorizedImage
                    ? "white"
                    : "var(--color-text-muted)",
                  opacity: currentColorizedImage ? 1 : 0.5,
                }}
              >
                {t("colorizer.download")}
              </button>
              <button
                onClick={handleDownloadAll}
                disabled={
                  droppedImages.filter((img) => colorizedCache[img.path])
                    .length === 0
                }
                className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor:
                    droppedImages.filter((img) => colorizedCache[img.path])
                      .length > 0
                      ? "var(--color-success)"
                      : "var(--color-surface-tertiary)",
                  color:
                    droppedImages.filter((img) => colorizedCache[img.path])
                      .length > 0
                      ? "white"
                      : "var(--color-text-muted)",
                  opacity:
                    droppedImages.filter((img) => colorizedCache[img.path])
                      .length > 0
                      ? 1
                      : 0.5,
                }}
              >
                {t("colorizer.downloadAll")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ColorizerPage;
