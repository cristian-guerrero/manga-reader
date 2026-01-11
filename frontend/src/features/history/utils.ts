/**
 * History Utilities - Helper functions for history feature
 */

import type { HistoryEntry } from './types';

export function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateString;
    }
}

export function getProgress(entry: HistoryEntry): number {
    if (entry.totalImages === 0) return 0;
    return Math.round(((entry.lastImageIndex + 1) / entry.totalImages) * 100);
}
