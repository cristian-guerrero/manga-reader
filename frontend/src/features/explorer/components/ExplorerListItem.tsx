import { useTranslation } from "react-i18next";
import { Tooltip } from "@shared/components";
import type { ExplorerEntry } from "../types";

interface ExplorerListItemProps {
    entry: ExplorerEntry;
    thumbnail?: string;
    onClick?: () => void;
    onAuxClick?: (e: React.MouseEvent) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    onOpenViewer?: (path: string, e: React.MouseEvent) => void;
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

export function ExplorerListItem({
    entry,
    thumbnail,
    onClick,
    onAuxClick,
    onContextMenu,
    onOpenViewer,
}: ExplorerListItemProps) {
    const { t } = useTranslation();

    const infoText = entry.isDirectory
        ? entry.hasImages
            ? `${entry.imageCount} ${t("explorer.images")}${entry.subdirectoryCount > 0 ? ` \u00B7 ${entry.subdirectoryCount} ${t("explorer.subfolders")}` : ""}`
            : entry.subdirectoryCount > 0
                ? `${entry.subdirectoryCount} ${t("explorer.subfolders")}`
                : t("explorer.folder")
        : `${formatFileSize(entry.size)} \u00B7 ${t("explorer.file")}`;

    return (
        <div
            onClick={onClick}
            onMouseDown={(e) => {
                if (e.button === 1) e.preventDefault();
            }}
            onAuxClick={(e) => onAuxClick?.(e)}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu?.(e);
            }}
            className="group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all hover:border-accent hover-lift"
            style={{
                backgroundColor: "var(--color-surface-secondary)",
                border: "1px solid var(--color-border)",
            }}
        >
            {/* Thumbnail */}
            <div
                className="relative w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-surface-tertiary"
            >
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt={entry.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-accent/40">
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                        >
                            {entry.isDirectory ? (
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            ) : (
                                <>
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </>
                            )}
                        </svg>
                    </div>
                )}

                {/* Play overlay on hover */}
                <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
                >
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                        style={{ backgroundColor: "var(--color-accent)", color: "white" }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <Tooltip content={entry.name} className="w-full">
                    <h3
                        className="font-semibold truncate w-full min-w-0 text-sm"
                        style={{ color: "var(--color-text-primary)" }}
                    >
                        {entry.name}
                    </h3>
                </Tooltip>

                <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--color-text-muted)" }}
                >
                    {infoText}
                </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
                {entry.hasImages && onOpenViewer && (
                    <Tooltip content={t("explorer.openInViewer")} placement="left">
                        <button
                            onClick={(e) => onOpenViewer(entry.path, e)}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-accent/10 active:scale-90"
                            style={{
                                backgroundColor: "var(--color-surface-tertiary)",
                                color: "var(--color-accent)",
                            }}
                            aria-label={t("explorer.openInViewer")}
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </button>
                    </Tooltip>
                )}
            </div>
        </div>
    );
}
