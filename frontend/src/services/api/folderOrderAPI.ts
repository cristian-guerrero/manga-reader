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
}
