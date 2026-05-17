/**
 * DownloadJobItem - Component to render a single download job
 */

import { useTranslation } from 'react-i18next';
import { Tooltip } from '@shared/components';
import { DownloadAPI } from '@services/api/downloadAPI';
import { ClipboardSetText } from '../../../../wailsjs/runtime';
import type { DownloadJob } from '../types';

interface DownloadJobItemProps {
    job: DownloadJob;
    autoResumeDownloads: boolean;
    onRemove: (id: string) => void;
    onResume: (job: DownloadJob) => void;
    onPlay: (job: DownloadJob) => void;
}

export function DownloadJobItem({ job, autoResumeDownloads, onRemove, onResume, onPlay }: DownloadJobItemProps) {
    const { t } = useTranslation();

    return (
        <div className="card p-3">
            <div className="flex items-center justify-between gap-4">
                {/* Left side: Title and metadata */}
                <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                                {job.seriesName || 'Unknown Series'}
                            </h3>
                            <span className="text-xs shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                                {job.site}
                            </span>
                            <span className="text-xs shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                                •
                            </span>
                            <span className="text-xs shrink-0 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                                {job.chapterName}
                            </span>
                        </div>
                        {/* Progress bar for running downloads */}
                        {job.status === 'running' && (
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 bg-black/20 rounded-full overflow-hidden max-w-xs">
                                    <div
                                        className="h-full transition-all duration-300"
                                        style={{
                                            width: `${(job.progress / job.totalPages) * 100}%`,
                                            backgroundColor: 'var(--color-accent)'
                                        }}
                                    />
                                </div>
                                <span className="text-xs shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                                    {Math.round((job.progress / job.totalPages) * 100)}% ({job.progress}/{job.totalPages})
                                </span>
                            </div>
                        )}
                        {job.error && (
                            <p className="text-xs text-red-400 mt-1 truncate">
                                {job.error}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right side: Status, buttons, and actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Status badge */}
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase shrink-0 ${
                        job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        job.status === 'running' ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                        'bg-gray-500/20 text-gray-400'
                    }`}>
                        {t(`download.status${job.status.charAt(0).toUpperCase() + job.status.slice(1)}`)}
                    </span>

                    {/* Resume button */}
                    {job.status !== 'completed' && job.status !== 'running' && !autoResumeDownloads && (
                        <Tooltip content={t('download.resume') || 'Resume download'} placement="top">
                            <button
                                onClick={() => onResume(job)}
                                className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
                                style={{ color: 'var(--color-text-secondary)' }}
                                aria-label={t('download.resume') || 'Resume'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                            </button>
                        </Tooltip>
                    )}

                    {/* Action buttons - only show when completed */}
                    {job.status === 'completed' && job.path && (
                        <>
                            <Tooltip content={t('download.playInViewer')} placement="top">
                                <button
                                    className="text-xs font-semibold px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 shrink-0"
                                    style={{
                                        backgroundColor: 'var(--color-accent)',
                                        color: 'white'
                                    }}
                                    onClick={() => onPlay(job)}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M8 5v14l11-7z"/>
                                    </svg>
                                    {t('download.playInViewer')}
                                </button>
                            </Tooltip>
                            <button
                                className="text-xs font-semibold px-3 py-1.5 rounded transition-colors shrink-0"
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    color: 'var(--color-text-primary)'
                                }}
                                onClick={() => DownloadAPI.openInFileManager(job.path)}
                            >
                                {t('download.openFolder')}
                            </button>
                        </>
                    )}

                    {/* Copy URL button */}
                    <Tooltip content={t('download.copyUrl') || 'Copy URL'} placement="top">
                        <button
                            onClick={() => ClipboardSetText(job.url)}
                            className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
                            style={{ color: 'var(--color-text-secondary)' }}
                            aria-label={t('download.copyUrl') || 'Copy URL'}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                    </Tooltip>

                    {/* Remove button */}
                    <Tooltip content={t('common.remove') || "Remove"} placement="left">
                        <button
                            onClick={() => onRemove(job.id)}
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
        </div>
    );
}
