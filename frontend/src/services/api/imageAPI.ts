/**
 * Image API Service - Operations related to images
 */

import { ImageInfo } from '../../types';
import * as AppBackend from '../../../wailsjs/go/main/App';
import { errorService } from '../errorService';

export class ImageAPI {
    /**
     * Get images list (recursive scan)
     */
    static async getImages(path: string): Promise<ImageInfo[]> {
        try {
            const result = await AppBackend.GetImages(path);
            return (result as any[]) || [];
        } catch (error) {
            errorService.handle(error, {
                component: 'ImageAPI',
                action: 'getImages',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Get images list (shallow scan - only immediate directory)
     */
    static async getImagesShallow(path: string): Promise<ImageInfo[]> {
        try {
            const result = await AppBackend.GetImagesShallow(path);
            return (result as any[]) || [];
        } catch (error) {
            errorService.handle(error, {
                component: 'ImageAPI',
                action: 'getImagesShallow',
                details: { path }
            }, { showToast: false });
            throw error;
        }
    }
}
