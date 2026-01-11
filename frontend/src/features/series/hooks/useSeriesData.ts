/**
 * useSeriesData - Hook to manage series data loading and events
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { EventsOn, EventsOff } from '../../../../wailsjs/runtime';
import { AppAPI } from '@services/api/appAPI';
import type { SeriesEntry } from '@types';

export function useSeriesData(loadThumbnails: (series: SeriesEntry[], getCoverImage: (entry: SeriesEntry) => string | undefined, getId: (entry: SeriesEntry) => string) => void) {
    const [series, setSeries] = useState<SeriesEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [history, setHistory] = useState<any[]>([]);
    const isMountedRef = useRef(true);

    const loadHistory = useCallback(async () => {
        try {
            const data = await AppAPI.getHistory();
            if (data && isMountedRef.current) setHistory(data);
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }, []);

    const loadSeries = useCallback(async () => {
        if (!isMountedRef.current) return;

        try {
            if (isMountedRef.current) {
                setIsLoading(true);
            }

            const data = await AppAPI.getSeries();

            console.log(`[SeriesPage] Series received: ${data?.length || 0} items`);

            if (!isMountedRef.current) return;

            if (data && Array.isArray(data)) {
                setSeries(data);
                setIsLoading(false); // Show UI immediately with data

                // Load thumbnails asynchronously (hook handles existing thumbnailUrl)
                loadThumbnails(data, (entry) => entry.coverImage, (entry) => entry.id);
            } else {
                setSeries([]);
                setIsLoading(false);
            }
        } catch (error) {
            console.error('[SeriesPage] Failed to load series:', error);
            if (isMountedRef.current) {
                setSeries([]);
                setIsLoading(false);
            }
        }
    }, [loadThumbnails]);

    useEffect(() => {
        isMountedRef.current = true;
        let unsubscribeSeries: () => void;
        let unsubscribeHistory: () => void;
        let unsubscribeAppReady: () => void;

        // Try to load immediately - bindings should be available
        loadSeries();
        loadHistory();

        // Listen for app_ready event in case bindings weren't ready immediately
        unsubscribeAppReady = EventsOn('app_ready', () => {
            console.log('[SeriesPage] Received app_ready event');
            if (isMountedRef.current) {
                loadSeries();
                loadHistory();
            }
        });

        unsubscribeSeries = EventsOn('series_updated', () => {
            if (isMountedRef.current) loadSeries();
        });

        unsubscribeHistory = EventsOn('history_updated', () => {
            if (isMountedRef.current) loadHistory();
        });

        return () => {
            isMountedRef.current = false;
            if (unsubscribeSeries) unsubscribeSeries();
            if (unsubscribeHistory) unsubscribeHistory();
            if (unsubscribeAppReady) unsubscribeAppReady();
        };
    }, [loadSeries, loadHistory]);

    const removeSeries = useCallback((path: string) => {
        setSeries((prev) => prev.filter((s) => s.path !== path));
    }, []);

    const clearAll = useCallback(() => {
        setSeries([]);
    }, []);

    return {
        series,
        isLoading,
        history,
        removeSeries,
        clearAll,
    };
}
