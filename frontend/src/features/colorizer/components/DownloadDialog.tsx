import { useTranslation } from "react-i18next";
import type { DownloadItem, DownloadState } from "../types";

interface DownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  state: DownloadState;
  onStartDownload: () => void;
  singleItem?: DownloadItem;
  multipleItems?: DownloadItem[];
}

export function DownloadDialog({
  isOpen,
  onClose,
  state,
  onStartDownload,
  singleItem,
  multipleItems,
}: DownloadDialogProps) {
  const { t } = useTranslation();

  const isBatchMode = !!multipleItems && multipleItems.length > 0;
  const isProcessing = state.status === "saving";
  const showActionButton = state.status === "idle";
  const showRetryButton = state.status === "error";
  const showCloseButton = ["success", "error", "cancelled"].includes(state.status);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
      onClick={isProcessing ? undefined : onClose}
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
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {isBatchMode
              ? t("colorizer.downloadDialog.downloadAllTitle") || "Download Colorized Images"
              : t("colorizer.downloadDialog.downloadTitle") || "Download Colorized Image"}
          </h3>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: "var(--color-text-muted)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <div className="px-6 py-6">
          <div className="flex justify-center mb-4">
            <StatusIcon status={state.status} />
          </div>

          <div className="text-center mb-4">
            <StatusMessage
              status={state.status}
              isBatchMode={isBatchMode}
              itemCount={multipleItems?.length || 1}
              message={state.message}
              savedFiles={state.savedFiles}
              progress={state.progress}
            />
          </div>

          {state.status === "idle" && isBatchMode && multipleItems && (
            <div
              className="mt-2 mb-2 max-h-32 overflow-y-auto rounded-lg p-3"
              style={{
                backgroundColor: "var(--color-surface-secondary)",
                border: "1px solid var(--color-border)",
              }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>
                {t("colorizer.downloadDialog.filesToDownload") || "Files to download:"}
              </p>
              {multipleItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 py-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" className="flex-shrink-0">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>
                    {item.fileName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: "var(--color-border)" }}
        >
          {showActionButton && (
            <button
              onClick={onStartDownload}
              className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: "var(--color-accent)", color: "white" }}
            >
              <span className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {isBatchMode
                  ? t("colorizer.downloadDialog.selectFolder") || "Select Folder"
                  : t("colorizer.downloadDialog.saveAs") || "Save As..."}
              </span>
            </button>
          )}

          {showRetryButton && (
            <button
              onClick={onStartDownload}
              className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: "var(--color-accent)", color: "white" }}
            >
              <span className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                {t("common.retry") || "Retry"}
              </span>
            </button>
          )}

          {showCloseButton && (
            <button
              onClick={onClose}
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
              style={{ backgroundColor: "var(--color-surface-tertiary)", color: "var(--color-text-muted)" }}
            >
              <span className="flex items-center gap-2">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

function StatusIcon({ status }: { status: DownloadState["status"] }) {
  const bgColor = status === "success" ? "rgba(34, 197, 94, 0.1)"
    : status === "error" ? "rgba(239, 68, 68, 0.1)"
    : status === "cancelled" ? "rgba(251, 191, 36, 0.1)"
    : "rgba(139, 92, 246, 0.1)";

  return (
    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: bgColor }}>
      {status === "idle" && (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )}
      {status === "saving" && (
        <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      )}
      {status === "success" && (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )}
      {status === "error" && (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      )}
      {status === "cancelled" && (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
    </div>
  );
}

function StatusMessage({
  status, isBatchMode, itemCount, message, savedFiles, progress,
}: {
  status: DownloadState["status"];
  isBatchMode: boolean;
  itemCount: number;
  message: string;
  savedFiles: string[];
  progress: { current: number; total: number };
}) {
  const { t } = useTranslation();

  return (
    <>
      {status === "idle" && (
        <>
          <p className="text-base font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
            {isBatchMode
              ? t("colorizer.downloadDialog.readyAll", { count: itemCount }) || `${itemCount} images ready to download`
              : t("colorizer.downloadDialog.ready") || "Ready to download"}
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {isBatchMode
              ? t("colorizer.downloadDialog.selectFolderPrompt") || "Select a destination folder to save the images"
              : t("colorizer.downloadDialog.selectLocationPrompt") || "Choose where to save the image"}
          </p>
        </>
      )}

      {status === "saving" && (
        <>
          <p className="text-base font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
            {isBatchMode
              ? t("colorizer.downloadDialog.savingAll") || "Saving images..."
              : t("colorizer.downloadDialog.saving") || "Saving image..."}
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{message}</p>
          {isBatchMode && (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1 px-1">
                <span style={{ color: "var(--color-text-muted)" }}>
                  {progress.current} / {progress.total}
                </span>
                <span style={{ color: "var(--color-text-muted)" }}>
                  {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-tertiary)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                    backgroundColor: "var(--color-accent)",
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {status === "success" && (
        <>
          <p className="text-base font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
            {t("colorizer.downloadDialog.complete") || "Download Complete!"}
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{message}</p>
          {savedFiles.length > 0 && (
            <div className="mt-3 max-h-24 overflow-y-auto">
              {savedFiles.map((file, idx) => (
                <p key={idx} className="text-xs truncate py-0.5" style={{ color: "var(--color-text-muted)" }}>{file}</p>
              ))}
            </div>
          )}
        </>
      )}

      {status === "error" && (
        <>
          <p className="text-base font-medium mb-1" style={{ color: "#ef4444" }}>
            {t("colorizer.downloadDialog.failed") || "Download Failed"}
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{message}</p>
        </>
      )}

      {status === "cancelled" && (
        <>
          <p className="text-base font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
            {t("colorizer.downloadDialog.cancelled") || "Download Cancelled"}
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {t("colorizer.downloadDialog.noFilesSaved") || "No files were saved"}
          </p>
        </>
      )}
    </>
  );
}

export default DownloadDialog;
