/**
 * Download API Service - Operations related to manga downloads
 */

import * as AppBackend from '../../../wailsjs/go/main/App';
import { BaseAPI } from './baseAPI';

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

export class DownloadAPI extends BaseAPI {
    /**
     * Fetch manga info from URL
     */
    static async fetchMangaInfo(url: string): Promise<any> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.FetchMangaInfo(url);
                return result || null;
            },
            {
                component: 'DownloadAPI',
                action: 'fetchMangaInfo',
                details: { url }
            }
        );
    }

    /**
     * Start download from URL
     * Throws error on failure (no defaultValue to allow proper error handling)
     */
    static async startDownload(url: string, seriesPath: string = '', chapterPath: string = ''): Promise<string> {
        return this.call(
            async () => {
                const result = await AppBackend.StartDownload(url, seriesPath, chapterPath);
                if (!result || result === '') {
                    throw new Error('Failed to start download: backend returned empty result');
                }
                return result;
            },
            {
                component: 'DownloadAPI',
                action: 'startDownload',
                details: { url }
                // No defaultValue - let error propagate so caller can handle it properly
            }
        );
    }

    /**
     * Get download history
     */
    static async getDownloadHistory(): Promise<DownloadJob[]> {
        return this.callOrEmpty(
            async () => {
                const result = await AppBackend.GetDownloadHistory();
                return (result as DownloadJob[]) || [];
            },
            {
                component: 'DownloadAPI',
                action: 'getDownloadHistory'
            }
        );
    }

    /**
     * Clear download history
     */
    static async clearDownloadHistory(): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.ClearDownloadHistory();
            },
            {
                component: 'DownloadAPI',
                action: 'clearDownloadHistory'
            }
        );
    }

    /**
     * Remove a download job
     */
    static async removeDownloadJob(id: string): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.RemoveDownloadJob(id);
            },
            {
                component: 'DownloadAPI',
                action: 'removeDownloadJob',
                details: { id }
            }
        );
    }

    /**
     * Resume incomplete downloads
     * Note: Doesn't throw on error - resume failure shouldn't break the app
     */
    static async resumeIncompleteDownloads(enable: boolean): Promise<void> {
        return this.call(
            async () => {
                await (AppBackend as any).ResumeIncompleteDownloads(enable);
            },
            {
                component: 'DownloadAPI',
                action: 'resumeIncompleteDownloads',
                details: { enable },
                defaultValue: undefined // Don't throw, but return void
            } as any
        ).catch(() => {
            // Silently fail - resume failure shouldn't break the app
        });
    }

    /**
     * Add downloaded folder to library
     */
    static async addDownloadedFolder(path: string): Promise<string> {
        return this.call(
            async () => {
                const result = await (AppBackend as any).AddDownloadedFolder(path);
                return result || '';
            },
            {
                component: 'DownloadAPI',
                action: 'addDownloadedFolder',
                details: { path },
                defaultValue: '' // Return empty string on error
            }
        );
    }

    /**
     * Add downloaded series to library
     */
    static async addDownloadedSeries(path: string): Promise<string> {
        return this.call(
            async () => {
                const result = await (AppBackend as any).AddDownloadedSeries(path);
                return result || '';
            },
            {
                component: 'DownloadAPI',
                action: 'addDownloadedSeries',
                details: { path },
                defaultValue: '' // Return empty string on error
            }
        );
    }

    /**
     * Open folder in file manager
     * Note: Doesn't throw on error - file manager opening failure shouldn't break the app
     */
    static async openInFileManager(path: string): Promise<void> {
        return this.call(
            async () => {
                await (AppBackend as any).OpenInFileManager(path);
            },
            {
                component: 'DownloadAPI',
                action: 'openInFileManager',
                details: { path },
                defaultValue: undefined // Don't throw, but return void
            } as any
        ).catch(() => {
            // Silently fail - file manager opening failure shouldn't break the app
        });
    }

    /**
     * Get download algorithm concurrency config
     */
    static async getDownloadAlgorithmConfig(): Promise<Record<string, { maxParallelChapters: number; maxParallelImages: number }>> {
        return this.call(
            async () => {
                const result = await (AppBackend as any).GetDownloadAlgorithmConfig();
                return (result as Record<string, { maxParallelChapters: number; maxParallelImages: number }>) || {};
            },
            {
                component: 'DownloadAPI',
                action: 'getDownloadAlgorithmConfig',
                defaultValue: {}
            }
        );
    }

    /**
     * Save download algorithm concurrency config
     */
    static async saveDownloadAlgorithmConfig(config: Record<string, { maxParallelChapters: number; maxParallelImages: number }>): Promise<void> {
        return this.callVoid(
            async () => {
                await (AppBackend as any).SaveDownloadAlgorithmConfig(config);
            },
            {
                component: 'DownloadAPI',
                action: 'saveDownloadAlgorithmConfig'
            }
        );
    }
}
