/**
 * Series API Service - Operations related to series
 */

import * as AppBackend from '../../../wailsjs/go/main/App';
import { BaseAPI } from './baseAPI';

export class SeriesAPI extends BaseAPI {
    /**
     * Get all series
     */
    static async getSeries(): Promise<any[]> {
        return this.callOrEmpty(
            async () => {
                const result = await AppBackend.GetSeries();
                return (result as any[]) || [];
            },
            {
                component: 'SeriesAPI',
                action: 'getSeries'
            }
        );
    }

    /**
     * Remove a series
     */
    static async removeSeries(path: string): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.RemoveSeries(path);
            },
            {
                component: 'SeriesAPI',
                action: 'removeSeries',
                details: { path }
            }
        );
    }

    /**
     * Clear all series
     */
    static async clearSeries(): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.ClearSeries();
            },
            {
                component: 'SeriesAPI',
                action: 'clearSeries'
            }
        );
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
        return this.callOrNull(
            async () => {
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
            },
            {
                component: 'SeriesAPI',
                action: 'getChapterNavigation',
                details: { path }
            }
        );
    }
}
