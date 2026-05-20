import * as AppBackend from '../../../wailsjs/go/main/App';
import { BaseAPI } from './baseAPI';

export class FolderViewModeAPI extends BaseAPI {
    static async getFolderViewMode(parentPath: string): Promise<string | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.GetFolderViewMode(parentPath);
                return result as string | null;
            },
            {
                component: 'FolderViewModeAPI',
                action: 'getFolderViewMode',
                details: { parentPath },
            }
        );
    }

    static async setFolderViewMode(parentPath: string, viewMode: string): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.SetFolderViewMode(parentPath, viewMode);
            },
            {
                component: 'FolderViewModeAPI',
                action: 'setFolderViewMode',
                details: { parentPath, viewMode },
            }
        );
    }
}
