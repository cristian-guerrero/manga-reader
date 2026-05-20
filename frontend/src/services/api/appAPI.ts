/**
 * App API Service - Centralized backend API calls
 * Uses Wails generated bindings instead of direct window.go calls
 * 
 * NOTE: This class now delegates to specialized API services.
 * For new code, prefer importing the specific services directly:
 * - FolderAPI, ImageAPI, ThumbnailAPI, HistoryAPI, SeriesAPI, LibraryAPI, etc.
 */

import { FolderInfo, ImageInfo, HistoryEntry, Settings } from '../../types';
import * as AppBackend from '../../../wailsjs/go/main/App';
import { FolderAPI } from './folderAPI';
import { BaseAPI } from './baseAPI';
import { ImageAPI } from './imageAPI';
import { ThumbnailAPI } from './thumbnailAPI';
import { HistoryAPI } from './historyAPI';
import { SeriesAPI } from './seriesAPI';
import { LibraryAPI } from './libraryAPI';
import { ImageOrderAPI } from './imageOrderAPI';
import { DownloadAPI } from './downloadAPI';
import { SettingsAPI } from './settingsAPI';
import { ViewerStateAPI } from './viewerStateAPI';
import { ExplorerAPI } from './explorerAPI';

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
    subdirectoryCount: number;
    coverImage: string;
    thumbnailUrl?: string;
    size: number;
    lastModified: number;
}

export class AppAPI extends BaseAPI {
    // Folder operations - delegate to FolderAPI
    static getFolderInfo = FolderAPI.getFolderInfo;
    static getFolderInfoShallow = FolderAPI.getFolderInfoShallow;
    static exploreFolder = FolderAPI.exploreFolder;
    static resolveFolder = FolderAPI.resolveFolder;
    static addFolder = FolderAPI.addFolder;
    static isSeries = FolderAPI.isSeries;

    static selectFolder = FolderAPI.selectFolder;

    // Image operations - delegate to ImageAPI
    static getImages = ImageAPI.getImages;
    static getImagesShallow = ImageAPI.getImagesShallow;

    // Thumbnail operations - delegate to ThumbnailAPI
    static getThumbnail = ThumbnailAPI.getThumbnail;
    static setThumbnailsPaused = ThumbnailAPI.setThumbnailsPaused;

    // History operations - delegate to HistoryAPI
    static getHistoryEntry = HistoryAPI.getHistoryEntry;
    static addHistory = HistoryAPI.addHistory;
    static getHistory = HistoryAPI.getHistory;
    static removeHistory = HistoryAPI.removeHistory;
    static clearHistory = HistoryAPI.clearHistory;

    // Series operations - delegate to SeriesAPI
    static getSeries = SeriesAPI.getSeries;
    static removeSeries = SeriesAPI.removeSeries;
    static clearSeries = SeriesAPI.clearSeries;
    static getChapterNavigation = SeriesAPI.getChapterNavigation;

    // Explorer operations - delegate to ExplorerAPI
    static getFolderNavigation = ExplorerAPI.getFolderNavigation;

    // Library operations - delegate to LibraryAPI
    static addBaseFolder = LibraryAPI.addBaseFolder;
    static removeBaseFolder = LibraryAPI.removeBaseFolder;
    static getBaseFolders = LibraryAPI.getBaseFolders;
    static getLibrary = LibraryAPI.getLibrary;
    static removeLibraryEntry = LibraryAPI.removeLibraryEntry;
    static clearLibrary = LibraryAPI.clearLibrary;

    // Image order operations - delegate to ImageOrderAPI
    static hasCustomOrder = ImageOrderAPI.hasCustomOrder;
    static getOriginalOrder = ImageOrderAPI.getOriginalOrder;
    static saveImageOrder = ImageOrderAPI.saveImageOrder;
    static resetImageOrder = ImageOrderAPI.resetImageOrder;

    // Download operations - delegate to DownloadAPI
    static fetchMangaInfo = DownloadAPI.fetchMangaInfo;
    static startDownload = DownloadAPI.startDownload;
    static getDownloadHistory = DownloadAPI.getDownloadHistory;
    static clearDownloadHistory = DownloadAPI.clearDownloadHistory;
    static removeDownloadJob = DownloadAPI.removeDownloadJob;
    static resumeIncompleteDownloads = DownloadAPI.resumeIncompleteDownloads;
    static addDownloadedFolder = DownloadAPI.addDownloadedFolder;
    static addDownloadedSeries = DownloadAPI.addDownloadedSeries;
    static openInFileManager = DownloadAPI.openInFileManager;

    // Settings operations - delegate to SettingsAPI
    static getSettings = SettingsAPI.getSettings;
    static updateSettings = SettingsAPI.updateSettings;
    static saveSettings = SettingsAPI.saveSettings;

    // Viewer State operations - delegate to ViewerStateAPI
    static getViewerState = ViewerStateAPI.getViewerState;
    static saveViewerState = ViewerStateAPI.saveViewerState;

    /**
     * Clear all data (history, library, series, etc.)
     */
    static async clearAllData(): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.ClearAllData();
            },
            {
                component: 'AppAPI',
                action: 'clearAllData'
            }
        );
    }

    /**
     * Update taskbar icon
     * Note: Doesn't throw on error - taskbar icon update failure shouldn't break the app
     */
    static async updateTaskbarIcon(iconData: string): Promise<void> {
        return this.call(
            async () => {
                await AppBackend.UpdateTaskbarIcon(iconData);
            },
            {
                component: 'AppAPI',
                action: 'updateTaskbarIcon',
                defaultValue: undefined // Don't throw, but return void
            } as any
        ).catch(() => {
            // Silently fail - taskbar icon update failure shouldn't break the app
        });
    }
}
