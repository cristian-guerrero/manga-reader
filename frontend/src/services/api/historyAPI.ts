/**
 * History API Service - Operations related to reading history
 */

import { HistoryEntry } from '../../types';
import * as AppBackend from '../../../wailsjs/go/main/App';
import { persistence } from '../../../wailsjs/go/models';
import { BaseAPI } from './baseAPI';

export class HistoryAPI extends BaseAPI {
    /**
     * Get history entry for a folder
     */
    static async getHistoryEntry(path: string): Promise<HistoryEntry | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.GetHistoryEntry(path);
                return (result as HistoryEntry) || null;
            },
            {
                component: 'HistoryAPI',
                action: 'getHistoryEntry',
                details: { path }
            }
        );
    }

    /**
     * Add or update history entry
     */
    static async addHistory(entry: Omit<HistoryEntry, 'id'>): Promise<void> {
        return this.callVoid(
            async () => {
                // Convert to persistence.HistoryEntry format (Wails expects id)
                const historyEntry: persistence.HistoryEntry = {
                    id: '', // Wails will generate the ID on the backend
                    folderPath: entry.folderPath,
                    folderName: entry.folderName,
                    lastImage: entry.lastImage,
                    lastImageIndex: entry.lastImageIndex,
                    scrollPosition: entry.scrollPosition,
                    totalImages: entry.totalImages,
                    lastRead: entry.lastRead,
                };
                await AppBackend.AddHistory(historyEntry);
            },
            {
                component: 'HistoryAPI',
                action: 'addHistory',
                details: { folderPath: entry.folderPath }
            }
        );
    }

    /**
     * Get all history entries
     */
    static async getHistory(): Promise<HistoryEntry[]> {
        return this.callOrEmpty(
            async () => {
                const result = await AppBackend.GetHistory();
                return (result as HistoryEntry[]) || [];
            },
            {
                component: 'HistoryAPI',
                action: 'getHistory'
            }
        );
    }

    /**
     * Remove a history entry
     */
    static async removeHistory(path: string): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.RemoveHistory(path);
            },
            {
                component: 'HistoryAPI',
                action: 'removeHistory',
                details: { path }
            }
        );
    }

    /**
     * Clear all history
     */
    static async clearHistory(): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.ClearHistory();
            },
            {
                component: 'HistoryAPI',
                action: 'clearHistory'
            }
        );
    }
}
