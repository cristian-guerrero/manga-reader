import { useTranslation } from "react-i18next";
import {
  Tooltip,
  SortControls,
  Breadcrumb,
} from "@shared/components";
import type { BaseFolder } from "../types";
import { GridIcon, ListIcon } from "./ExplorerIcons";

interface ExplorerHeaderProps {
  headerVisible: boolean;
  currentPath: string | null;
  baseFolders: BaseFolder[];
  forwardHistoryLength: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  showSortControls: boolean;
  showViewToggle: boolean;
  showAddFolder: boolean;
  resolvedViewMode: 'grid' | 'list';
  onBack: () => void;
  onForward: () => void;
  onBreadcrumbClick: (path: string | null) => void;
  onBreadcrumbAuxClick: (e: React.MouseEvent, path: string | null, name: string) => void;
  onSortByChange: (value: string) => void;
  onSortOrderChange: () => void;
  onAddBaseFolder: () => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function ExplorerHeader({
  headerVisible,
  currentPath,
  baseFolders,
  forwardHistoryLength,
  sortBy,
  sortOrder,
  showSortControls,
  showViewToggle,
  showAddFolder,
  resolvedViewMode,
  onBack,
  onForward,
  onBreadcrumbClick,
  onBreadcrumbAuxClick,
  onSortByChange,
  onSortOrderChange,
  onAddBaseFolder,
  onViewModeChange,
}: ExplorerHeaderProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex items-center justify-between mb-2 sm:mb-6 flex-shrink-0 flex-wrap gap-2 transition-all duration-300 sm:opacity-100 sm:translate-y-0"
      style={{
        opacity: headerVisible ? 1 : 0,
        transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)',
        pointerEvents: headerVisible ? 'auto' : 'none',
      }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {currentPath && (
          <>
            <Tooltip content={t("common.back")} placement="right">
              <button
                onClick={onBack}
                className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-all opacity-100 translate-x-0 flex-shrink-0"
                aria-label={t("common.back")}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            </Tooltip>
            <Tooltip content={t("common.forward")} placement="right">
              <button
                onClick={onForward}
                disabled={forwardHistoryLength === 0}
                className={`p-1.5 sm:p-2 rounded-full transition-all flex-shrink-0 ${
                  forwardHistoryLength === 0
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-white/10'
                }`}
                aria-label={t("common.forward")}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </Tooltip>
          </>
        )}

        {/* Title (root) or Breadcrumb (inside directory) */}
        {currentPath ? (
          <div className="min-w-0 flex-1">
            <Breadcrumb
              currentPath={currentPath}
              baseFolders={baseFolders}
              onNavigate={onBreadcrumbClick}
              onAuxClick={onBreadcrumbAuxClick}
            />
          </div>
        ) : (
          <h1 className="text-2xl font-bold text-gradient">
            {t("explorer.title")}
          </h1>
        )}

        {!currentPath && (
          <>
            <Tooltip content={t("common.forward")} placement="right">
              <button
                onClick={onForward}
                disabled={forwardHistoryLength === 0}
                className={`p-1.5 sm:p-2 rounded-full transition-all flex-shrink-0 ${
                  forwardHistoryLength === 0
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-white/10'
                }`}
                aria-label={t("common.forward")}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </Tooltip>
            <div className="flex-1" />
          </>
        )}

        {/* Sort Controls */}
        <div className="flex-shrink-0 ml-4 sm:ml-8 hidden sm:block">
          <SortControls
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortByChange={onSortByChange}
            onSortOrderChange={onSortOrderChange}
            options={[
              { value: "name", label: t("common.name") },
              { value: "date", label: t("common.date") },
              { value: "auto", label: t("explorer.automaticOrder") },
              { value: "custom", label: t("explorer.customOrder") },
            ]}
            show={showSortControls}
          />
        </div>

        {/* View Mode Toggle */}
        {showViewToggle && (
          <div className="flex items-center bg-surface-tertiary rounded-lg p-1 border border-white/5 ml-2 sm:ml-4 flex-shrink-0 hidden sm:flex">
            <Tooltip content={t('explorer.gridView') || 'Grid View'} placement="bottom">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`p-1.5 rounded transition-colors ${
                  resolvedViewMode === 'grid'
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                }`}
              >
                <GridIcon />
              </button>
            </Tooltip>
            <Tooltip content={t('explorer.listView') || 'List View'} placement="bottom">
              <button
                onClick={() => onViewModeChange('list')}
                className={`p-1.5 rounded transition-colors ${
                  resolvedViewMode === 'list'
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                }`}
              >
                <ListIcon />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {showAddFolder && (
        <button
          onClick={onAddBaseFolder}
          className="btn-primary transition-transform hover:scale-105 active:scale-95 ml-2 sm:ml-6 text-sm px-3 py-1.5 hidden sm:inline-flex"
        >
          <span className="mr-2">+</span>
          {t("explorer.addBaseFolder")}
        </button>
      )}
    </div>
  );
}
