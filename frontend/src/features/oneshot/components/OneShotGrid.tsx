/**
 * OneShotGrid - Grid component for displaying folders
 */

import { useTranslation } from 'react-i18next';
import { GridContainer, GridItem, LibraryCard } from '@shared/components';
import { OneShotIcon, ImageIcon } from './OneShotIcons';
import type { FolderInfo } from '@types';

interface OneShotGridProps {
    folders: FolderInfo[];
    thumbnails: Record<string, string>;
    onOpenFolder: (folder: FolderInfo) => void;
    onAuxClick: (e: React.MouseEvent, folder: FolderInfo) => void;
    onRemoveFolder: (folder: FolderInfo, e: React.MouseEvent) => void;
    searchQuery: string;
}

export function OneShotGrid({
    folders,
    thumbnails,
    onOpenFolder,
    onAuxClick,
    onRemoveFolder,
    searchQuery,
}: OneShotGridProps) {
    const { t } = useTranslation();

    if (folders.length === 0 && searchQuery.trim()) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('common.noResults')}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {t('oneShot.noFoldersFound') || `No folders found matching "${searchQuery}"`}
                </p>
            </div>
        );
    }

    return (
        <GridContainer>
            {folders.map((folder) => (
                <GridItem key={folder.path}>
                    <LibraryCard
                        id={folder.path}
                        name={folder.name}
                        thumbnail={thumbnails[folder.path]}
                        isTemporary={folder.isTemporary}
                        count={folder.imageCount}
                        countLabel={t('oneShot.images')}
                        countIcon={<ImageIcon />}
                        onOpen={() => onOpenFolder(folder)}
                        onAuxClick={(e) => onAuxClick(e, folder)}
                        onRemove={(e) => onRemoveFolder(folder, e)}
                        overlayContent={
                            <span
                                className="text-lg font-semibold"
                                style={{ color: 'white' }}
                            >
                                {t('oneShot.openFolder')}
                            </span>
                        }
                        fallbackIcon={<OneShotIcon />}
                        archiveLabel={t('common.archive') || 'Archive'}
                        removeLabel={t('oneShot.removeFolder')}
                        playLabel={t('oneShot.openFolder')}
                        variant="unified"
                    />
                </GridItem>
            ))}
        </GridContainer>
    );
}
