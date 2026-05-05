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
                    totalFolders: result.totalFolders
                };
            },
            {
                component: 'ExplorerAPI',
                action: 'getFolderNavigation',
                details: { folderPath }
            }
        );
    }
}
