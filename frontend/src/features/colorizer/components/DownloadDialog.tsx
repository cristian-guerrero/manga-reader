/**
 * DownloadDialog - Custom themed download dialog for colorizer
 * Replaces the native webview download dialog with a themed one
 * that uses the app's CSS variables for consistent styling.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import * as AppBackend from "../../../../wailsjs/go/main/App";

interface DownloadItem {
  base64Data: string;
  fileName: string;
  originalName?: string;
}

interface DownloadState {
  status: "idle" | "saving" | "success" | "error" | "cancelled";
  message: string;
  savedFiles: string[];
  progress: { current: number; total: number };
}

interface DownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Single download mode */
  singleItem?: DownloadItem;
  /** Batch download mode */
  multipleItems?: DownloadItem[];
}

export function DownloadDialog({
  isOpen,
  onClose,
  singleItem,
  multipleItems,
}: DownloadDialogProps) {
  const { t } = useTranslation();
  const [downloadState, setDownloadState] = useState<DownloadState>({
    status: "idle",
    message: "",
    savedFiles: [],
    progress: { current: 0, total: 0 },
  });
  const isBatchMode = !!multipleItems && multipleItems.length > 0;
  const itemCount = isBatchMode ? multipleItems!.length : 1;
  const cancelledRef = useRef(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setDownloadState({
        status: "idle",
        message: "",
        savedFiles: [],
        progress: { current: 0, total: 0 },
      });
      cancelledRef.current = false;
    }
  }, [isOpen]);

  const handleSaveSingle = useCallback(async () => {
    if (!singleItem) return;

    setDownloadState((prev) => ({
      ...prev,
      status: "saving",
      message: t("colorizer.downloadDialog.saving") || "Saving...",
      progress: { current: 0, total: 1 },
    }));

    try {
      const savedPath = await AppBackend.SaveColorizedImage(
        singleItem.base64Data,
        singleItem.fileName,
      );

      if (savedPath === "") {
        setDownloadState((prev) => ({
          ...prev,
          status: "cancelled",
          message: t("colorizer.downloadDialog.cancelled") || "Download cancelled",
        }));
        return;
      }

      setDownloadState((prev) => ({
        ...prev,
        status: "success",
        message:
          t("colorizer.downloadDialog.saved") || "Image saved successfully",
        savedFiles: [savedPath],
        progress: { current: 1, total: 1 },
      }));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to save image";
      setDownloadState((prev) => ({
        ...prev,
        status: "error",
        message: msg,
      }));
    }
  }, [singleItem, t]);

  const handleSaveMultiple = useCallback(async () => {
    if (!multipleItems || multipleItems.length === 0) return;

    const total = multipleItems.length;

    setDownloadState((prev) => ({
      ...prev,
      status: "saving",
      message: t("colorizer.downloadDialog.selectingFolder") || "Select destination folder...",
      progress: { current: 0, total },
    }));

    try {
      // First, pick the directory
      const savedPaths = await AppBackend.SaveMultipleColorizedImages(
        multipleItems.map((item) => ({
          base64Data: item.base64Data,
          fileName: item.fileName,
        })),
      );

      if (savedPaths === null || savedPaths === undefined) {
        setDownloadState((prev) => ({
          ...prev,
          status: "cancelled",
          message: t("colorizer.downloadDialog.cancelled") || "Download cancelled",
        }));
        return;
      }

      const savedCount = savedPaths.length;

      if (savedCount === 0) {
        setDownloadState((prev) => ({
          ...prev,
          status: "error",
          message:
            t("colorizer.downloadDialog.noFilesSaved") ||
            "No files could be saved",
        }));
        return;
      }

      setDownloadState((prev) => ({
        ...prev,
        status: "success",
        message:
          savedCount < total
            ? (t("colorizer.downloadDialog.savedSome", {
              count: savedCount,
              total,
            }) ||
              `Saved ${savedCount}/${total} images`)
            : (t("colorizer.downloadDialog.savedAll", {
              count: savedCount,
            }) ||
              `${savedCount} images saved successfully`),
        savedFiles: savedPaths,
        progress: { current: savedCount, total },
      }));
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to save images";
      setDownloadState((prev) => ({
        ...prev,
        status: "error",
        message: msg,
      }));
    }
  }, [multipleItems, t]);

  const handleStartDownload = useCallback(() => {
    if (isBatchMode) {
      handleSaveMultiple();
    } else {
      handleSaveSingle();
    }
  }, [isBatchMode, handleSaveMultiple, handleSaveSingle]);

  // Close and reset
  const handleClose = useCallback(() => {
    setDownloadState({
      status: "idle",
      message: "",
      savedFiles: [],
      progress: { current: 0, total: 0 },
    });
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  // Determine if we should show the action button
  const showActionButton = downloadState.status === "idle";
  const showRetryButton = downloadState.status === "error";
  const showCloseButton = ["success", "error", "cancelled"].includes(
    downloadState.status,
  );
  const isProcessing = downloadState.status === "saving";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={isProcessing ? undefined : handleClose}
    >
      <div
        className="w-full max-w-md rounded-xl shadow-2xl animate-scale-in overflow-hidden"
        style={{
          backgroundColor: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-xl)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {isBatchMode
              ? t("colorizer.downloadDialog.downloadAllTitle") ||
              "Download Colorized Images"
              : t("colorizer.downloadDialog.downloadTitle") ||
              "Download Colorized Image"}
          </h3>
          {!isProcessing && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: "var(--color-text-muted)" }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {/* Status icon */}
          <div className="flex justify-center mb-4">
            {downloadState.status === "idle" && (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: "rgba(139, 92, 246, 0.1)",
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
            )}
            {downloadState.status === "saving" && (
              <div className="relative w-16 h-16">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: "rgba(139, 92, 246, 0.1)",
                  }}
                >
                  <svg
                    className="animate-spin"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="2"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                </div>
              </div>
            )}
            {downloadState.status === "success" && (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
            )}
            {downloadState.status === "error" && (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
            )}
            {downloadState.status === "cancelled" && (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: "rgba(251, 191, 36, 0.1)",
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
            )}
          </div>

          {/* Message */}
          <div className="text-center mb-4">
            {downloadState.status === "idle" && (
              <>
                <p
                  className="text-base font-medium mb-1"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {isBatchMode
                    ? t("colorizer.downloadDialog.readyAll", {
                      count: itemCount,
                    }) || `${itemCount} images ready to download`
                    : t("colorizer.downloadDialog.ready") ||
                    "Ready to download"}
                </p>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {isBatchMode
                    ? t("colorizer.downloadDialog.selectFolderPrompt") ||
                    "Select a destination folder to save the images"
                    : t("colorizer.downloadDialog.selectLocationPrompt") ||
                    "Choose where to save the image"}
                </p>
              </>
            )}

            {downloadState.status === "saving" && (
              <>
                <p
                  className="text-base font-medium mb-1"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {isBatchMode
                    ? t("colorizer.downloadDialog.savingAll") ||
                    "Saving images..."
                    : t("colorizer.downloadDialog.saving") ||
                    "Saving image..."}
                </p>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {downloadState.message}
                </p>
                {isBatchMode && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1 px-1">
                      <span
                        style={{
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {downloadState.progress.current} /{" "}
                        {downloadState.progress.total}
                      </span>
                      <span
                        style={{
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {downloadState.progress.total > 0
                          ? Math.round(
                            (downloadState.progress.current /
                              downloadState.progress.total) *
                            100,
                          )
                          : 0}
                        %
                      </span>
                    </div>
                    <div
                      className="w-full h-2 rounded-full overflow-hidden"
                      style={{
                        backgroundColor:
                          "var(--color-surface-tertiary)",
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${downloadState.progress.total > 0
                              ? (downloadState.progress.current /
                                downloadState.progress.total) *
                              100
                              : 0
                            }%`,
                          backgroundColor:
                            "var(--color-accent)",
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {downloadState.status === "success" && (
              <>
                <p
                  className="text-base font-medium mb-1"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {t("colorizer.downloadDialog.complete") ||
                    "Download Complete!"}
                </p>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {downloadState.message}
                </p>
                {downloadState.savedFiles.length > 0 && (
                  <div className="mt-3 max-h-24 overflow-y-auto">
                    {downloadState.savedFiles.map(
                      (file, idx) => (
                        <p
                          key={idx}
                          className="text-xs truncate py-0.5"
                          style={{
                            color: "var(--color-text-muted)",
                          }}
                        >
                          {file}
                        </p>
                      ),
                    )}
                  </div>
                )}
              </>
            )}

            {downloadState.status === "error" && (
              <>
                <p
                  className="text-base font-medium mb-1"
                  style={{ color: "#ef4444" }}
                >
                  {t("colorizer.downloadDialog.failed") ||
                    "Download Failed"}
                </p>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {downloadState.message}
                </p>
              </>
            )}

            {downloadState.status === "cancelled" && (
              <>
                <p
                  className="text-base font-medium mb-1"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {t("colorizer.downloadDialog.cancelled") ||
                    "Download Cancelled"}
                </p>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t("colorizer.downloadDialog.noFilesSaved") ||
                    "No files were saved"}
                </p>
              </>
            )}
          </div>

          {/* File list for batch download (idle state) */}
          {downloadState.status === "idle" && isBatchMode && (
            <div
              className="mt-2 mb-2 max-h-32 overflow-y-auto rounded-lg p-3"
              style={{
                backgroundColor: "var(--color-surface-secondary)",
                border: "1px solid var(--color-border)",
              }}
            >
              <p
                className="text-xs font-medium mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t("colorizer.downloadDialog.filesToDownload") ||
                  "Files to download:"}
              </p>
              {multipleItems!.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 py-1"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="2"
                    className="flex-shrink-0"
                  >
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="2"
                      ry="2"
                    />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span
                    className="text-xs truncate"
                    style={{
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {item.originalName || item.fileName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: "var(--color-border)" }}
        >
          {showActionButton && (
            <button
              onClick={handleStartDownload}
              className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "white",
              }}
            >
              <span className="flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {isBatchMode
                  ? t("colorizer.downloadDialog.selectFolder") ||
                  "Select Folder"
                  : t("colorizer.downloadDialog.saveAs") ||
                  "Save As..."}
              </span>
            </button>
          )}

          {showRetryButton && (
            <button
              onClick={handleStartDownload}
              className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "white",
              }}
            >
              <span className="flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                {t("common.retry") || "Retry"}
              </span>
            </button>
          )}

          {showCloseButton && (
            <button
              onClick={handleClose}
              className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: "var(--color-surface-tertiary)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)",
              }}
            >
              {t("common.close") || "Close"}
            </button>
          )}

          {isProcessing && (
            <button
              disabled
              className="px-6 py-2 rounded-lg text-sm font-semibold opacity-60 cursor-not-allowed"
              style={{
                backgroundColor: "var(--color-surface-tertiary)",
                color: "var(--color-text-muted)",
              }}
            >
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                {t("colorizer.downloadDialog.saving") || "Saving..."}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DownloadDialog;
