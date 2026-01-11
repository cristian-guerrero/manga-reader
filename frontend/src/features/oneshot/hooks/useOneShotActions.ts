/**
 * useOneShotActions - Hook to handle oneshot actions
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@hooks';
import { useTabStore } from '@stores';
import { useToast } from '@shared/components';
import { AppAPI } from '@services/api/appAPI';
import type { FolderInfo } from '@types';

interface UseOneShotActionsOptions {
    setFolders: React.Dispatch<React.SetStateAction<FolderInfo[]>>;
    setIsProcessing: (processing: boolean) => void;
}

export function useOneShotActions({ setFolders, setIsProcessing }: UseOneShotActionsOptions) {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { addTab } = useTabStore();
    const { showToast } = useToast();

    const handleSelectFolder = useCallback(async () => {
        try {
            const folderPath = await AppAPI.selectFolder();
            if (folderPath) {
                try {
                    setIsProcessing(true);
                    const result = await AppAPI.addFolder(folderPath);
                    if (result) {
                        if (result.isSeries) {
                            // If it's a series, set activeMenuPage to 'series'
                            navigate('series-details', { series: result.path }, 'series');
                        } else {
                            // If it's a oneshot, set activeMenuPage to 'oneShot'
                            navigate('viewer', { folder: result.path }, 'oneShot');
                        }
                    }
                } catch (e) {
                    console.error("Failed to add to library", e);
                    showToast?.(t('common.error'), 'error');
                } finally {
                    setIsProcessing(false);
                }
            }
        } catch (error) {
            console.error('Failed to select folder:', error);
        }
    }, [navigate, setIsProcessing, showToast, t]);

    const handleOpenFolder = useCallback((folder: FolderInfo) => {
        // Maintain 'oneShot' as active menu page when viewing from oneshot page
        navigate('viewer', { folder: folder.path }, 'oneShot');
    }, [navigate]);

    const handleAuxClick = useCallback((e: React.MouseEvent, folder: FolderInfo) => {
        if (e.button === 1) { // Middle click
            e.preventDefault();
            e.stopPropagation();
            addTab('viewer', { folder: folder.path }, folder.name, {}, false);
        }
    }, [addTab]);

    const handleRemoveFolder = useCallback(async (folder: FolderInfo, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await AppAPI.removeLibraryEntry(folder.path);
            setFolders((prev: FolderInfo[]) => prev.filter((f: FolderInfo) => f.path !== folder.path));
        } catch (error) {
            console.error('Failed to remove folder:', error);
        }
    }, [setFolders]);

    const handleClearAll = useCallback(async () => {
        if (!window.confirm(t('oneShot.confirmClear'))) return;
        try {
            await AppAPI.clearLibrary();
            setFolders([]);
        } catch (error) {
            console.error('Failed to clear library:', error);
        }
    }, [setFolders, t]);

    return {
        handleSelectFolder,
        handleOpenFolder,
        handleAuxClick,
        handleRemoveFolder,
        handleClearAll,
    };
}
