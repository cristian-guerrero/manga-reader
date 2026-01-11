/**
 * History API Service - Operations related to reading history
 */

import { HistoryEntry } from '../../types';
import * as AppBackend from '../../../wailsjs/go/main/App';
import { persistence } from '../../../wailsjs/go/models';
import { errorService } from '../errorService';

export class HistoryAPI {
    /**
     * Get history entry for a folder
     */
    static async getHistoryEntry(path: string): Promise<HistoryEntry | null> {
        try {
            const result = await AppBackend.GetHistoryEntry(path);
            return result as HistoryEntry || null;
        } catch (error) {
            errorService.handle(error, {
                component: 'HistoryAPI',
                action: 'getHistoryEntry',
                details: { path }
            }, { showToast: false });
            return null;
        }
    }

    /**
     * Add or update history entry
     */
    static async addHistory(entry: Omit<HistoryEntry, 'id'>): Promise<void> {
        try {
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
        } catch (error) {
            errorService.handle(error, {
                component: 'HistoryAPI',
                action: 'addHistory',
                details: { folderPath: entry.folderPath }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Get all history entries
     */
    static async getHistory(): Promise<HistoryEntry[]> {
        try {
            const result = await AppBackend.GetHistory();
            return (result as HistoryEntry[]) || [];
        } catch (error) {
            errorService.handle(error, {
                component: 'HistoryAPI',
                action: 'getHistory'
            }, { showToast: false });
            return [];
        }
    }

    /**
     * Remove a history entry
     */
    static async removeHistory(path: string): Promise<void> {
        try {
            await AppBackend.RemoveHistory(path);
        } catch (error) {
            errorService.handle(error, {
                component: 'HistoryAPI',
                action: 'removeHistory',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Clear all history
     */
    static async clearHistory(): Promise<void> {
        try {
            await AppBackend.ClearHistory();
        } catch (error) {
            errorService.handle(error, {
                component: 'HistoryAPI',
                action: 'clearHistory'
            }, { showToast: false });
            throw error;
        }
    }
}
