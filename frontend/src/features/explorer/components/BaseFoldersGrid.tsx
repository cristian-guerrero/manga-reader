import { useTranslation } from "react-i18next";
import { GridItem, GridContainer, Tooltip, MediaTile } from "@shared/components";
import { AppAPI } from "@services/api/appAPI";
import { RECENTLY_VIEWED_SENTINEL } from "../types";
import type { BaseFolder } from "../types";

interface BaseFoldersGridProps {
  sortedBaseFolders: BaseFolder[];
  thumbnails: Record<string, string>;
  onItemClick: (folder: BaseFolder) => void;
  onItemAuxClick: (e: React.MouseEvent, folder: BaseFolder) => void;
  onRemoveFolder: (path: string, e: React.MouseEvent) => void;
  onLoadThumbnail: (path: string, coverImage: string) => Promise<void>;
}

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

export function BaseFoldersGrid({
  sortedBaseFolders,
  thumbnails,
  onItemClick,
  onItemAuxClick,
  onRemoveFolder,
  onLoadThumbnail,
}: BaseFoldersGridProps) {
  const { t } = useTranslation();

  return (
    <GridContainer>
      {sortedBaseFolders.map((folder) => {
        const isVirtual = folder.path === RECENTLY_VIEWED_SENTINEL;
        const displayName = isVirtual ? t("explorer.recentlyViewed") : folder.name;
        return (
        <GridItem key={folder.path}>
          <MediaTile
            id={folder.path}
            name={displayName}
            thumbnail={folder.thumbnailUrl || thumbnails[folder.path]}
            onClick={() => onItemClick(folder)}
            onAuxClick={(e) => onItemAuxClick(e, folder)}
            {...(isVirtual ? {} : {
              onVisible: async () => {
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
                    await onLoadThumbnail(folder.path, folderInfo.coverImage);
                  }
                } catch (error) {
                  console.error(
                    "Failed to load thumbnail for folder:",
                    folder.path,
                    error,
                  );
                }
              },
              onSecondaryAction: (e: React.MouseEvent) =>
                onRemoveFolder(folder.path, e),
              secondaryActionIcon: <TrashIcon />,
              secondaryActionLabel: t("common.remove"),
            })}
            fallbackIcon={
              isVirtual ? (
                <div className="p-4 rounded-xl bg-amber/10 text-amber">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              ) : (
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
              )
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
        );
      })}
    </GridContainer>
  );
}
