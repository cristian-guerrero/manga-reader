import { useTranslation } from "react-i18next";
import { SearchBar } from "@shared/components";

interface ExplorerToolbarProps {
  currentPath: string | null;
  hasContent: boolean;
  isRecentView: boolean;
  isGridView: boolean;
  gridItemSize: number;
  onSearch: (query: string) => void;
  onClearRecent: () => void;
  onGridSizeChange: (size: number) => void;
}

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export function ExplorerToolbar({
  currentPath,
  hasContent,
  isRecentView,
  isGridView,
  gridItemSize,
  onSearch,
  onClearRecent,
  onGridSizeChange,
}: ExplorerToolbarProps) {
  const { t } = useTranslation();

  if (!hasContent) {
    return null;
  }

  return (
    <div className="mb-2 sm:mb-4 flex items-center gap-2 flex-wrap">
      <SearchBar
        placeholder={t("explorer.searchPlaceholder") || "Search by name..."}
        onSearch={onSearch}
        className="flex-1 min-w-0 sm:max-w-md hidden sm:block"
      />
      {isRecentView && (
        <button
          onClick={onClearRecent}
          className="text-sm px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex-shrink-0 hidden sm:inline-flex items-center gap-1"
        >
          <TrashIcon />
          {t("explorer.clearRecent")}
        </button>
      )}
      {isGridView && currentPath && (
        <div className="flex items-center gap-2 ml-auto hidden sm:flex">
          <span className="text-xs text-text-secondary whitespace-nowrap">
            {t('explorer.gridItemSize')}
          </span>
          <input
            type="range"
            min={120}
            max={400}
            step={10}
            value={gridItemSize}
            onChange={(e) => onGridSizeChange(Number(e.target.value))}
            onDoubleClick={() => onGridSizeChange(200)}
            className="w-24 h-1.5 bg-surface-tertiary rounded-full appearance-none cursor-pointer accent-accent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <span className="text-xs text-text-secondary w-8 text-right tabular-nums">
            {gridItemSize}px
          </span>
        </div>
      )}
    </div>
  );
}
