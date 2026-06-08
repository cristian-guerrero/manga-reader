/**
 * ExplorerPage - File and folder explorer
 * Refactored to use custom hooks and extracted components for better separation of concerns
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
  ContextMenu,
  useToast,
} from "@shared/components";
import { FolderOrderAPI } from "@services/api/folderOrderAPI";
import { ImageOrderAPI } from "@services/api/imageOrderAPI";
import { ExplorerAPI, type FolderNavigation } from "@services/api/explorerAPI";
import {
  useExplorerState,
  useExplorerSorting,
  useExplorerLoading,
  useExplorerSearch,
  useExplorerNavigation,
  useExplorerRestoration,
  useExplorerDragAndDrop,
  useExplorerView,
  useExplorerContextMenu,
} from "./hooks";
import { type ExplorerEntry, RECENTLY_VIEWED_SENTINEL } from "./types";
import { DirectoryView } from "./components/DirectoryView";
import { FolderNavigationBar } from "./components/FolderNavigationBar";
import { ExplorerHeader } from "./components/ExplorerHeader";
import { ExplorerToolbar } from "./components/ExplorerToolbar";
import { BaseFoldersGrid } from "./components/BaseFoldersGrid";
import { SearchResultsSection } from "./components/SearchResultsSection";
import { ExplorerEmptyState } from "./components/ExplorerEmptyState";

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

  const explorerStateHook = useExplorerState({ tabId, isActive });

  // Ref to break circular dep between sorting (needs loadDirectory) and loading (needs sortBy)
  const loadDirRef = useRef<(path: string, pushHistory?: boolean, sortMode?: string, sortOrder?: string) => Promise<void>>(
    () => Promise.resolve()
  );

  // Sorting hook
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
    if (title === RECENTLY_VIEWED_SENTINEL) {
      setCurrentTitle(t("explorer.recentlyViewed"));
    } else {
      setCurrentTitle(title);
    }
  }, [t]);

  // Path change handler
  const handlePathChange = useCallback(
    (path: string | null) => {
      explorerStateHook.setCurrentPath(path);
    },
    [explorerStateHook],
  );

  // Loading hook
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

  // Pinned folders + images state
  const [pinnedFolders, setPinnedFolders] = useState<string[]>([]);
  const [pinnedImages, setPinnedImages] = useState<string[]>([]);

  useEffect(() => {
    if (!explorerStateHook.currentPath) {
      setPinnedFolders([]);
      setPinnedImages([]);
      return;
    }
    const p = explorerStateHook.currentPath;
    const sort = sorting.sortBy;
    Promise.all([
      FolderOrderAPI.getPinnedFolders(p, sort).catch(() => [] as string[]),
      ImageOrderAPI.getPinnedImages(p, sort).catch(() => [] as string[]),
    ]).then(([folders, images]) => {
      setPinnedFolders(folders);
      setPinnedImages(images);
    });
  }, [explorerStateHook.currentPath, sorting.sortBy]);

  const [justPinned, setJustPinned] = useState<string | null>(null);

  const handlePinFolder = useCallback(async (entryName: string) => {
    if (!explorerStateHook.currentPath) return;
    await FolderOrderAPI.pinFolder(explorerStateHook.currentPath, sorting.sortBy, entryName);
    const updated = await FolderOrderAPI.getPinnedFolders(explorerStateHook.currentPath, sorting.sortBy);
    setPinnedFolders(updated);
    setJustPinned(entryName);
    setTimeout(() => setJustPinned(null), 500);
  }, [explorerStateHook.currentPath, sorting.sortBy]);

  const handleUnpinFolder = useCallback(async (entryName: string) => {
    if (!explorerStateHook.currentPath) return;
    await FolderOrderAPI.unpinFolder(explorerStateHook.currentPath, sorting.sortBy, entryName);
    const updated = await FolderOrderAPI.getPinnedFolders(explorerStateHook.currentPath, sorting.sortBy);
    setPinnedFolders(updated);
  }, [explorerStateHook.currentPath, sorting.sortBy]);

  const isPinned = useCallback((entryName: string) => {
    return pinnedFolders.includes(entryName);
  }, [pinnedFolders]);

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

  // Search hook
  const search = useExplorerSearch({
    baseFolders: loading.baseFolders,
    entries: loading.entries,
    sortBy: sorting.sortBy,
    sortOrder: sorting.sortOrder,
    pinnedFolders,
    pinnedImages,
    currentPath: explorerStateHook.currentPath,
  });

  // Navigation hook
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
      if (parentPath === RECENTLY_VIEWED_SENTINEL) return;
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
    const path = explorerStateHook.currentPathRef.current;
    if (path && (sorting.sortBy === 'auto' || sorting.sortBy === 'custom')) {
      loading.loadDirectory(path, false);
    }
  }, [sorting.sortBy, sorting.sortOrder, loading.loadDirectory]);

  // View mode hook (includes grid item size)
  const { viewMode, setViewMode, gridItemSize, setGridItemSize, isLoaded: viewStateLoaded } = useExplorerView(explorerStateHook.currentPath);
  const resolvedViewMode = viewMode ?? 'grid';
  const resolvedGridItemSize = gridItemSize ?? 200;

  // Drag-and-drop hook
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

  // Context menu hook
  const {
    contextMenu,
    handleContextMenu,
    handleCloseContextMenu,
    contextMenuItems,
  } = useExplorerContextMenu({
    currentPath: explorerStateHook.currentPath,
    isPinned,
    isImagePinned,
    handlePinFolder,
    handleUnpinFolder,
    handlePinImage,
    handleUnpinImage,
    loadDirectory: loading.loadDirectory,
    sortBy: sorting.sortBy,
    sortOrder: sorting.sortOrder,
    navigate,
  });

  // Folder navigation (sibling prev/next for leaf image folders)
  const [folderNav, setFolderNav] = useState<FolderNavigation | null>(null);
  const isLeafImageFolder = explorerStateHook.currentPath
    && loading.entries.length > 0
    && loading.entries.every(e => !e.isDirectory);

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

  // Restoration hook
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

  // Derived booleans for conditional rendering
  const hasContent = Boolean(
    (!explorerStateHook.currentPath && loading.baseFolders.length > 0) ||
    (explorerStateHook.currentPath && loading.entries.length > 0)
  );
  const isRecentView = explorerStateHook.currentPath === RECENTLY_VIEWED_SENTINEL;
  const isGridView = resolvedViewMode === 'grid';
  const showSortControls = hasContent;

  // Handle sort by change (with the prevSortByRef update for the effect above)
  const handleSortByChange = useCallback((value: string) => {
    const newMode = value as "name" | "date" | "custom" | "auto";
    prevSortByRef.current = newMode;
    sorting.setSortBy(newMode);
    if (explorerStateHook.currentPath && (newMode === 'auto' || newMode === 'custom')) {
      loading.loadDirectory(explorerStateHook.currentPath, false, newMode);
    }
  }, [sorting, explorerStateHook.currentPath, loading.loadDirectory]);

  // Legacy no-results check (frontend-only filtered search at root or inside directory)
  const showLegacyNoResults = search.searchResults.length === 0 && (
    (!explorerStateHook.currentPath &&
      search.sortedBaseFolders.length === 0 &&
      loading.baseFolders.length > 0 &&
      search.searchQuery.trim()) ||
    (explorerStateHook.currentPath &&
      search.sortedEntries.length === 0 &&
      loading.entries.length > 0 &&
      search.searchQuery.trim())
  );

  return (
    <div
      className="h-full p-2 sm:p-6 flex flex-col relative"
      style={{ background: "var(--gradient-surface-primary)" }}
      onMouseMove={handleFolderNavMouseMove}
    >
      {/* Header */}
      <ExplorerHeader
        headerVisible={headerVisible}
        currentPath={explorerStateHook.currentPath}
        baseFolders={loading.baseFolders}
        forwardHistoryLength={explorerStateHook.forwardHistory.length}
        sortBy={sorting.sortBy}
        sortOrder={sorting.sortOrder}
        showSortControls={showSortControls}
        showViewToggle={Boolean(explorerStateHook.currentPath && loading.entries.length > 0)}
        showAddFolder={!explorerStateHook.currentPath}
        resolvedViewMode={resolvedViewMode}
        onBack={navigation.handleBack}
        onForward={navigation.handleForward}
        onBreadcrumbClick={navigation.handleBreadcrumbClick}
        onBreadcrumbAuxClick={navigation.handleBreadcrumbAuxClick}
        onSortByChange={handleSortByChange}
        onSortOrderChange={() => {
          sorting.setSortOrder((prev) =>
            prev === "asc" ? "desc" : "asc",
          );
        }}
        onAddBaseFolder={navigation.handleAddBaseFolder}
        onViewModeChange={setViewMode}
      />

      {/* Search Bar & Toolbar */}
      <ExplorerToolbar
        currentPath={explorerStateHook.currentPath}
        hasContent={hasContent}
        isRecentView={isRecentView}
        isGridView={isGridView}
        gridItemSize={resolvedGridItemSize}
        onSearch={search.setSearchQuery}
        onClearRecent={async () => {
          await ExplorerAPI.clearRecentFolders();
          explorerStateHook.setCurrentPath(null);
        }}
        onGridSizeChange={setGridItemSize}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto pr-1 sm:pr-2">
        {/* Base Folders View */}
        {!explorerStateHook.currentPath && (
          <BaseFoldersGrid
            sortedBaseFolders={search.sortedBaseFolders}
            thumbnails={thumbnails}
            onItemClick={navigation.handleItemClick}
            onItemAuxClick={navigation.handleItemAuxClick}
            onRemoveFolder={navigation.handleRemoveBaseFolder}
            onLoadThumbnail={loadThumbnail}
          />
        )}

        {/* Directory View */}
        {explorerStateHook.currentPath && viewStateLoaded && (
          <DirectoryView
            entries={search.sortedEntries}
            thumbnails={thumbnails}
            isCustomMode={isInCustomMode}
            directoryEntries={dnd.directoryEntries}
            sensors={sensors}
            viewMode={resolvedViewMode}
            gridItemSize={resolvedGridItemSize}
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
        <SearchResultsSection
          searchResults={search.searchResults}
          searchQuery={search.searchQuery}
          isSearching={search.isSearching}
          onResultClick={handleSearchResultClick}
        />

        {/* No search results (searching handled inside SearchResultsSection) */}
        {/* search results empty state also handled inside SearchResultsSection */}

        {/* No base folders */}
        {!explorerStateHook.currentPath && loading.baseFolders.length === 0 && (
          <ExplorerEmptyState variant="no-folders" />
        )}

        {/* Legacy no-results (frontend-only filtered search) */}
        {showLegacyNoResults && (
          <ExplorerEmptyState variant="no-results" />
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
