/**
 * Download API Service - Operations related to manga downloads
 */

import * as AppBackend from '../../../wailsjs/go/main/App';
import { errorService } from '../errorService';

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
}
