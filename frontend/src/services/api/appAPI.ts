/**
 * App API Service - Centralized backend API calls
 * Uses Wails generated bindings instead of direct window.go calls
 */

import { FolderInfo, ImageInfo, HistoryEntry } from '../../types';
import * as AppBackend from '../../../wailsjs/go/main/App';
import { persistence, series } from '../../../wailsjs/go/models';

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
            console.error('[AppAPI] Failed to get folder info:', error);
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
            console.error('[AppAPI] Failed to get folder info (shallow):', error);
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
            console.error('[AppAPI] Failed to get images:', error);
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
            console.error('[AppAPI] Failed to get images (shallow):', error);
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
            console.error('[AppAPI] Failed to get history entry:', error);
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
            console.error('[AppAPI] Failed to add history:', error);
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
            console.error('[AppAPI] Failed to get chapter navigation:', error);
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
                console.error('[AppAPI] Failed to set thumbnails paused:', error);
            });
        } catch (error) {
            console.error('[AppAPI] Failed to set thumbnails paused:', error);
        }
    }

    /**
     * Select a folder using system dialog
     */
    static async selectFolder(): Promise<string | null> {
        try {
            // @ts-ignore - Wails binding may not be typed
            const result = await (AppBackend as any).SelectFolder();
            return result || null;
        } catch (error) {
            console.error('[AppAPI] Failed to select folder:', error);
            throw error;
        }
    }

    /**
     * Add a base folder to explorer
     */
    static async addBaseFolder(path: string): Promise<void> {
        try {
            // @ts-ignore - Wails binding may not be typed
            await (AppBackend as any).AddBaseFolder(path);
        } catch (error) {
            console.error('[AppAPI] Failed to add base folder:', error);
            throw error;
        }
    }

    /**
     * Remove a base folder from explorer
     */
    static async removeBaseFolder(path: string): Promise<void> {
        try {
            // @ts-ignore - Wails binding may not be typed
            await (AppBackend as any).RemoveBaseFolder(path);
        } catch (error) {
            console.error('[AppAPI] Failed to remove base folder:', error);
            throw error;
        }
    }

    /**
     * Get all base folders for explorer
     */
    static async getBaseFolders(): Promise<BaseFolder[]> {
        try {
            // @ts-ignore - Wails binding may not be typed
            const result = await (AppBackend as any).GetBaseFolders();
            return (result as BaseFolder[]) || [];
        } catch (error) {
            console.error('[AppAPI] Failed to get base folders:', error);
            throw error;
        }
    }

    /**
     * Explore a folder (get directory contents)
     */
    static async exploreFolder(path: string): Promise<ExplorerEntry[]> {
        try {
            // @ts-ignore - Wails binding may not be typed
            const result = await (AppBackend as any).ExploreFolder(path);
            return (result as ExplorerEntry[]) || [];
        } catch (error) {
            console.error('[AppAPI] Failed to explore folder:', error);
            throw error;
        }
    }
}
