/**
 * Thumbnail API Service - Operations related to thumbnails
 */

import * as AppBackend from '../../../wailsjs/go/main/App';
import { BaseAPI } from './baseAPI';
import { errorService } from '../errorService';

export class ThumbnailAPI extends BaseAPI {
    /**
     * Get thumbnail for an image
     */
    static async getThumbnail(imagePath: string): Promise<string | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.GetThumbnail(imagePath);
                return result || null;
            },
            {
                component: 'ThumbnailAPI',
                action: 'getThumbnail',
                details: { imagePath }
            }
        );
    }

    /**
     * Pause/resume thumbnail generation
     * Note: Fire-and-forget operation, doesn't throw on error
     */
    static setThumbnailsPaused(paused: boolean): void {
        // SetThumbnailsPaused returns Promise<void> but we don't need to await it
        AppBackend.SetThumbnailsPaused(paused).catch((error) => {
            // Use errorService directly since this is a fire-and-forget operation
            errorService.handle(error, {
                component: 'ThumbnailAPI',
                action: 'setThumbnailsPaused',
                details: { paused }
            }, { showToast: false });
        });
    }
}
