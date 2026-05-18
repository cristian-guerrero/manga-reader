/**
 * Explorer API Service - Operations related to explorer
 */

import * as AppBackend from '../../../wailsjs/go/main/App';
import { BaseAPI } from './baseAPI';

// Temporary cast to fix type error until Wails regenerates bindings
const AppBackendAny = AppBackend as any;

export interface FolderNavigation {
    prevFolder?: { path: string; name: string };
    nextFolder?: { path: string; name: string };
    parentPath: string;
    currentIndex: number;
    totalFolders: number;
    allFolders?: Array<{ path: string; name: string }>;
}

export class ExplorerAPI extends BaseAPI {
    /**
     * Get folder navigation info (prev/next folders in same directory)
     */
    static async getFolderNavigation(folderPath: string): Promise<FolderNavigation | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackendAny.GetFolderNavigation(folderPath);
                if (!result) return null;
                return normalizeFolderNavigation(result);
            },
            {
                component: 'ExplorerAPI',
                action: 'getFolderNavigation',
                details: { folderPath }
            }
        );
    }

    /**
     * Get folder navigation info respecting Explorer sort preferences
     */
    static async getFolderNavigationWithSort(folderPath: string, sortMode: string, sortOrder: string): Promise<FolderNavigation | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackendAny.GetFolderNavigationWithSort(folderPath, sortMode, sortOrder);
                if (!result) return null;
                return normalizeFolderNavigation(result);
            },
            {
                component: 'ExplorerAPI',
                action: 'getFolderNavigationWithSort',
                details: { folderPath, sortMode, sortOrder }
            }
        );
    }
}

function normalizeFolderNavigation(result: any): FolderNavigation {
    return {
        prevFolder: result.prevFolder ? {
            path: result.prevFolder.path,
            name: result.prevFolder.name
        } : undefined,
        nextFolder: result.nextFolder ? {
            path: result.nextFolder.path,
            name: result.nextFolder.name
        } : undefined,
        parentPath: result.parentPath,
        currentIndex: result.currentIndex,
        totalFolders: result.totalFolders,
        allFolders: result.allFolders ? result.allFolders.map((f: { path: string; name: string }) => ({
            path: f.path,
            name: f.name
        })) : undefined
    };
}
