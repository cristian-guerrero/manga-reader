/**
 * Thumbnail API Service - Operations related to thumbnails
 */

import * as AppBackend from '../../../wailsjs/go/main/App';
import { errorService } from '../errorService';

export class ThumbnailAPI {
    /**
     * Get thumbnail for an image
     */
    static async getThumbnail(imagePath: string): Promise<string | null> {
        try {
            const result = await AppBackend.GetThumbnail(imagePath);
            return result || null;
        } catch (error) {
            errorService.handle(error, {
                component: 'ThumbnailAPI',
                action: 'getThumbnail',
                details: { imagePath }
            }, { showToast: false });
            return null;
        }
    }

    /**
     * Pause/resume thumbnail generation
     */
    static setThumbnailsPaused(paused: boolean): void {
        try {
            // SetThumbnailsPaused returns Promise<void> but we don't need to await it
            AppBackend.SetThumbnailsPaused(paused).catch((error) => {
                errorService.handle(error, {
                    component: 'ThumbnailAPI',
                    action: 'setThumbnailsPaused',
                    details: { paused }
                }, { showToast: false });
            });
        } catch (error) {
            errorService.handle(error, {
                component: 'ThumbnailAPI',
                action: 'setThumbnailsPaused',
                details: { paused }
            }, { showToast: false });
        }
    }
}
