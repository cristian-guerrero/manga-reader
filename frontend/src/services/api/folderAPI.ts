/**
 * Folder API Service - Operations related to folders
 */

import { FolderInfo } from '../../types';
import * as AppBackend from '../../../wailsjs/go/main/App';
import { errorService } from '../errorService';
import { BaseFolder, ExplorerEntry } from './appAPI';

export class FolderAPI {
    /**
     * Get folder information (recursive scan)
     */
    static async getFolderInfo(path: string): Promise<FolderInfo | null> {
        try {
            const result = await AppBackend.GetFolderInfo(path);
            return result as FolderInfo || null;
        } catch (error) {
            errorService.handle(error, {
                component: 'FolderAPI',
                action: 'getFolderInfo',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Get folder information (shallow scan - only immediate directory)
     */
    static async getFolderInfoShallow(path: string): Promise<FolderInfo | null> {
        try {
            const result = await AppBackend.GetFolderInfoShallow(path);
            return result as FolderInfo || null;
        } catch (error) {
            errorService.handle(error, {
                component: 'FolderAPI',
                action: 'getFolderInfoShallow',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Explore a folder (get directory contents)
     */
    static async exploreFolder(path: string): Promise<ExplorerEntry[]> {
        try {
            const result = await AppBackend.ExploreFolder(path);
            return (result as ExplorerEntry[]) || [];
        } catch (error) {
            errorService.handle(error, {
                component: 'FolderAPI',
                action: 'exploreFolder',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Resolve folder path (if file is dropped, get its parent folder)
     */
    static async resolveFolder(path: string): Promise<string> {
        try {
            const result = await AppBackend.ResolveFolder(path);
            return result || path;
        } catch (error) {
            errorService.handle(error, {
                component: 'FolderAPI',
                action: 'resolveFolder',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Add folder to library (returns path and isSeries flag)
     */
    static async addFolder(path: string): Promise<{ path: string; isSeries: boolean } | null> {
        try {
            const result = await AppBackend.AddFolder(path);
            return result ? {
                path: result.path || path,
                isSeries: result.isSeries || false
            } : null;
        } catch (error) {
            errorService.handle(error, {
                component: 'FolderAPI',
                action: 'addFolder',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Check if a folder is a series
     */
    static async isSeries(path: string): Promise<boolean> {
        try {
            const result = await AppBackend.IsSeries(path);
            return result || false;
        } catch (error) {
            errorService.handle(error, {
                component: 'FolderAPI',
                action: 'isSeries',
                details: { path }
            }, { showToast: false });
            return false;
        }
    }

    /**
     * Select a folder using system dialog
     */
    static async selectFolder(): Promise<string | null> {
        try {
            const result = await AppBackend.SelectFolder();
            return result || null;
        } catch (error) {
            errorService.handle(error, {
                component: 'FolderAPI',
                action: 'selectFolder'
            }, { showToast: false });
            throw error;
        }
    }
}
