/**
 * useDragAndDrop - Hook for handling drag and drop functionality
 * Extracted from MainLayout for better separation of concerns
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { OnFileDrop, OnFileDropOff } from '../../wailsjs/runtime';
import { useSettingsStore } from '../stores/settingsStore';
import { useNavigation } from './useNavigation';
import { useToast } from '../components/common/Toast';
import { AppAPI } from '../services/api/appAPI';

/**
 * Hook to handle drag and drop of folders/files
 */
export function useDragAndDrop() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { processDroppedFolders } = useSettingsStore();
    const { navigate, setIsProcessing } = useNavigation();

    useEffect(() => {
        // Register drop listener
        OnFileDrop(async (x, y, paths) => {
            if (!paths || paths.length === 0) return;

            try {
                setIsProcessing(true);

                // Get current settings from store to avoid closure capture issues
                const currentSettings = useSettingsStore.getState();
                const processDropped = currentSettings.processDroppedFolders;

                // Resolve all paths to folders (e.g. if someone drags a .jpg)
                const resolvedPaths = await Promise.all(
                    paths.map(async (p) => {
                        return await AppAPI.resolveFolder(p);
                    })
                );

                // Deduplicate folders (to avoid processing the same folder multiple times if several files are dragged)
                const uniqueFolders = Array.from(new Set(resolvedPaths));

                // Determine if we need to navigate or just add
                if (uniqueFolders.length === 1) {
                    const path = uniqueFolders[0];
                    let isSeries = false;
                    let finalPath = path;

                    if (processDropped) {
                        try {
                            const result = await AppAPI.addFolder(path);
                            if (result) {
                                finalPath = result.path;
                                isSeries = result.isSeries;
                            }
                        } catch (error) {
                            const errorMessage = error instanceof Error 
                                ? error.message 
                                : (t('oneShot.addFailed') || 'Failed to add folder');
                            console.error('Failed to add folder:', error);
                            showToast(errorMessage, 'error');
                        }
                    } else {
                        isSeries = await AppAPI.isSeries(path);
                    }

                    const navigateFn = navigate;

                    if (isSeries && processDropped) {
                        // If it's a series, set activeMenuPage to 'series'
                        navigateFn('series-details', { series: finalPath }, 'series');
                    } else {
                        // If it's a oneshot, set activeMenuPage to 'oneShot'
                        navigateFn('viewer', {
                            folder: finalPath,
                            noHistory: !processDropped ? 'true' : 'false'
                        }, 'oneShot');
                    }
                    showToast(`Opening: ${finalPath.split(/[\\/]/).pop()}`, 'success');
                } else {
                    let addedCount = 0;
                    for (const path of uniqueFolders) {
                        try {
                            if (processDropped) {
                                await AppAPI.addFolder(path);
                                addedCount++;
                            }
                        } catch (error) {
                            const errorMessage = error instanceof Error 
                                ? error.message 
                                : 'Failed to add folder';
                            console.error('Failed to add folder:', error);
                            // Don't show toast for each failure when adding multiple folders
                            // Only log the error
                        }
                    }
                    if (addedCount > 0) {
                        showToast(`Added ${addedCount} folders to library`, 'success');
                    } else if (!processDropped) {
                        showToast("Drag & Drop processing is disabled in settings", "info");
                    }
                }
            } catch (e) {
                const errorMessage = e instanceof Error 
                    ? e.message 
                    : 'Failed to process dropped items';
                console.error("Failed to process dropped items", e);
                showToast(errorMessage, "error");
            } finally {
                setIsProcessing(false);
            }
        }, false);

        return () => {
            // Cleanup
            OnFileDropOff();
        };
    }, [t, showToast, processDroppedFolders, navigate, setIsProcessing]);
}
