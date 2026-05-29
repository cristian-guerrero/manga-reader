/**
 * ExplorerPage - File and folder explorer
 * Refactored to use custom hooks for better separation of concerns
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useMobileScroll } from "@contexts/MobileScrollContext";
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
import { ImageOrderAPI } from "@services/api/imageOrderAPI";
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
import { FolderNavigationBar } from "./components/FolderNavigationBar";
import { GridIcon, ListIcon } from "./components/ExplorerIcons";
import { ExplorerAPI, FolderNavigation } from "@services/api/explorerAPI";

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
  const { headerVisible } = useMobileScroll();
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

  const [pinnedImages, setPinnedImages] = useState<string[]>([]);

  useEffect(() => {
    if (!explorerStateHook.currentPath) {
      setPinnedImages([]);
      return;
    }
    ImageOrderAPI.getPinnedImages(explorerStateHook.currentPath, sorting.sortBy)
      .then(setPinnedImages)
      .catch(() => setPinnedImages([]));
  }, [explorerStateHook.currentPath, sorting.sortBy]);

  const [justPinnedImage, setJustPinnedImage] = useState<string | null>(null);

  const handlePinImage = useCallback(async (imageName: string) => {
    if (!explorerStateHook.currentPath) return;
    console.log('[PinImage] Pinning:', imageName, 'in', explorerStateHook.currentPath);
    await ImageOrderAPI.pinImage(explorerStateHook.currentPath, sorting.sortBy, imageName);
    const updated = await ImageOrderAPI.getPinnedImages(explorerStateHook.currentPath, sorting.sortBy);
    console.log('[PinImage] Updated pinned images:', updated);
    setPinnedImages(updated);
    setJustPinnedImage(imageName);
    setTimeout(() => setJustPinnedImage(null), 500);
    loading.setEntries((prev) => {
      const pinned = new Set(updated);
      const dirs = prev.filter((e) => e.isDirectory);
      const images = prev.filter((e) => !e.isDirectory);
      const pinnedImgs = images.filter((e) => pinned.has(e.name));
      const unpinnedImgs = images.filter((e) => !pinned.has(e.name));
      console.log('[PinImage] Reordering entries:', { dirs: dirs.length, pinnedImgs: pinnedImgs.map(e => e.name), unpinnedImgs: unpinnedImgs.length });
      return [...dirs, ...pinnedImgs, ...unpinnedImgs];
    });
  }, [explorerStateHook.currentPath, sorting.sortBy, loading.setEntries]);

  const handleUnpinImage = useCallback(async (imageName: string) => {
    if (!explorerStateHook.currentPath) return;
    await ImageOrderAPI.unpinImage(explorerStateHook.currentPath, sorting.sortBy, imageName);
    const updated = await ImageOrderAPI.getPinnedImages(explorerStateHook.currentPath, sorting.sortBy);
    setPinnedImages(updated);
    loading.setEntries((prev) => {
      const pinned = new Set(updated);
      const dirs = prev.filter((e) => e.isDirectory);
      const images = prev.filter((e) => !e.isDirectory);
      const pinnedImgs = images.filter((e) => pinned.has(e.name));
      const unpinnedImgs = images.filter((e) => !pinned.has(e.name));
      return [...dirs, ...pinnedImgs, ...unpinnedImgs];
    });
  }, [explorerStateHook.currentPath, sorting.sortBy, loading.setEntries]);

  const isImagePinned = useCallback((imageName: string) => {
    return pinnedImages.includes(imageName);
  }, [pinnedImages]);

  // Use search hook
  const search = useExplorerSearch({
    baseFolders: loading.baseFolders,
    entries: loading.entries,
    sortBy: sorting.sortBy,
    sortOrder: sorting.sortOrder,
    pinnedFolders,
    pinnedImages,
    currentPath: explorerStateHook.currentPath,
  });

  // Use navigation hook
  const navigation = useExplorerNavigation({
    tabId,
    currentPath: explorerStateHook.currentPath,
    pathHistory: explorerStateHook.pathHistory,
    forwardHistory: explorerStateHook.forwardHistory,
    baseFolders: loading.baseFolders,
    entries: loading.entries,
    sortedEntries: search.sortedEntries,
    setCurrentPath: explorerStateHook.setCurrentPath,
    setPathHistory: explorerStateHook.setPathHistory,
    setForwardHistory: explorerStateHook.setForwardHistory,
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
    sortBy: sorting.sortBy,
    sortOrder: sorting.sortOrder,
  });

  // Handle clicking on a search result
  const handleSearchResultClick = useCallback((entry: ExplorerEntry) => {
    if (entry.isDirectory) {
      loading.loadDirectory(entry.path, true);
    } else {
      const parentPath = entry.path.includes('\\')
        ? entry.path.substring(0, entry.path.lastIndexOf('\\'))
        : entry.path.substring(0, entry.path.lastIndexOf('/'));
      navigate('viewer', { folder: parentPath, targetPath: entry.path, sortBy: sorting.sortBy, sortOrder: sorting.sortOrder }, 'explorer');
    }
  }, [loading.loadDirectory, navigate, sorting.sortBy, sorting.sortOrder]);

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
    pinnedImages,
    sortMode: sorting.sortBy,
    onPinnedOrderChange: setPinnedFolders,
    onPinnedImagesOrderChange: setPinnedImages,
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

  // Folder navigation (sibling prev/next for leaf image folders)
  const [folderNav, setFolderNav] = useState<FolderNavigation | null>(null);
  const isLeafImageFolder = explorerStateHook.currentPath
    && loading.entries.length > 0
    && loading.entries.every(e => !e.isDirectory);

  // Controls show/hide (like viewer)
  const [showFolderNavControls, setShowFolderNavControls] = useState(true);
  const folderNavTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleFolderNavMouseMove = useCallback(() => {
    setShowFolderNavControls(true);
    if (folderNavTimeoutRef.current) {
      clearTimeout(folderNavTimeoutRef.current);
    }
    folderNavTimeoutRef.current = setTimeout(() => setShowFolderNavControls(false), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (folderNavTimeoutRef.current) {
        clearTimeout(folderNavTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!explorerStateHook.currentPath || !isLeafImageFolder) {
      setFolderNav(null);
      return;
    }
    let cancelled = false;
    ExplorerAPI.getFolderNavigationWithSort(
      explorerStateHook.currentPath,
      sorting.sortBy,
      sorting.sortOrder,
    ).then(nav => {
      if (!cancelled) setFolderNav(nav);
    });
    return () => { cancelled = true; };
  }, [explorerStateHook.currentPath, isLeafImageFolder, sorting.sortBy, sorting.sortOrder]);

  const handleFolderNavPrev = useCallback(() => {
    if (!folderNav?.prevFolder) return;
    loading.loadDirectory(folderNav.prevFolder.path, true, sorting.sortBy, sorting.sortOrder);
  }, [folderNav, loading.loadDirectory, sorting.sortBy, sorting.sortOrder]);

  const handleFolderNavNext = useCallback(() => {
    if (!folderNav?.nextFolder) return;
    loading.loadDirectory(folderNav.nextFolder.path, true, sorting.sortBy, sorting.sortOrder);
  }, [folderNav, loading.loadDirectory, sorting.sortBy, sorting.sortOrder]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    entry: ExplorerEntry;
  } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, entry: ExplorerEntry) => {
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
        // Pin/Unpin for images (files)
        ...(!contextMenu.entry.isDirectory
          ? [
              isImagePinned(contextMenu.entry.name)
                ? {
                    id: 'unpin-image',
                    label: t('explorer.unpinImage'),
                    onClick: () => handleUnpinImage(contextMenu.entry.name),
                  } as ContextMenuItem
                : {
                    id: 'pin-image',
                    label: t('explorer.pinImage'),
                    onClick: () => handlePinImage(contextMenu.entry.name),
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
        className="h-full p-2 sm:p-6 flex flex-col relative"
        style={{ backgroundColor: "var(--color-surface-primary)" }}
        onMouseMove={handleFolderNavMouseMove}
      >
      {/* Header */}
      <div
        className="flex items-center justify-between mb-2 sm:mb-6 flex-shrink-0 flex-wrap gap-2 transition-all duration-300 sm:opacity-100 sm:translate-y-0"
        style={{
          opacity: headerVisible ? 1 : 0,
          transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)',
          pointerEvents: headerVisible ? 'auto' : 'none',
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {explorerStateHook.currentPath && (
            <>
              <Tooltip content={t("common.back")} placement="right">
                <button
                  onClick={navigation.handleBack}
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
                  onClick={navigation.handleForward}
                  disabled={explorerStateHook.forwardHistory.length === 0}
                  className={`p-1.5 sm:p-2 rounded-full transition-all flex-shrink-0 ${
                    explorerStateHook.forwardHistory.length === 0
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

          {/* Breadcrumb */}
          <div className={`min-w-0 ${explorerStateHook.currentPath ? 'flex-1' : ''}`}>
            <Breadcrumb
              currentPath={explorerStateHook.currentPath}
              baseFolders={loading.baseFolders}
              onNavigate={navigation.handleBreadcrumbClick}
              onAuxClick={navigation.handleBreadcrumbAuxClick}
            />
          </div>

          {!explorerStateHook.currentPath && (
            <>
              <Tooltip content={t("common.forward")} placement="right">
                <button
                  onClick={navigation.handleForward}
                  disabled={explorerStateHook.forwardHistory.length === 0}
                  className={`p-1.5 sm:p-2 rounded-full transition-all flex-shrink-0 ${
                    explorerStateHook.forwardHistory.length === 0
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
              sortBy={sorting.sortBy}
              sortOrder={sorting.sortOrder}
              onSortByChange={(value) => {
                const newMode = value as "name" | "date" | "custom" | "auto";
                prevSortByRef.current = newMode;
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
            <div className="flex items-center bg-surface-tertiary rounded-lg p-1 border border-white/5 ml-2 sm:ml-4 flex-shrink-0 hidden sm:flex">
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
            className="btn-primary transition-transform hover:scale-105 active:scale-95 ml-2 sm:ml-6 text-sm px-3 py-1.5 hidden sm:inline-flex"
          >
            <span className="mr-2">+</span>
            {t("explorer.addBaseFolder")}
          </button>
        )}
      </div>

      {/* Search Bar & Grid Size Slider */}
      {((!explorerStateHook.currentPath && loading.baseFolders.length > 0) ||
        (explorerStateHook.currentPath && loading.entries.length > 0)) && (
        <div className="mb-2 sm:mb-4 flex items-center gap-2 flex-wrap">
          <SearchBar
            placeholder={t("explorer.searchPlaceholder") || "Search by name..."}
            onSearch={search.setSearchQuery}
            className="flex-1 min-w-0 sm:max-w-md hidden sm:block"
          />
          {viewMode === 'grid' && explorerStateHook.currentPath && (
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
        className="flex-1 overflow-auto pr-1 sm:pr-2"
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
            pinnedImages={pinnedImages}
            justPinnedImage={justPinnedImage}
            hasPinnedImages={pinnedImages.length > 0}
          />
        )}

        {/* Search Results */}
        {search.searchResults.length > 0 && !search.isSearching && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-text-secondary mb-1">
              {search.searchResults.length >= 200
                ? `Showing top 200 results for "${search.searchQuery}"`
                : `Found ${search.searchResults.length} results for "${search.searchQuery}"`
              }
            </p>
            <GridContainer>
              {search.searchResults.map((entry) => {
                const sepIdx = Math.max(entry.path.lastIndexOf('\\'), entry.path.lastIndexOf('/'));
                const parentPath = sepIdx >= 0 ? entry.path.substring(0, sepIdx) : '';
                return (
                  <GridItem key={entry.path}>
                    <MediaTile
                      id={entry.path}
                      name={entry.name}
                      thumbnail={entry.thumbnailUrl}
                      onClick={() => handleSearchResultClick(entry)}
                      fallbackIcon={
                        <div className={`p-4 rounded-xl ${entry.isDirectory ? 'bg-amber/10 text-amber' : 'bg-accent/10 text-accent'}`}>
                          {entry.isDirectory ? (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                          ) : (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          )}
                        </div>
                      }
                      footerLeft={
                        <Tooltip content={parentPath}>
                          <p className="text-xs text-white/50 truncate mt-1 font-mono">
                            {parentPath}
                          </p>
                        </Tooltip>
                      }
                    />
                  </GridItem>
                );
              })}
            </GridContainer>
          </div>
        )}

        {/* No search results */}
        {search.searchQuery.trim() && !search.isSearching && search.searchResults.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
            <svg className="w-16 h-16 mb-4 text-surface-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <p className="text-lg">{t("explorer.noResultsFound")}</p>
            <p className="text-sm mt-1">{t("explorer.tryDifferentSearch")}</p>
          </div>
        )}

        {/* Searching indicator */}
        {search.searchQuery.trim() && search.isSearching && (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
            <svg className="animate-spin w-8 h-8 mb-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm">{t('common.searching') || 'Searching...'}</p>
          </div>
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

        {/* No results message (legacy frontend-only search) */}
        {search.searchResults.length === 0 && ((!explorerStateHook.currentPath &&
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

      {/* Folder Navigation Bar (leaf image folders only) */}
      {folderNav && isLeafImageFolder && (folderNav.prevFolder || folderNav.nextFolder) && (
        <FolderNavigationBar
          prevFolder={folderNav.prevFolder}
          nextFolder={folderNav.nextFolder}
          showControls={showFolderNavControls}
          onPrevFolder={handleFolderNavPrev}
          onNextFolder={handleFolderNavNext}
          t={t}
        />
      )}

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
