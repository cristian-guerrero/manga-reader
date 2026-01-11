/**
 * Folder API Service - Operations related to folders
 */

import { FolderInfo } from '../../types';
import * as AppBackend from '../../../wailsjs/go/main/App';
import { BaseFolder, ExplorerEntry } from './appAPI';
import { BaseAPI } from './baseAPI';

export class FolderAPI extends BaseAPI {
    /**
     * Get folder information (recursive scan)
     */
    static async getFolderInfo(path: string): Promise<FolderInfo | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.GetFolderInfo(path);
                return (result as FolderInfo) || null;
            },
            {
                component: 'FolderAPI',
                action: 'getFolderInfo',
                details: { path }
            }
        );
    }

    /**
     * Get folder information (shallow scan - only immediate directory)
     */
    static async getFolderInfoShallow(path: string): Promise<FolderInfo | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.GetFolderInfoShallow(path);
                return (result as FolderInfo) || null;
            },
            {
                component: 'FolderAPI',
                action: 'getFolderInfoShallow',
                details: { path }
            }
        );
    }

    /**
     * Explore a folder (get directory contents)
     */
    static async exploreFolder(path: string): Promise<ExplorerEntry[]> {
        return this.callOrEmpty(
            async () => {
                const result = await AppBackend.ExploreFolder(path);
                return (result as ExplorerEntry[]) || [];
            },
            {
                component: 'FolderAPI',
                action: 'exploreFolder',
                details: { path }
            }
        );
    }

    /**
     * Resolve folder path (if file is dropped, get its parent folder)
     */
    static async resolveFolder(path: string): Promise<string> {
        return this.call(
            async () => {
                const result = await AppBackend.ResolveFolder(path);
                return result || path;
            },
            {
                component: 'FolderAPI',
                action: 'resolveFolder',
                details: { path },
                defaultValue: path // Fallback to original path on error
            }
        );
    }

    /**
     * Add folder to library (returns path and isSeries flag)
     */
    static async addFolder(path: string): Promise<{ path: string; isSeries: boolean } | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.AddFolder(path);
                return result ? {
                    path: result.path || path,
                    isSeries: result.isSeries || false
                } : null;
            },
            {
                component: 'FolderAPI',
                action: 'addFolder',
                details: { path }
            }
        );
    }

    /**
     * Check if a folder is a series
     */
    static async isSeries(path: string): Promise<boolean> {
        return this.callOrFalse(
            async () => {
                const result = await AppBackend.IsSeries(path);
                return result || false;
            },
            {
                component: 'FolderAPI',
                action: 'isSeries',
                details: { path }
            }
        );
    }

    /**
     * Select a folder using system dialog
     */
    static async selectFolder(): Promise<string | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.SelectFolder();
                return result || null;
            },
            {
                component: 'FolderAPI',
                action: 'selectFolder'
            }
        );
    }
}
