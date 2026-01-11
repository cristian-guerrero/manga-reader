/**
 * App API Service - Centralized backend API calls
 * Uses Wails generated bindings instead of direct window.go calls
 */

import { FolderInfo, ImageInfo, HistoryEntry } from '../../types';
import * as AppBackend from '../../../wailsjs/go/main/App';
import { persistence, series } from '../../../wailsjs/go/models';

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
}
