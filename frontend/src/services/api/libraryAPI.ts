/**
 * Library API Service - Operations related to library management
 */

import { FolderInfo } from '../../types';
import * as AppBackend from '../../../wailsjs/go/main/App';
import { BaseFolder } from './appAPI';
import { BaseAPI } from './baseAPI';

export class LibraryAPI extends BaseAPI {
    /**
     * Add a base folder to explorer
     */
    static async addBaseFolder(path: string): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.AddBaseFolder(path);
            },
            {
                component: 'LibraryAPI',
                action: 'addBaseFolder',
                details: { path }
            }
        );
    }

    /**
     * Remove a base folder from explorer
     */
    static async removeBaseFolder(path: string): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.RemoveBaseFolder(path);
            },
            {
                component: 'LibraryAPI',
                action: 'removeBaseFolder',
                details: { path }
            }
        );
    }

    /**
     * Get all base folders for explorer
     */
    static async getBaseFolders(): Promise<BaseFolder[]> {
        return this.callOrEmpty(
            async () => {
                const result = await AppBackend.GetBaseFolders();
                return (result as BaseFolder[]) || [];
            },
            {
                component: 'LibraryAPI',
                action: 'getBaseFolders'
            }
        );
    }

    /**
     * Get library entries
     */
    static async getLibrary(): Promise<FolderInfo[]> {
        return this.callOrEmpty(
            async () => {
                const result = await AppBackend.GetLibrary();
                return (result as FolderInfo[]) || [];
            },
            {
                component: 'LibraryAPI',
                action: 'getLibrary'
            }
        );
    }

    /**
     * Remove a library entry
     */
    static async removeLibraryEntry(path: string): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.RemoveLibraryEntry(path);
            },
            {
                component: 'LibraryAPI',
                action: 'removeLibraryEntry',
                details: { path }
            }
        );
    }

    /**
     * Clear all library entries
     */
    static async clearLibrary(): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.ClearLibrary();
            },
            {
                component: 'LibraryAPI',
                action: 'clearLibrary'
            }
        );
    }
}
