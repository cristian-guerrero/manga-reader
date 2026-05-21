/**
 * ExplorerPage - File and folder explorer
 * Refactored to use custom hooks for better separation of concerns
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useNavigation } from "@hooks";
import { useThumbnails } from "@hooks/useThumbnails";
import {
  Tooltip,
  SortControls,
  GridItem,
  GridContainer,
  SearchBar,
  Breadcrumb,
  MediaTile,
  ContextMenu,
  useToast,
} from "@shared/components";
import type { ContextMenuItem } from "@types";
import { AppAPI } from "@services/api/appAPI";
import { FolderOrderAPI } from "@services/api/folderOrderAPI";
import {
  useExplorerState,
  useExplorerSorting,
  useExplorerLoading,
  useExplorerSearch,
  useExplorerNavigation,
  useExplorerRestoration,
  useExplorerDragAndDrop,
  useExplorerView,
} from "./hooks";
import { BaseFolder, ExplorerEntry } from "./types";
import { DirectoryView } from "./components/DirectoryView";
import { GridIcon, ListIcon } from "./components/ExplorerIcons";

// Icons
const TrashIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

interface ExplorerPageProps {
  isActive?: boolean;
  tabId?: string;
}

export function ExplorerPage({ isActive = true, tabId }: ExplorerPageProps) {
  const { t } = useTranslation();
  const {
    navigate,
    explorerState,
    setExplorerState,
    previousPage,
    fromPage,
    params,
    setParams,
  } = useNavigation();
  const { showToast } = useToast();
  const { thumbnails, loadThumbnail, initializeThumbnails } = useThumbnails(10);

  // Use explorer state hook
  const explorerStateHook = useExplorerState({ tabId, isActive });

  // Ref to break circular dep between sorting (needs loadDirectory) and loading (needs sortBy)
  const loadDirRef = useRef<(path: string, pushHistory?: boolean, sortMode?: string, sortOrder?: string) => Promise<void>>(
    () => Promise.resolve()
  );

  // Use sorting hook
  const sorting = useExplorerSorting({
    currentPath: explorerStateHook.currentPath,
    onSortReady: useCallback((path: string | null, sortBy: string, sortOrder: string) => {
      if (path === explorerStateHook.currentPath && path) {
        loadDirRef.current?.(path, false, sortBy, sortOrder);
      }
    }, [explorerStateHook.currentPath]),
  });

  // Title change handler
  const [currentTitle, setCurrentTitle] = useState(
    t("explorer.title") || "Explorer",
  );
  const handleTitleChange = useCallback((title: string) => {
    setCurrentTitle(title);
  }, []);

  // Path change handler
  const handlePathChange = useCallback(
    (path: string | null) => {
      explorerStateHook.setCurrentPath(path);
    },
    [explorerStateHook],
  );

  // Use loading hook
  const loading = useExplorerLoading({
    tabId,
    currentPath: explorerStateHook.currentPath,
    currentPathRef: explorerStateHook.currentPathRef,
    initializeThumbnails,
    onPathChange: handlePathChange,
    onTitleChange: handleTitleChange,
    sortBy: sorting.sortBy,
    sortOrder: sorting.sortOrder,
  });
  loadDirRef.current = loading.loadDirectory;

  const [pinnedFolders, setPinnedFolders] = useState<string[]>([]);

  useEffect(() => {
    if (!explorerStateHook.currentPath) {
      setPinnedFolders([]);
      return;
    }
    FolderOrderAPI.getPinnedFolders(explorerStateHook.currentPath, sorting.sortBy)
      .then(setPinnedFolders)
      .catch(() => setPinnedFolders([]));
  }, [explorerStateHook.currentPath, sorting.sortBy]);

  const [justPinned, setJustPinned] = useState<string | null>(null);

  const handlePinFolder = useCallback(async (entryName: string) => {
    if (!explorerStateHook.currentPath) return;
    await FolderOrderAPI.pinFolder(explorerStateHook.currentPath, sorting.sortBy, entryName);
    const updated = await FolderOrderAPI.getPinnedFolders(explorerStateHook.currentPath, sorting.sortBy);
    setPinnedFolders(updated);
    setJustPinned(entryName);
    setTimeout(() => setJustPinned(null), 500);
    const items = await AppAPI.exploreFolder(explorerStateHook.currentPath, sorting.sortBy, sorting.sortOrder);
    loading.setEntries(items || []);
  }, [explorerStateHook.currentPath, sorting.sortBy, sorting.sortOrder, loading.setEntries]);

  const handleUnpinFolder = useCallback(async (entryName: string) => {
    if (!explorerStateHook.currentPath) return;
    await FolderOrderAPI.unpinFolder(explorerStateHook.currentPath, sorting.sortBy, entryName);
    const updated = await FolderOrderAPI.getPinnedFolders(explorerStateHook.currentPath, sorting.sortBy);
    setPinnedFolders(updated);
    const items = await AppAPI.exploreFolder(explorerStateHook.currentPath, sorting.sortBy, sorting.sortOrder);
    loading.setEntries(items || []);
  }, [explorerStateHook.currentPath, sorting.sortBy, sorting.sortOrder, loading.setEntries]);

  const isPinned = useCallback((entryName: string) => {
    return pinnedFolders.includes(entryName);
  }, [pinnedFolders]);

  // Use search hook
  const search = useExplorerSearch({
    baseFolders: loading.baseFolders,
    entries: loading.entries,
    sortBy: sorting.sortBy,
    sortOrder: sorting.sortOrder,
    pinnedFolders,
  });

  // Use navigation hook
  const navigation = useExplorerNavigation({
    tabId,
    currentPath: explorerStateHook.currentPath,
    pathHistory: explorerStateHook.pathHistory,
    baseFolders: loading.baseFolders,
    entries: loading.entries,
    sortedEntries: search.sortedEntries,
    setCurrentPath: explorerStateHook.setCurrentPath,
    setPathHistory: explorerStateHook.setPathHistory,
    setEntries: loading.setEntries,
    loadDirectory: loading.loadDirectory,
    loadBaseFolders: loading.loadBaseFolders,
    setExplorerState,
    navigate,
    onTitleChange: handleTitleChange,
    onSearchClear: () => search.setSearchQuery(''),
    onAutoPromote: (parentPath, entryName, allDirNames) => {
      FolderOrderAPI.promoteToAutoOrder(parentPath, entryName, allDirNames).catch(err => {
        console.error('Failed to promote to auto order:', err);
      });
    },
  });

  // Reload directory when sortBy or sortOrder changes in modes requiring backend sort
  const prevSortByRef = useRef(sorting.sortBy);
  const prevSortOrderRef = useRef(sorting.sortOrder);
  useEffect(() => {
    const prevBy = prevSortByRef.current;
    const prevOrder = prevSortOrderRef.current;
    const byChanged = prevBy !== sorting.sortBy;
    const orderChanged = prevOrder !== sorting.sortOrder;
    prevSortByRef.current = sorting.sortBy;
    prevSortOrderRef.current = sorting.sortOrder;
    if (!byChanged && !orderChanged) return;
    const path = explorerStateHook.currentPath;
    if (path && (sorting.sortBy === 'auto' || sorting.sortBy === 'custom')) {
      loading.loadDirectory(path, false);
    }
  }, [sorting.sortBy, sorting.sortOrder, explorerStateHook.currentPath, loading.loadDirectory]);

  // Use view mode hook (includes grid item size)
  const { viewMode, setViewMode, gridItemSize, setGridItemSize } = useExplorerView(explorerStateHook.currentPath);

  // Use drag-and-drop hook (for custom folder ordering and pinned folder reordering)
  const dnd = useExplorerDragAndDrop({
    parentPath: explorerStateHook.currentPath,
    entries: loading.entries,
    onEntriesChange: loading.setEntries,
    onSortModeChange: (mode) => {
      if (mode !== sorting.sortBy) {
        sorting.setSortBy(mode as 'name' | 'date' | 'custom' | 'auto');
      }
    },
    sortOrder: sorting.sortOrder,
    pinnedFolders,
    sortMode: sorting.sortBy,
    onPinnedOrderChange: setPinnedFolders,
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const isInCustomMode = sorting.sortBy === 'custom' && !search.searchQuery.trim();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    entry: ExplorerEntry;
  } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, entry: ExplorerEntry) => {
      if (!entry.isDirectory) return;
      setContextMenu({ x: e.clientX, y: e.clientY, entry });
    },
    [],
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const contextMenuItems: ContextMenuItem[] = contextMenu
    ? [
        // Pin/Unpin for directories
        ...(contextMenu.entry.isDirectory
          ? [
              isPinned(contextMenu.entry.name)
                ? {
                    id: 'unpin-folder',
                    label: t('explorer.unpinFolder'),
                    onClick: () => handleUnpinFolder(contextMenu.entry.name),
                  } as ContextMenuItem
                : {
                    id: 'pin-folder',
                    label: t('explorer.pinFolder'),
                    onClick: () => handlePinFolder(contextMenu.entry.name),
                  } as ContextMenuItem,
            ]
          : []),
        // "Open in One Shot": only for leaf directories with images
        ...(contextMenu.entry.subdirectoryCount === 0 && contextMenu.entry.hasImages
          ? [
              {
                id: 'send-to-one-shot',
                label: t('explorer.sendToOneShot'),
                onClick: () =>
                  AppAPI.addFolder(contextMenu.entry.path).then(result => {
                    if (result) navigate('viewer', { folder: result.path }, 'oneShot');
                  }),
              } as ContextMenuItem,
            ]
          : []),
        // "Open in Series": only for directories with subfolders
        ...(contextMenu.entry.subdirectoryCount > 0
          ? [
              {
                id: 'send-to-series',
                label: t('explorer.sendToSeries'),
                onClick: () =>
                  AppAPI.addFolder(contextMenu.entry.path).then(result => {
                    if (result) {
                      if (result.isSeries) {
                        navigate('series-details', { series: result.path }, 'series');
                      } else {
                        navigate('viewer', { folder: result.path }, 'oneShot');
                      }
                    }
                  }),
              } as ContextMenuItem,
            ]
          : []),
        // "Open in Colorizer": only for leaf directories with images
        ...(contextMenu.entry.subdirectoryCount === 0 && contextMenu.entry.hasImages
          ? [
              {
                id: 'open-in-colorizer',
                label: t('explorer.openInColorizer'),
                onClick: () =>
                  navigate('colorizer', {
                    folderPath: contextMenu.entry.path,
                  }),
              } as ContextMenuItem,
            ]
          : []),
        // Always show "Open in File Manager"
        {
          id: 'open-in-file-manager',
          label: t('explorer.openInFileManager'),
          onClick: () =>
            AppAPI.openInFileManager(contextMenu.entry.path),
        },
      ]
    : [];

  // Use restoration hook
  useExplorerRestoration({
    tabId,
    isActive,
    explorerState,
    previousPage,
    fromPage,
    params,
    setParams,
    loadDirectory: loading.loadDirectory,
    setCurrentPath: explorerStateHook.setCurrentPath,
    setPathHistory: explorerStateHook.setPathHistory,
    setEntries: loading.setEntries,
    loadBaseFolders: loading.loadBaseFolders,
  });

  return (
    <div
      className="h-full p-6 flex flex-col"
      style={{ backgroundColor: "var(--color-surface-primary)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {explorerStateHook.currentPath && (
            <Tooltip content={t("common.back")} placement="right">
              <button
                onClick={navigation.handleBack}
                className="p-2 rounded-full hover:bg-white/10 transition-all opacity-100 translate-x-0 flex-shrink-0"
                aria-label={t("common.back")}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            </Tooltip>
          )}

          {/* Breadcrumb */}
          <div className="flex-1 min-w-0">
            <Breadcrumb
              currentPath={explorerStateHook.currentPath}
              baseFolders={loading.baseFolders}
              onNavigate={navigation.handleBreadcrumbClick}
              onAuxClick={navigation.handleBreadcrumbAuxClick}
            />
          </div>

          {/* Sort Controls */}
          <div className="flex-shrink-0 ml-8">
            <SortControls
              sortBy={sorting.sortBy}
              sortOrder={sorting.sortOrder}
              onSortByChange={(value) => {
                const newMode = value as "name" | "date" | "custom" | "auto";
                sorting.setSortBy(newMode);
                if (explorerStateHook.currentPath && (newMode === 'auto' || newMode === 'custom')) {
                  loading.loadDirectory(explorerStateHook.currentPath, false, newMode);
                }
              }}
              onSortOrderChange={() => {
                sorting.setSortOrder((prev) =>
                  prev === "asc" ? "desc" : "asc",
                );
              }}
              options={[
                { value: "name", label: t("common.name") },
                { value: "date", label: t("common.date") },
                { value: "auto", label: t("explorer.automaticOrder") },
                { value: "custom", label: t("explorer.customOrder") },
              ]}
              show={Boolean(
                (!explorerStateHook.currentPath &&
                  loading.baseFolders.length > 0) ||
                (explorerStateHook.currentPath && loading.entries.length > 0),
              )}
            />
          </div>

          {/* View Mode Toggle */}
          {explorerStateHook.currentPath && loading.entries.length > 0 && (
            <div className="flex items-center bg-surface-tertiary rounded-lg p-1 border border-white/5 ml-4 flex-shrink-0">
              <Tooltip content={t('explorer.gridView') || 'Grid View'} placement="bottom">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                  }`}
                >
                  <GridIcon />
                </button>
              </Tooltip>
              <Tooltip content={t('explorer.listView') || 'List View'} placement="bottom">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'list'
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

        {!explorerStateHook.currentPath && (
          <button
            onClick={navigation.handleAddBaseFolder}
            className="btn-primary transition-transform hover:scale-105 active:scale-95 ml-6"
          >
            <span className="mr-2">+</span>
            {t("explorer.addBaseFolder")}
          </button>
        )}
      </div>

      {/* Search Bar & Grid Size Slider */}
      {((!explorerStateHook.currentPath && loading.baseFolders.length > 0) ||
        (explorerStateHook.currentPath && loading.entries.length > 0)) && (
        <div className="mb-4 flex items-center gap-4">
          <SearchBar
            placeholder={t("explorer.searchPlaceholder") || "Search by name..."}
            onSearch={search.setSearchQuery}
            className="max-w-md"
          />
          {viewMode === 'grid' && explorerStateHook.currentPath && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-text-secondary whitespace-nowrap">
                {t('explorer.gridItemSize')}
              </span>
              <input
                type="range"
                min={120}
                max={400}
                step={10}
                value={gridItemSize}
                onChange={(e) => setGridItemSize(Number(e.target.value))}
                onDoubleClick={() => setGridItemSize(200)}
                className="w-24 h-1.5 bg-surface-tertiary rounded-full appearance-none cursor-pointer accent-accent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <span className="text-xs text-text-secondary w-8 text-right tabular-nums">
                {gridItemSize}px
              </span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div
        className="flex-1 overflow-auto pr-2"
        key={explorerStateHook.currentPath || "root"}
      >
        {/* Base Folders View */}
        {!explorerStateHook.currentPath && (
          <GridContainer>
            {search.sortedBaseFolders.map((folder) => (
              <GridItem key={folder.path}>
                <MediaTile
                  id={folder.path}
                  name={folder.name}
                  thumbnail={folder.thumbnailUrl || thumbnails[folder.path]}
                  onClick={() => navigation.handleItemClick(folder)}
                  onAuxClick={(e) => navigation.handleItemAuxClick(e, folder)}
                  onVisible={async () => {
                    if (
                      !folder.hasImages ||
                      folder.thumbnailUrl ||
                      thumbnails[folder.path]
                    )
                      return;
                    try {
                      const folderInfo = await AppAPI.getFolderInfoShallow(
                        folder.path,
                      );
                      if (folderInfo && folderInfo.coverImage) {
                        await loadThumbnail(folder.path, folderInfo.coverImage);
                      }
                    } catch (error) {
                      console.error(
                        "Failed to load thumbnail for folder:",
                        folder.path,
                        error,
                      );
                    }
                  }}
                  onSecondaryAction={(e) =>
                    navigation.handleRemoveBaseFolder(folder.path, e)
                  }
                  secondaryActionIcon={<TrashIcon />}
                  secondaryActionLabel={t("common.remove")}
                  fallbackIcon={
                    <div className="p-4 rounded-xl bg-accent/10 text-accent">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                  }
                  footerLeft={
                    <Tooltip content={folder.path}>
                      <p className="text-xs text-white/50 truncate mt-1 font-mono">
                        {folder.path}
                      </p>
                    </Tooltip>
                  }
                />
              </GridItem>
            ))}
          </GridContainer>
        )}

        {/* Directory View */}
        {explorerStateHook.currentPath && (
          <DirectoryView
            entries={search.sortedEntries}
            thumbnails={thumbnails}
            isCustomMode={isInCustomMode}
            directoryEntries={dnd.directoryEntries}
            sensors={sensors}
            viewMode={viewMode}
            gridItemSize={gridItemSize}
            onDragStart={dnd.handleDragStart}
            onDragEnd={dnd.handleDragEnd}
            activeEntry={dnd.activeEntry}
            onItemClick={navigation.handleItemClick}
            onItemAuxClick={navigation.handleItemAuxClick}
            onItemContextMenu={handleContextMenu}
            onLoadThumbnail={loadThumbnail}
            onOpenViewer={navigation.handleOpenInViewer}
            pinnedFolders={pinnedFolders}
            justPinned={justPinned}
            hasPinnedFolders={pinnedFolders.length > 0}
          />
        )}

        {!explorerStateHook.currentPath && loading.baseFolders.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
            <svg
              className="w-24 h-24 mb-4 text-surface-tertiary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-lg">{t("explorer.noFoldersAdded")}</p>
            <p className="text-sm mt-1">{t("explorer.addFolderToStart")}</p>
          </div>
        )}

        {/* No results message */}
        {((!explorerStateHook.currentPath &&
          search.sortedBaseFolders.length === 0 &&
          loading.baseFolders.length > 0 &&
          search.searchQuery.trim()) ||
          (explorerStateHook.currentPath &&
            search.sortedEntries.length === 0 &&
            loading.entries.length > 0 &&
            search.searchQuery.trim())) && (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
            <svg
              className="w-16 h-16 mb-4 text-surface-tertiary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <p className="text-lg">
              {t("explorer.noResultsFound") || "No results found"}
            </p>
            <p className="text-sm mt-1">
              {t("explorer.tryDifferentSearch") ||
                `Try a different search term`}
            </p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          items={contextMenuItems}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
}

export default ExplorerPage;
