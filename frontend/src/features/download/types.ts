/**
 * Download Feature Types
 */

export interface DownloadJob {
    id: string;
    url: string;
    site: string;
    seriesName: string;
    chapterName: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    totalPages: number;
    error?: string;
    createdAt: string;
    path: string;
}

export type GroupedDownloadItem = 
    | { type: 'single'; job: DownloadJob }
    | { type: 'series'; name: string; jobs: DownloadJob[] };
