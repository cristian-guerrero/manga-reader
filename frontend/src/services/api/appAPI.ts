/**
 * App API Service - Centralized backend API calls
 * Uses Wails generated bindings instead of direct window.go calls
 */

import { FolderInfo, ImageInfo, HistoryEntry, Settings } from '../../types';
import * as AppBackend from '../../../wailsjs/go/main/App';
import { persistence, series } from '../../../wailsjs/go/models';
import { errorService } from '../errorService';

/**
 * Base folder interface for explorer
 */
export interface BaseFolder {
    path: string;
    name: string;
    addedAt: string;
    isVisible: boolean;
    hasImages?: boolean;
    thumbnailUrl?: string;
}

/**
 * Explorer entry interface
 */
export interface ExplorerEntry {
    path: string;
    name: string;
    isDirectory: boolean;
    hasImages: boolean;
    imageCount: number;
    coverImage: string;
    thumbnailUrl?: string;
    size: number;
    lastModified: number;
}

export class AppAPI {
    /**
     * Get folder information (recursive scan)
     */
    static async getFolderInfo(path: string): Promise<FolderInfo | null> {
        try {
            const result = await AppBackend.GetFolderInfo(path);
            return result as FolderInfo || null;
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'getFolderInfo',
                details: { path }
            }, { showToast: false }); // Don't show toast here, let caller decide
            throw error;
        }
    }

    /**
     * Get folder information (shallow scan - only immediate directory)
     */
    static async getFolderInfoShallow(path: string): Promise<FolderInfo | null> {
        try {
            const result = await AppBackend.GetFolderInfoShallow(path);
            return result as FolderInfo || null;
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'getFolderInfoShallow',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Get images list (recursive scan)
     */
    static async getImages(path: string): Promise<ImageInfo[]> {
        try {
            const result = await AppBackend.GetImages(path);
            return (result as any[]) || [];
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'getImages',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Get images list (shallow scan - only immediate directory)
     */
    static async getImagesShallow(path: string): Promise<ImageInfo[]> {
        try {
            const result = await AppBackend.GetImagesShallow(path);
            return (result as any[]) || [];
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'getImagesShallow',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Get history entry for a folder
     */
    static async getHistoryEntry(path: string): Promise<HistoryEntry | null> {
        try {
            const result = await AppBackend.GetHistoryEntry(path);
            return result as HistoryEntry || null;
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'getHistoryEntry',
                details: { path }
            }, { showToast: false });
            return null;
        }
    }

    /**
     * Add or update history entry
     */
    static async addHistory(entry: Omit<HistoryEntry, 'id'>): Promise<void> {
        try {
            // Convert to persistence.HistoryEntry format (Wails expects id)
            const historyEntry: persistence.HistoryEntry = {
                id: '', // Wails will generate the ID on the backend
                folderPath: entry.folderPath,
                folderName: entry.folderName,
                lastImage: entry.lastImage,
                lastImageIndex: entry.lastImageIndex,
                scrollPosition: entry.scrollPosition,
                totalImages: entry.totalImages,
                lastRead: entry.lastRead,
            };
            await AppBackend.AddHistory(historyEntry);
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'addHistory',
                details: { folderPath: entry.folderPath }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Get chapter navigation info (for series)
     */
    static async getChapterNavigation(path: string): Promise<{
        prevChapter?: { path: string; name: string };
        nextChapter?: { path: string; name: string };
        seriesName?: string;
        chapterIndex?: number;
        totalChapters?: number;
    } | null> {
        try {
            const result = await AppBackend.GetChapterNavigation(path);
            if (!result) return null;
            
            // Convert series.ChapterNavigation to our format
            // result.prevChapter and result.nextChapter are persistence.ChapterInfo objects
            return {
                prevChapter: result.prevChapter ? {
                    path: result.prevChapter.path,
                    name: result.prevChapter.name
                } : undefined,
                nextChapter: result.nextChapter ? {
                    path: result.nextChapter.path,
                    name: result.nextChapter.name
                } : undefined,
                seriesName: result.seriesName,
                chapterIndex: result.chapterIndex,
                totalChapters: result.totalChapters
            };
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'getChapterNavigation',
                details: { path }
            }, { showToast: false });
            return null;
        }
    }

    /**
     * Pause/resume thumbnail generation
     */
    static setThumbnailsPaused(paused: boolean): void {
        try {
            // SetThumbnailsPaused returns Promise<void> but we don't need to await it
            AppBackend.SetThumbnailsPaused(paused).catch((error) => {
                errorService.handle(error, {
                    component: 'AppAPI',
                    action: 'setThumbnailsPaused',
                    details: { paused }
                }, { showToast: false });
            });
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'setThumbnailsPaused',
                details: { paused }
            }, { showToast: false });
        }
    }

    /**
     * Select a folder using system dialog
     */
    static async selectFolder(): Promise<string | null> {
        try {
            const result = await AppBackend.SelectFolder();
            return result || null;
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'selectFolder'
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Add a base folder to explorer
     */
    static async addBaseFolder(path: string): Promise<void> {
        try {
            await AppBackend.AddBaseFolder(path);
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'addBaseFolder',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Remove a base folder from explorer
     */
    static async removeBaseFolder(path: string): Promise<void> {
        try {
            await AppBackend.RemoveBaseFolder(path);
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'removeBaseFolder',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Get all base folders for explorer
     */
    static async getBaseFolders(): Promise<BaseFolder[]> {
        try {
            const result = await AppBackend.GetBaseFolders();
            return (result as BaseFolder[]) || [];
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'getBaseFolders'
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Explore a folder (get directory contents)
     */
    static async exploreFolder(path: string): Promise<ExplorerEntry[]> {
        try {
            const result = await AppBackend.ExploreFolder(path);
            return (result as ExplorerEntry[]) || [];
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'exploreFolder',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Resolve folder path (if file is dropped, get its parent folder)
     */
    static async resolveFolder(path: string): Promise<string> {
        try {
            const result = await AppBackend.ResolveFolder(path);
            return result || path;
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'resolveFolder',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Add folder to library (returns path and isSeries flag)
     */
    static async addFolder(path: string): Promise<{ path: string; isSeries: boolean } | null> {
        try {
            const result = await AppBackend.AddFolder(path);
            return result ? {
                path: result.path || path,
                isSeries: result.isSeries || false
            } : null;
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'addFolder',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Check if a folder is a series
     */
    static async isSeries(path: string): Promise<boolean> {
        try {
            const result = await AppBackend.IsSeries(path);
            return result || false;
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'isSeries',
                details: { path }
            }, { showToast: false });
            return false;
        }
    }

    /**
     * Get thumbnail for an image
     */
    static async getThumbnail(imagePath: string): Promise<string | null> {
        try {
            const result = await AppBackend.GetThumbnail(imagePath);
            return result || null;
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'getThumbnail',
                details: { imagePath }
            }, { showToast: false });
            return null;
        }
    }

    /**
     * Get all history entries
     */
    static async getHistory(): Promise<HistoryEntry[]> {
        try {
            const result = await AppBackend.GetHistory();
            return (result as HistoryEntry[]) || [];
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'getHistory'
            }, { showToast: false });
            return [];
        }
    }

    /**
     * Remove a history entry
     */
    static async removeHistory(path: string): Promise<void> {
        try {
            await AppBackend.RemoveHistory(path);
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'removeHistory',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Clear all history
     */
    static async clearHistory(): Promise<void> {
        try {
            await AppBackend.ClearHistory();
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'clearHistory'
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Get all series
     */
    static async getSeries(): Promise<any[]> {
        try {
            const result = await AppBackend.GetSeries();
            return (result as any[]) || [];
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'getSeries'
            }, { showToast: false });
            return [];
        }
    }

    /**
     * Remove a series
     */
    static async removeSeries(path: string): Promise<void> {
        try {
            await AppBackend.RemoveSeries(path);
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'removeSeries',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Clear all series
     */
    static async clearSeries(): Promise<void> {
        try {
            await AppBackend.ClearSeries();
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'clearSeries'
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Remove a library entry
     */
    static async removeLibraryEntry(path: string): Promise<void> {
        try {
            await AppBackend.RemoveLibraryEntry(path);
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'removeLibraryEntry',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Clear all library entries
     */
    static async clearLibrary(): Promise<void> {
        try {
            await AppBackend.ClearLibrary();
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'clearLibrary'
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Check if folder has custom image order
     */
    static async hasCustomOrder(folderPath: string): Promise<boolean> {
        try {
            const result = await AppBackend.HasCustomOrder(folderPath);
            return result || false;
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'hasCustomOrder',
                details: { folderPath }
            }, { showToast: false });
            return false;
        }
    }

    /**
     * Get original image order
     */
    static async getOriginalOrder(folderPath: string): Promise<string[]> {
        try {
            const result = await AppBackend.GetOriginalOrder(folderPath);
            return (result as string[]) || [];
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'getOriginalOrder',
                details: { folderPath }
            }, { showToast: false });
            return [];
        }
    }

    /**
     * Save custom image order
     */
    static async saveImageOrder(folderPath: string, customOrder: string[], originalOrder: string[]): Promise<void> {
        try {
            await AppBackend.SaveImageOrder(folderPath, customOrder, originalOrder);
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'saveImageOrder',
                details: { folderPath }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Reset image order to original
     */
    static async resetImageOrder(folderPath: string): Promise<void> {
        try {
            await AppBackend.ResetImageOrder(folderPath);
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'resetImageOrder',
                details: { folderPath }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Clear all data (history, library, series, etc.)
     */
    static async clearAllData(): Promise<void> {
        try {
            await AppBackend.ClearAllData();
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'clearAllData'
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Fetch manga info from URL
     */
    static async fetchMangaInfo(url: string): Promise<any> {
        try {
            const result = await AppBackend.FetchMangaInfo(url);
            return result || null;
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'fetchMangaInfo',
                details: { url }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Start download from URL
     */
    static async startDownload(url: string, seriesPath: string = '', chapterPath: string = ''): Promise<string> {
        try {
            const result = await AppBackend.StartDownload(url, seriesPath, chapterPath);
            return result || '';
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'startDownload',
                details: { url }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Get library entries
     */
    static async getLibrary(): Promise<FolderInfo[]> {
        try {
            const result = await AppBackend.GetLibrary();
            return (result as FolderInfo[]) || [];
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'getLibrary'
            }, { showToast: false });
            return [];
        }
    }

    /**
     * Get application settings
     */
    static async getSettings(): Promise<Settings | null> {
        try {
            const result = await AppBackend.GetSettings();
            // Convert backend Settings to frontend Settings format
            return (result as unknown as Settings) || null;
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'getSettings'
            }, { showToast: false });
            return null;
        }
    }

    /**
     * Update a single setting in the backend
     */
    static async updateSettings(updates: Record<string, any>): Promise<void> {
        try {
            await AppBackend.UpdateSettings(updates);
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'updateSettings',
                details: { keys: Object.keys(updates) }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Save all settings to backend
     */
    static async saveSettings(settings: Settings): Promise<void> {
        try {
            // Convert frontend Settings to backend persistence.Settings format
            await AppBackend.SaveSettings(settings as unknown as persistence.Settings);
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'saveSettings'
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Update taskbar icon
     */
    static async updateTaskbarIcon(iconData: string): Promise<void> {
        try {
            await AppBackend.UpdateTaskbarIcon(iconData);
        } catch (error) {
            errorService.handle(error, {
                component: 'AppAPI',
                action: 'updateTaskbarIcon'
            }, { showToast: false });
            // Don't throw - taskbar icon update failure shouldn't break the app
        }
    }
}
