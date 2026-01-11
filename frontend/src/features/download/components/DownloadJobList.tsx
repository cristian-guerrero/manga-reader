/**
 * DownloadJobList - Component to render list of download jobs (single and grouped)
 * Extracted from DownloadPage for better separation of concerns
 */

import { useTranslation } from 'react-i18next';
import type { GroupedDownloadItem, DownloadJob } from '../types';
import { DownloadJobItem } from './DownloadJobItem';
import { SeriesGroup } from './SeriesGroup';

interface DownloadJobListProps {
    groupedHistory: GroupedDownloadItem[];
    expandedSeries: Set<string>;
    toggleSeries: (seriesName: string) => void;
    autoResumeDownloads: boolean;
    onRemoveJob: (id: string) => void;
    onResumeDownload: (job: DownloadJob) => void;
    onRemoveSeries: (jobs: DownloadJob[]) => void;
    onPlayDownload: (job: DownloadJob) => void;
    onPlaySeries: (jobs: DownloadJob[]) => void;
}

export function DownloadJobList({
    groupedHistory,
    expandedSeries,
    toggleSeries,
    autoResumeDownloads,
    onRemoveJob,
    onResumeDownload,
    onRemoveSeries,
    onPlayDownload,
    onPlaySeries,
}: DownloadJobListProps) {
    const { t } = useTranslation();

    if (groupedHistory.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <p style={{ color: 'var(--color-text-secondary)' }}>{t('download.noDownloads')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {groupedHistory.map((item, index) => {
                if (item.type === 'single') {
                    return (
                        <DownloadJobItem
                            key={item.job.id}
                            job={item.job}
                            autoResumeDownloads={autoResumeDownloads}
                            onRemove={onRemoveJob}
                            onResume={onResumeDownload}
                            onPlay={onPlayDownload}
                        />
                    );
                } else {
                    return (
                        <SeriesGroup
                            key={item.name + index}
                            name={item.name}
                            jobs={item.jobs}
                            isExpanded={expandedSeries.has(item.name)}
                            onToggle={toggleSeries}
                            autoResumeDownloads={autoResumeDownloads}
                            onRemoveSeries={onRemoveSeries}
                            onPlaySeries={onPlaySeries}
                            onRemoveJob={onRemoveJob}
                            onResumeJob={onResumeDownload}
                            onPlayJob={onPlayDownload}
                        />
                    );
                }
            })}
        </div>
    );
}
