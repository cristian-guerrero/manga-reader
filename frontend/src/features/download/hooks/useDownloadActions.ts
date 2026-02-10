/**
 * useDownloadActions - Hook to handle download actions (start, cancel, remove, etc.)
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@hooks';
import { useToast } from '@shared/components';
import { DownloadAPI, AppAPI } from '@services/api';
import { FolderAPI } from '@services/api/folderAPI';
import { downloader } from '../../../../wailsjs/go/models';
import type { DownloadJob } from '../types';

export function useDownloadActions(onHistoryReload: () => void) {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { navigate } = useNavigation();
    const [isLoading, setIsLoading] = useState(false);
    const [seriesInfo, setSeriesInfo] = useState<downloader.SiteInfo | null>(null);
    const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
    const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);

    const handleStartDownload = useCallback(async (url: string) => {
        if (!url) return;

        setIsLoading(true);
        try {
            // First check if it is a series or single chapter
            const info = await DownloadAPI.fetchMangaInfo(url);

            // Check if info is null (fetchMangaInfo can return null on error)
            if (!info) {
                // If fetchMangaInfo failed, try to start download anyway
                // This handles cases where the URL might still be valid
                const jobId = await DownloadAPI.startDownload(url, "", "");
                
                // Reload history to get the latest state
                await onHistoryReload();
                
                // Check if the job already existed and was completed
                const jobs = await DownloadAPI.getDownloadHistory();
                const existingJob = jobs.find((j: any) => j.id === jobId);
                
                if (existingJob && existingJob.status === 'completed') {
                    showToast(t('download.alreadyDownloaded') || 'Already downloaded', 'info');
                } else {
                    showToast(t('common.success'), 'success');
                }
                return;
            }

            if (info.Type === 'series') {
                setSeriesInfo(info);
                // Start with empty selection so user must choose
                setSelectedChapters(new Set());
                setIsSeriesModalOpen(true);
            } else {
                // It's a single chapter, start download directly
                const jobId = await DownloadAPI.startDownload(url, "", "");
                
                // Reload history to get the latest state
                await onHistoryReload();
                
                // Check if the job already existed and was completed
                const jobs = await DownloadAPI.getDownloadHistory();
                const existingJob = jobs.find((j: any) => j.id === jobId);
                
                if (existingJob && existingJob.status === 'completed') {
                    showToast(t('download.alreadyDownloaded') || 'Already downloaded', 'info');
                } else {
                    showToast(t('common.success'), 'success');
                }
            }
        } catch (err: any) {
            showToast(err.toString(), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast, t, onHistoryReload]);

    const handleDownloadSeries = useCallback(async () => {
        if (!seriesInfo) return;

        const chapters = seriesInfo.Chapters || [];
        const chaptersToDownload = chapters.filter((c: any) => selectedChapters.has(c.ID));

        if (chaptersToDownload.length === 0) {
            showToast("No chapters selected", "error");
            return;
        }

        setIsLoading(true);
        setIsSeriesModalOpen(false);

        let started = 0;
        let alreadyDownloaded = 0;
        const jobIds: string[] = [];
        
        for (const chapter of chaptersToDownload) {
            try {
                const jobId = await DownloadAPI.startDownload(chapter.URL, seriesInfo.SeriesName, chapter.Name);
                jobIds.push(jobId);
                started++;
            } catch (err) {
                console.error(`Failed to start download for ${chapter.Name}:`, err);
            }
        }

        // Reload history to get the latest state
        await onHistoryReload();
        
        // Check which jobs were already completed
        const jobs = await DownloadAPI.getDownloadHistory();
        for (const jobId of jobIds) {
            const job = jobs.find((j: any) => j.id === jobId);
            if (job && job.status === 'completed') {
                alreadyDownloaded++;
            }
        }

        if (alreadyDownloaded > 0 && alreadyDownloaded === started) {
            showToast(t('download.allAlreadyDownloaded') || 'All chapters already downloaded', 'info');
        } else if (alreadyDownloaded > 0) {
            showToast(`${started - alreadyDownloaded} new, ${alreadyDownloaded} already downloaded`, 'info');
        } else {
            showToast(`Started ${started} downloads`, 'success');
        }
        
        setIsLoading(false);
        setSeriesInfo(null);
        setSelectedChapters(new Set());

        return seriesInfo.SeriesName;
    }, [seriesInfo, selectedChapters, showToast, t, onHistoryReload]);

    const handleClearHistory = useCallback(async () => {
        await DownloadAPI.clearDownloadHistory();
        onHistoryReload();
    }, [onHistoryReload]);

    const handleRemoveJob = useCallback(async (id: string) => {
        await DownloadAPI.removeDownloadJob(id);
        onHistoryReload();
    }, [onHistoryReload]);

    const handleResumeDownload = useCallback(async (job: DownloadJob) => {
        try {
            await DownloadAPI.startDownload(job.url, job.seriesName, job.chapterName);
            showToast(t('download.resumed') || 'Download resumed', 'success');
            await onHistoryReload();
        } catch (err: any) {
            showToast(err.toString(), 'error');
        }
    }, [showToast, t, onHistoryReload]);

    const handleRemoveSeries = useCallback(async (jobs: DownloadJob[]) => {
        // Remove all jobs in the series
        for (const job of jobs) {
            await DownloadAPI.removeDownloadJob(job.id);
        }
        onHistoryReload();
    }, [onHistoryReload]);

    const handlePlayDownload = useCallback(async (job: DownloadJob) => {
        if (!job.path) return;
        
        try {
            const addedPath = await DownloadAPI.addDownloadedFolder(job.path);
            showToast(t('download.addedToLibrary'), 'success');
            
            // Navigate to viewer - use 'folder' parameter as expected by App.tsx router
            navigate('viewer', { folder: addedPath }, 'oneShot');
        } catch (err: any) {
            showToast(err.toString(), 'error');
        }
    }, [showToast, t, navigate]);

    const handlePlaySeries = useCallback(async (jobs: DownloadJob[]) => {
        // Find a completed job to get the series path
        const completedJob = jobs.find(j => j.status === 'completed' && j.path);
        if (!completedJob?.path) {
            showToast('No completed chapters to play', 'error');
            return;
        }
        
        try {
            const seriesPath = await DownloadAPI.addDownloadedSeries(completedJob.path);
            showToast(t('download.addedToSeries'), 'success');
            
            // Navigate to series details
            navigate('series-details', { series: seriesPath }, 'series');
        } catch (err: any) {
            showToast(err.toString(), 'error');
        }
    }, [showToast, t, navigate]);

    return {
        isLoading,
        seriesInfo,
        selectedChapters,
        setSelectedChapters,
        isSeriesModalOpen,
        setIsSeriesModalOpen,
        handleStartDownload,
        handleDownloadSeries,
        handleClearHistory,
        handleRemoveJob,
        handleResumeDownload,
        handleRemoveSeries,
        handlePlayDownload,
        handlePlaySeries,
    };
}
