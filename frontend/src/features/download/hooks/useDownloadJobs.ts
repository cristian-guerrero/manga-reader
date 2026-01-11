/**
 * useDownloadJobs - Hook to manage download jobs state and loading
 */

import { useState, useEffect, useCallback } from 'react';
import { EventsOn } from '../../../../wailsjs/runtime/runtime';
import { DownloadAPI } from '@services/api/downloadAPI';
import { useSettingsStore } from '@stores';
import type { DownloadJob } from '../types';

export function useDownloadJobs() {
    const [history, setHistory] = useState<DownloadJob[]>([]);
    const autoResumeDownloads = useSettingsStore((state: any) => state.autoResumeDownloads);

    const loadHistory = useCallback(async () => {
        try {
            const jobs = await DownloadAPI.getDownloadHistory();
            setHistory(jobs);
        } catch (err) {
            console.error('Failed to load download history:', err);
        }
    }, []);

    useEffect(() => {
        loadHistory();

        // Auto-resume incomplete downloads if toggle is active
        if (autoResumeDownloads) {
            DownloadAPI.resumeIncompleteDownloads(true).catch((err: any) => {
                console.error('Failed to auto-resume downloads:', err);
            });
        }

        // Listen for updates from backend
        const unoff = EventsOn('download_updated', () => {
            loadHistory();
        });

        return () => unoff();
    }, [loadHistory, autoResumeDownloads]);

    return {
        history,
        loadHistory,
    };
}
