/**
 * useDownloadGrouping - Hook to group download jobs by series
 */

import { useMemo, useState, useCallback } from 'react';
import type { DownloadJob, GroupedDownloadItem } from '../types';

export function useDownloadGrouping(jobs: DownloadJob[]) {
    const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());

    const toggleSeries = useCallback((seriesName: string) => {
        setExpandedSeries((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(seriesName)) {
                newSet.delete(seriesName);
            } else {
                newSet.add(seriesName);
            }
            return newSet;
        });
    }, []);

    const expandSeries = useCallback((seriesName: string) => {
        setExpandedSeries((prev) => new Set([...prev, seriesName]));
    }, []);

    const groupedHistory = useMemo<GroupedDownloadItem[]>(() => {
        const items: GroupedDownloadItem[] = [];
        const seriesMap = new Map<string, DownloadJob[]>();
        const individualItems: Array<{ type: 'single'; job: DownloadJob }> = [];
        const seriesItems: Array<{ type: 'series'; name: string; jobs: DownloadJob[] }> = [];

        // First pass: Group all jobs by series name
        jobs.forEach((job) => {
            const sName = job.seriesName;
            if (sName && sName !== 'Unknown Series' && sName !== 'Unknown') {
                if (!seriesMap.has(sName)) {
                    seriesMap.set(sName, []);
                }
                seriesMap.get(sName)!.push(job);
            }
        });

        // Second pass: Determine which jobs should be shown individually vs in series groups
        const jobsInSeries = new Set<string>(); // Track job IDs that belong to series with 2+ chapters
        
        seriesMap.forEach((jobs, name) => {
            if (jobs.length >= 2) {
                // This is a series with 2+ chapters - mark all jobs as belonging to this series
                jobs.forEach(job => jobsInSeries.add(job.id));
                // Sort jobs by creation date (newest first)
                const sortedJobs = [...jobs].sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                seriesItems.push({ type: 'series', name, jobs: sortedJobs });
            }
        });

        // Only add individual items for jobs that don't belong to any series with 2+ chapters
        jobs.forEach((job) => {
            if (!jobsInSeries.has(job.id)) {
                individualItems.push({ type: 'single', job });
            }
        });

        // Add individual items first
        items.push(...individualItems);

        // Then add series items
        items.push(...seriesItems);

        // Sort everything chronologically by creation date (newest first)
        return items.sort((a, b) => {
            const timeA = a.type === 'single' 
                ? new Date(a.job.createdAt).getTime() 
                : Math.max(...a.jobs.map(j => new Date(j.createdAt).getTime()));
            const timeB = b.type === 'single' 
                ? new Date(b.job.createdAt).getTime() 
                : Math.max(...b.jobs.map(j => new Date(j.createdAt).getTime()));
            return timeB - timeA; // Newest first
        });
    }, [jobs]);

    return {
        groupedHistory,
        expandedSeries,
        toggleSeries,
        expandSeries,
    };
}
