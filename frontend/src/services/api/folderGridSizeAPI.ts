import * as AppBackend from '../../../wailsjs/go/main/App';
import { BaseAPI } from './baseAPI';

export class FolderGridSizeAPI extends BaseAPI {
    static async getFolderGridSize(parentPath: string): Promise<number | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.GetFolderGridSize(parentPath);
                return result as number | null;
            },
            {
                component: 'FolderGridSizeAPI',
                action: 'getFolderGridSize',
                details: { parentPath },
            }
        );
    }

    static async setFolderGridSize(parentPath: string, gridSize: number): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.SetFolderGridSize(parentPath, gridSize);
            },
            {
                component: 'FolderGridSizeAPI',
                action: 'setFolderGridSize',
                details: { parentPath, gridSize },
            }
        );
    }
}
