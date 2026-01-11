/**
 * Image API Service - Operations related to images
 */

import { ImageInfo } from '../../types';
import * as AppBackend from '../../../wailsjs/go/main/App';
import { BaseAPI } from './baseAPI';

export class ImageAPI extends BaseAPI {
    /**
     * Get images list (recursive scan)
     */
    static async getImages(path: string): Promise<ImageInfo[]> {
        return this.callOrEmpty(
            async () => {
                const result = await AppBackend.GetImages(path);
                return (result as ImageInfo[]) || [];
            },
            {
                component: 'ImageAPI',
                action: 'getImages',
                details: { path }
            }
        );
    }

    /**
     * Get images list (shallow scan - only immediate directory)
     */
    static async getImagesShallow(path: string): Promise<ImageInfo[]> {
        return this.callOrEmpty(
            async () => {
                const result = await AppBackend.GetImagesShallow(path);
                return (result as ImageInfo[]) || [];
            },
            {
                component: 'ImageAPI',
                action: 'getImagesShallow',
                details: { path }
            }
        );
    }
}
