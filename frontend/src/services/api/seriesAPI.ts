/**
 * Series API Service - Operations related to series
 */

import * as AppBackend from '../../../wailsjs/go/main/App';
import { errorService } from '../errorService';

export class SeriesAPI {
    /**
     * Get all series
     */
    static async getSeries(): Promise<any[]> {
        try {
            const result = await AppBackend.GetSeries();
            return (result as any[]) || [];
        } catch (error) {
            errorService.handle(error, {
                component: 'SeriesAPI',
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
                component: 'SeriesAPI',
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
                component: 'SeriesAPI',
                action: 'clearSeries'
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
                component: 'SeriesAPI',
                action: 'getChapterNavigation',
                details: { path }
            }, { showToast: false });
            return null;
        }
    }
}
