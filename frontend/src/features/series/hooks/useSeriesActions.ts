/**
 * useSeriesActions - Hook to handle series actions (select, open, play, remove, clear)
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@hooks';
import { useTabStore } from '@stores';
import { AppAPI } from '@services/api/appAPI';
import type { SeriesEntry } from '@types';

export function useSeriesActions(
    history: any[],
    onRemoveSeries: (path: string) => void,
    onClearAll: () => void
) {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { addTab } = useTabStore();

    const handleSelectFolder = useCallback(async () => {
        try {
            const folderPath = await AppAPI.selectFolder();
            if (folderPath) {
                await AppAPI.addFolder(folderPath);
                // The event 'series_updated' will trigger reloading if it was a series
                // If it was a folder, it will be added to library
            }
        } catch (error) {
            console.error('Failed to select folder:', error);
        }
    }, []);

    const handleOpenSeries = useCallback((entry: SeriesEntry) => {
        // Maintain 'series' as active menu page when viewing series details
        navigate('series-details', { series: entry.path }, 'series');
    }, [navigate]);

    const handleAuxClick = useCallback((e: React.MouseEvent, entry: SeriesEntry) => {
        if (e.button === 1) { // Middle click
            e.preventDefault();
            e.stopPropagation();
            addTab('series-details', { series: entry.path }, entry.name, {}, false);
        }
    }, [addTab]);

    const handlePlaySeries = useCallback((entry: SeriesEntry, e: React.MouseEvent) => {
        e.stopPropagation();

        if (!entry.chapters || entry.chapters.length === 0) return;

        // Find if any chapter is in history
        const chapterPaths = entry.chapters.map(c => c.path);
        const lastRead = history
            .filter(h => chapterPaths.includes(h.folderPath))
            .sort((a, b) => new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime())[0];

        // Maintain 'series' as active menu page when viewing a chapter from series
        if (lastRead) {
            navigate('viewer', { folder: lastRead.folderPath }, 'series');
        } else {
            // Play first chapter
            navigate('viewer', { folder: entry.chapters[0].path }, 'series');
        }
    }, [history, navigate]);

    const handleRemoveSeries = useCallback(async (entry: SeriesEntry, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await AppAPI.removeSeries(entry.path);
            onRemoveSeries(entry.path);
        } catch (error) {
            console.error('Failed to remove series:', error);
        }
    }, [onRemoveSeries]);

    const handleClearAll = useCallback(async () => {
        if (!window.confirm(t('series.confirmClear'))) return;
        try {
            await AppAPI.clearSeries();
            onClearAll();
        } catch (error) {
            console.error('Failed to clear series:', error);
        }
    }, [t, onClearAll]);

    return {
        handleSelectFolder,
        handleOpenSeries,
        handleAuxClick,
        handlePlaySeries,
        handleRemoveSeries,
        handleClearAll,
    };
}
