import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AppAPI } from "@services/api/appAPI";
import { ExplorerAPI } from "@services/api/explorerAPI";
import type { ContextMenuItem } from "@types";
import type { PageType } from "@types";
import type { ExplorerEntry } from "../types";
import { RECENTLY_VIEWED_SENTINEL } from "../types";

interface UseExplorerContextMenuParams {
  currentPath: string | null;
  isPinned: (entryName: string) => boolean;
  isImagePinned: (entryName: string) => boolean;
  handlePinFolder: (entryName: string) => Promise<void>;
  handleUnpinFolder: (entryName: string) => Promise<void>;
  handlePinImage: (entryName: string) => Promise<void>;
  handleUnpinImage: (entryName: string) => Promise<void>;
  loadDirectory: (path: string, pushHistory?: boolean, sortMode?: string, sortOrder?: string) => Promise<void>;
  sortBy: string;
  sortOrder: string;
  navigate: (page: PageType, navParams?: Record<string, string>, activeMenuPageOverride?: PageType) => void;
}

export function useExplorerContextMenu({
  currentPath,
  isPinned,
  isImagePinned,
  handlePinFolder,
  handleUnpinFolder,
  handlePinImage,
  handleUnpinImage,
  loadDirectory,
  sortBy,
  sortOrder,
  navigate,
}: UseExplorerContextMenuParams) {
  const { t } = useTranslation();

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

  const contextMenuItems: ContextMenuItem[] = useMemo(() => {
    const isInVirtual = currentPath === RECENTLY_VIEWED_SENTINEL;
    return contextMenu
    ? [
        ...(contextMenu.entry.isDirectory && !isInVirtual
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
        ...(isInVirtual && contextMenu.entry.isDirectory
          ? [
              {
                id: 'remove-from-recent',
                label: t('explorer.removeFromRecent'),
                onClick: async () => {
                  await ExplorerAPI.removeRecentFolder(contextMenu.entry.path);
                  if (currentPath) {
                    loadDirectory(currentPath, false, sortBy, sortOrder);
                  }
                },
              } as ContextMenuItem,
            ]
          : []),
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
        {
          id: 'open-in-file-manager',
          label: t('explorer.openInFileManager'),
          onClick: () =>
            AppAPI.openInFileManager(contextMenu.entry.path),
        },
      ]
    : [];
  }, [contextMenu, isPinned, isImagePinned, handleUnpinFolder, handlePinFolder, handleUnpinImage, handlePinImage, t, navigate, currentPath, loadDirectory, sortBy, sortOrder]);

  return {
    contextMenu,
    handleContextMenu,
    handleCloseContextMenu,
    contextMenuItems,
  };
}
