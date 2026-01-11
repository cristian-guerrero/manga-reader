/**
 * SeriesGroup - Component to render a series group with expandable chapters
 * Simplified version extracted from DownloadPage
 */

import { useTranslation } from 'react-i18next';
import { Tooltip } from '@shared/components';
import { DownloadAPI } from '@services/api/downloadAPI';
import type { DownloadJob } from '../types';
import { DownloadJobItem } from './DownloadJobItem';

interface SeriesGroupProps {
    name: string;
    jobs: DownloadJob[];
    isExpanded: boolean;
    onToggle: (seriesName: string) => void;
    autoResumeDownloads: boolean;
    onRemoveSeries: (jobs: DownloadJob[]) => void;
    onPlaySeries: (jobs: DownloadJob[]) => void;
    onRemoveJob: (id: string) => void;
    onResumeJob: (job: DownloadJob) => void;
    onPlayJob: (job: DownloadJob) => void;
}

export function SeriesGroup({
    name,
    jobs,
    isExpanded,
    onToggle,
    autoResumeDownloads,
    onRemoveSeries,
    onPlaySeries,
    onRemoveJob,
    onResumeJob,
    onPlayJob,
}: SeriesGroupProps) {
    const { t } = useTranslation();

    const finishedCount = jobs.filter(j => j.status === 'completed').length;
    const runningCount = jobs.filter(j => j.status === 'running').length;

    // Calculate overall series progress
    const calculateSeriesProgress = () => {
        if (jobs.length === 0) return 0;
        
        let totalProgress = 0;
        jobs.forEach(job => {
            if (job.status === 'completed') {
                totalProgress += 1.0; // 100% for completed
            } else if (job.status === 'running' && job.totalPages > 0) {
                totalProgress += job.progress / job.totalPages; // Partial progress
            }
            // pending, failed, cancelled count as 0
        });
        
        return (totalProgress / jobs.length) * 100;
    };
    
    const seriesProgress = calculateSeriesProgress();
    const hasActiveDownloads = runningCount > 0 || (finishedCount < jobs.length && finishedCount > 0);

    const getSeriesPath = (jobs: DownloadJob[]): string | null => {
        const completedJob = jobs.find(j => j.status === 'completed' && j.path);
        if (!completedJob?.path) return null;
        
        const pathParts = completedJob.path.split(/[\\/]/);
        pathParts.pop(); // Remove chapter folder
        return pathParts.join('\\'); // Use Windows path separator
    };

    return (
        <div className="card p-0 overflow-hidden flex flex-col">
            <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => onToggle(name)}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`transition-transform duration-200 text-gray-400 shrink-0 ${isExpanded ? 'rotate-90' : ''}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                            {name}
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {finishedCount} / {jobs.length} chapters completed
                            {runningCount > 0 && ` • ${runningCount} downloading`}
                        </p>
                        {/* Series Progress Bar */}
                        {hasActiveDownloads && (
                            <div className="w-full flex flex-col gap-1 mt-2">
                                <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                    <span>Series Progress: {Math.round(seriesProgress)}%</span>
                                    <span>{finishedCount} / {jobs.length}</span>
                                </div>
                                <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full transition-all duration-300"
                                        style={{
                                            width: `${seriesProgress}%`,
                                            backgroundColor: 'var(--color-accent)'
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Play Series Button */}
                    {finishedCount > 0 && (
                        <Tooltip content={t('download.playSeries')} placement="left">
                            <button
                                onClick={(e) => { e.stopPropagation(); onPlaySeries(jobs); }}
                                className="text-xs font-semibold px-3 py-1.5 rounded transition-colors flex items-center gap-2"
                                style={{
                                    backgroundColor: 'var(--color-accent)',
                                    color: 'white'
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                                {t('download.playSeries')}
                            </button>
                        </Tooltip>
                    )}

                    {/* Open series folder */}
                    {finishedCount > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const seriesPath = getSeriesPath(jobs);
                                if (seriesPath) {
                                    DownloadAPI.openInFileManager(seriesPath);
                                }
                            }}
                            className="text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                color: 'var(--color-text-primary)'
                            }}
                        >
                            {t('download.openFolder')}
                        </button>
                    )}

                    {/* Remove Series Button */}
                    <Tooltip content={t('common.remove') || "Remove"} placement="left">
                        <button
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                onRemoveSeries(jobs); 
                            }}
                            className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
                            style={{ color: 'var(--color-text-secondary)' }}
                            aria-label={t('common.remove') || "Remove"}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </Tooltip>
                </div>
            </div>

            {isExpanded && (
                <div className="border-t border-gray-700/50 bg-black/20">
                    {jobs.map(job => (
                        <div key={job.id} className="p-4 border-b border-gray-700/30 last:border-0 flex flex-col gap-3 pl-12 relative">
                            {/* Connection line visual */}
                            <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-700/30" />
                            <div className="absolute left-6 top-8 w-4 h-px bg-gray-700/30" />

                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                                        {job.chapterName}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                        {job.site}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                        job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                        job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                        job.status === 'running' ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                                        'bg-gray-500/20 text-gray-400'
                                    }`}>
                                        {t(`download.status${job.status.charAt(0).toUpperCase() + job.status.slice(1)}`)}
                                    </span>
                                    {/* Resume button */}
                                    {job.status !== 'completed' && job.status !== 'running' && !autoResumeDownloads && (
                                        <Tooltip content={t('download.resume') || 'Resume download'} placement="left" className="flex-shrink-0">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onResumeJob(job); }}
                                                className="p-1 hover:bg-white/10 rounded transition-colors"
                                                style={{ color: 'var(--color-text-secondary)' }}
                                                aria-label={t('download.resume') || 'Resume'}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                                </svg>
                                            </button>
                                        </Tooltip>
                                    )}
                                    <Tooltip content={t('common.remove') || "Remove"} placement="left" className="flex-shrink-0">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onRemoveJob(job.id); }}
                                            className="p-1 hover:bg-white/10 rounded transition-colors"
                                            style={{ color: 'var(--color-text-secondary)' }}
                                            aria-label={t('common.remove') || "Remove"}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M18 6L6 18M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>

                            {job.status === 'running' && (
                                <div className="w-full flex flex-col gap-1">
                                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                                        <span>{Math.round((job.progress / job.totalPages) * 100)}%</span>
                                        <span>{job.progress} / {job.totalPages}</span>
                                    </div>
                                    <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full transition-all duration-300"
                                            style={{
                                                width: `${(job.progress / job.totalPages) * 100}%`,
                                                backgroundColor: 'var(--color-accent)'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {job.error && (
                                <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded">
                                    {job.error}
                                </p>
                            )}

                            {job.status === 'completed' && job.path && (
                                <div className="flex gap-2 mt-2">
                                    <Tooltip content={t('download.playInViewer')} placement="top">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onPlayJob(job); }}
                                            className="text-xs font-semibold px-3 py-1.5 rounded transition-colors flex items-center gap-2"
                                            style={{
                                                backgroundColor: 'var(--color-accent)',
                                                color: 'white'
                                            }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M8 5v14l11-7z"/>
                                            </svg>
                                            {t('download.playInViewer')}
                                        </button>
                                    </Tooltip>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); DownloadAPI.openInFileManager(job.path); }}
                                        className="text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                                        style={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            color: 'var(--color-text-primary)'
                                        }}
                                    >
                                        {t('download.openFolder')}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
