import * as AppBackend from '../../../wailsjs/go/main/App';
import { BaseAPI } from './baseAPI';

export class FolderOrderAPI extends BaseAPI {
    static async getFolderOrder(parentPath: string): Promise<string[]> {
        return this.callOrEmpty(
            async () => {
                const result = await AppBackend.GetFolderOrder(parentPath);
                return (result as string[]) || [];
            },
            {
                component: 'FolderOrderAPI',
                action: 'getFolderOrder',
                details: { parentPath }
            }
        );
    }

    static async setFolderOrder(parentPath: string, customOrder: string[], originalOrder: string[]): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.SetFolderOrder(parentPath, customOrder, originalOrder);
            },
            {
                component: 'FolderOrderAPI',
                action: 'setFolderOrder',
                details: { parentPath }
            }
        );
    }

    static async resetFolderOrder(parentPath: string): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.ResetFolderOrder(parentPath);
            },
            {
                component: 'FolderOrderAPI',
                action: 'resetFolderOrder',
                details: { parentPath }
            }
        );
    }

    static async hasFolderCustomOrder(parentPath: string): Promise<boolean> {
        return this.callOrFalse(
            async () => {
                const result = await AppBackend.HasFolderCustomOrder(parentPath);
                return result || false;
            },
            {
                component: 'FolderOrderAPI',
                action: 'hasFolderCustomOrder',
                details: { parentPath }
            }
        );
    }

    static async getFolderOriginalOrder(parentPath: string): Promise<string[]> {
        return this.callOrEmpty(
            async () => {
                const result = await AppBackend.GetFolderOriginalOrder(parentPath);
                return (result as string[]) || [];
            },
            {
                component: 'FolderOrderAPI',
                action: 'getFolderOriginalOrder',
                details: { parentPath }
            }
        );
    }

    static async getFolderAutoOrder(parentPath: string): Promise<string[]> {
        return this.callOrEmpty(
            async () => {
                const result = await AppBackend.GetFolderAutoOrder(parentPath);
                return (result as string[]) || [];
            },
            {
                component: 'FolderOrderAPI',
                action: 'getFolderAutoOrder',
                details: { parentPath }
            }
        );
    }

    static async setFolderAutoOrder(parentPath: string, autoOrder: string[], originalOrder: string[]): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.SetFolderAutoOrder(parentPath, autoOrder, originalOrder);
            },
            {
                component: 'FolderOrderAPI',
                action: 'setFolderAutoOrder',
                details: { parentPath }
            }
        );
    }

    static async promoteToAutoOrder(parentPath: string, entryName: string, allEntries: string[]): Promise<string[]> {
        return this.callOrEmpty(
            async () => {
                const result = await AppBackend.PromoteToAutoOrder(parentPath, entryName, allEntries);
                return (result as string[]) || [];
            },
            {
                component: 'FolderOrderAPI',
                action: 'promoteToAutoOrder',
                details: { parentPath, entryName }
            }
        );
    }

    static async hasFolderAutoOrder(parentPath: string): Promise<boolean> {
        return this.callOrFalse(
            async () => {
                const result = await AppBackend.HasFolderAutoOrder(parentPath);
                return result || false;
            },
            {
                component: 'FolderOrderAPI',
                action: 'hasFolderAutoOrder',
                details: { parentPath }
            }
        );
    }

    static async resetFolderAutoOrder(parentPath: string): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.ResetFolderAutoOrder(parentPath);
            },
            {
                component: 'FolderOrderAPI',
                action: 'resetFolderAutoOrder',
                details: { parentPath }
            }
        );
    }

    static async pinFolder(parentPath: string, sortMode: string, entryName: string): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.PinFolder(parentPath, sortMode, entryName);
            },
            {
                component: 'FolderOrderAPI',
                action: 'pinFolder',
                details: { parentPath, sortMode, entryName }
            }
        );
    }

    static async unpinFolder(parentPath: string, sortMode: string, entryName: string): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.UnpinFolder(parentPath, sortMode, entryName);
            },
            {
                component: 'FolderOrderAPI',
                action: 'unpinFolder',
                details: { parentPath, sortMode, entryName }
            }
        );
    }

    static async getPinnedFolders(parentPath: string, sortMode: string): Promise<string[]> {
        return this.callOrEmpty(
            async () => {
                const result = await AppBackend.GetPinnedFolders(parentPath, sortMode);
                return (result as string[]) || [];
            },
            {
                component: 'FolderOrderAPI',
                action: 'getPinnedFolders',
                details: { parentPath, sortMode }
            }
        );
    }

    static async reorderPinnedFolders(parentPath: string, sortMode: string, newOrder: string[]): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.ReorderPinnedFolders(parentPath, sortMode, newOrder);
            },
            {
                component: 'FolderOrderAPI',
                action: 'reorderPinnedFolders',
                details: { parentPath, sortMode }
            }
        );
    }
}
