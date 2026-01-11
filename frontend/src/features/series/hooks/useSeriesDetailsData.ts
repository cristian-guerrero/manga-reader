/**
 * useSeriesDetailsData - Hook to manage series details loading
 */

import { useState, useEffect, useCallback } from 'react';
import { AppAPI } from '@services/api/appAPI';
import { useTabStore } from '@stores';
import type { SeriesEntry } from '@types';

interface UseSeriesDetailsDataOptions {
    seriesPath: string;
    tabId?: string;
    loadThumbnails: (chapters: any[], getCoverImage: (chapter: any) => string | undefined, getId: (chapter: any) => string) => void;
}

export function useSeriesDetailsData({ seriesPath, tabId, loadThumbnails }: UseSeriesDetailsDataOptions) {
    const [series, setSeries] = useState<SeriesEntry | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { updateTab, updateActiveTab } = useTabStore();

    const loadSeriesDetails = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await AppAPI.getSeries();
            if (data && Array.isArray(data)) {
                const found = data.find((s: SeriesEntry) => s.path === seriesPath);
                if (found) {
                    setSeries(found);
                    // Update tab title with series name
                    if (tabId) {
                        updateTab(tabId, { title: found.name });
                    } else {
                        updateActiveTab({ title: found.name });
                    }
                    // Load thumbnails (hook handles existing thumbnailUrl)
                    loadThumbnails(found.chapters, (chapter) => chapter.coverImage, (chapter) => chapter.path || '');
                }
            }
        } catch (error) {
            console.error('Failed to load series details:', error);
        } finally {
            setIsLoading(false);
        }
    }, [seriesPath, tabId, loadThumbnails, updateTab, updateActiveTab]);

    useEffect(() => {
        loadSeriesDetails();
    }, [loadSeriesDetails]);

    return {
        series,
        isLoading,
    };
}
