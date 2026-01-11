/**
 * Download API Service - Operations related to manga downloads
 */

import * as AppBackend from '../../../wailsjs/go/main/App';
import { errorService } from '../errorService';

export interface DownloadJob {
    id: string;
    url: string;
    site: string;
    seriesName: string;
    chapterName: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    totalPages: number;
    error?: string;
    createdAt: string;
    path: string;
}

export class DownloadAPI {
    /**
     * Fetch manga info from URL
     */
    static async fetchMangaInfo(url: string): Promise<any> {
        try {
            const result = await AppBackend.FetchMangaInfo(url);
            return result || null;
        } catch (error) {
            errorService.handle(error, {
                component: 'DownloadAPI',
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
                component: 'DownloadAPI',
                action: 'startDownload',
                details: { url }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Get download history
     */
    static async getDownloadHistory(): Promise<DownloadJob[]> {
        try {
            const result = await AppBackend.GetDownloadHistory();
            return (result as any) || [];
        } catch (error) {
            errorService.handle(error, {
                component: 'DownloadAPI',
                action: 'getDownloadHistory'
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Clear download history
     */
    static async clearDownloadHistory(): Promise<void> {
        try {
            await AppBackend.ClearDownloadHistory();
        } catch (error) {
            errorService.handle(error, {
                component: 'DownloadAPI',
                action: 'clearDownloadHistory'
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Remove a download job
     */
    static async removeDownloadJob(id: string): Promise<void> {
        try {
            await AppBackend.RemoveDownloadJob(id);
        } catch (error) {
            errorService.handle(error, {
                component: 'DownloadAPI',
                action: 'removeDownloadJob',
                details: { id }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Resume incomplete downloads
     */
    static async resumeIncompleteDownloads(enable: boolean): Promise<void> {
        try {
            await (AppBackend as any).ResumeIncompleteDownloads(enable);
        } catch (error) {
            errorService.handle(error, {
                component: 'DownloadAPI',
                action: 'resumeIncompleteDownloads',
                details: { enable }
            }, { showToast: false });
            // Don't throw - resume failure shouldn't break the app
        }
    }

    /**
     * Add downloaded folder to library
     */
    static async addDownloadedFolder(path: string): Promise<string> {
        try {
            const result = await (AppBackend as any).AddDownloadedFolder(path);
            return result || '';
        } catch (error) {
            errorService.handle(error, {
                component: 'DownloadAPI',
                action: 'addDownloadedFolder',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Add downloaded series to library
     */
    static async addDownloadedSeries(path: string): Promise<string> {
        try {
            const result = await (AppBackend as any).AddDownloadedSeries(path);
            return result || '';
        } catch (error) {
            errorService.handle(error, {
                component: 'DownloadAPI',
                action: 'addDownloadedSeries',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Open folder in file manager
     */
    static async openInFileManager(path: string): Promise<void> {
        try {
            await (AppBackend as any).OpenInFileManager(path);
        } catch (error) {
            errorService.handle(error, {
                component: 'DownloadAPI',
                action: 'openInFileManager',
                details: { path }
            }, { showToast: false });
            // Don't throw - file manager opening failure shouldn't break the app
        }
    }
}
