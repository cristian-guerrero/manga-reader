/**
 * Viewer State API Service - Operations related to viewer state persistence
 */

import * as AppBackend from '../../../wailsjs/go/main/App';
import { persistence } from '../../../wailsjs/go/models';
import { BaseAPI } from './baseAPI';

export class ViewerStateAPI extends BaseAPI {
    /**
     * Get viewer state for a folder path
     */
    static async getViewerState(path: string): Promise<persistence.ViewerState | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.GetViewerState(path);
                return result || null;
            },
            {
                component: 'ViewerStateAPI',
                action: 'getViewerState',
                details: { path }
            }
        );
    }

    /**
     * Save viewer state for a folder path
     */
    static async saveViewerState(path: string, index: number, width: number, scrollPosition: number): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.SaveViewerState(path, index, width, scrollPosition);
            },
            {
                component: 'ViewerStateAPI',
                action: 'saveViewerState',
                details: { path, index, width, scrollPosition }
            }
        );
    }
}
