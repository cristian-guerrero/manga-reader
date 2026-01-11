/**
 * Library API Service - Operations related to library management
 */

import { FolderInfo } from '../../types';
import * as AppBackend from '../../../wailsjs/go/main/App';
import { errorService } from '../errorService';
import { BaseFolder } from './appAPI';

export class LibraryAPI {
    /**
     * Add a base folder to explorer
     */
    static async addBaseFolder(path: string): Promise<void> {
        try {
            await AppBackend.AddBaseFolder(path);
        } catch (error) {
            errorService.handle(error, {
                component: 'LibraryAPI',
                action: 'addBaseFolder',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Remove a base folder from explorer
     */
    static async removeBaseFolder(path: string): Promise<void> {
        try {
            await AppBackend.RemoveBaseFolder(path);
        } catch (error) {
            errorService.handle(error, {
                component: 'LibraryAPI',
                action: 'removeBaseFolder',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Get all base folders for explorer
     */
    static async getBaseFolders(): Promise<BaseFolder[]> {
        try {
            const result = await AppBackend.GetBaseFolders();
            return (result as BaseFolder[]) || [];
        } catch (error) {
            errorService.handle(error, {
                component: 'LibraryAPI',
                action: 'getBaseFolders'
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Get library entries
     */
    static async getLibrary(): Promise<FolderInfo[]> {
        try {
            const result = await AppBackend.GetLibrary();
            return (result as FolderInfo[]) || [];
        } catch (error) {
            errorService.handle(error, {
                component: 'LibraryAPI',
                action: 'getLibrary'
            }, { showToast: false });
            return [];
        }
    }

    /**
     * Remove a library entry
     */
    static async removeLibraryEntry(path: string): Promise<void> {
        try {
            await AppBackend.RemoveLibraryEntry(path);
        } catch (error) {
            errorService.handle(error, {
                component: 'LibraryAPI',
                action: 'removeLibraryEntry',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Clear all library entries
     */
    static async clearLibrary(): Promise<void> {
        try {
            await AppBackend.ClearLibrary();
        } catch (error) {
            errorService.handle(error, {
                component: 'LibraryAPI',
                action: 'clearLibrary'
            }, { showToast: false });
            throw error;
        }
    }
}
