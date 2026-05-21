/**
 * Image Order API Service - Operations related to custom image ordering
 */

import * as AppBackend from '../../../wailsjs/go/main/App';
import { BaseAPI } from './baseAPI';

export class ImageOrderAPI extends BaseAPI {
    /**
     * Check if folder has custom image order
     */
    static async hasCustomOrder(folderPath: string): Promise<boolean> {
        return this.callOrFalse(
            async () => {
                const result = await AppBackend.HasCustomOrder(folderPath);
                return result || false;
            },
            {
                component: 'ImageOrderAPI',
                action: 'hasCustomOrder',
                details: { folderPath }
            }
        );
    }

    /**
     * Get original image order
     */
    static async getOriginalOrder(folderPath: string): Promise<string[]> {
        return this.callOrEmpty(
            async () => {
                const result = await AppBackend.GetOriginalOrder(folderPath);
                return (result as string[]) || [];
            },
            {
                component: 'ImageOrderAPI',
                action: 'getOriginalOrder',
                details: { folderPath }
            }
        );
    }

    /**
     * Save custom image order
     */
    static async saveImageOrder(folderPath: string, customOrder: string[], originalOrder: string[]): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.SaveImageOrder(folderPath, customOrder, originalOrder);
            },
            {
                component: 'ImageOrderAPI',
                action: 'saveImageOrder',
                details: { folderPath }
            }
        );
    }

    /**
     * Reset image order to original
     */
    static async resetImageOrder(folderPath: string): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.ResetImageOrder(folderPath);
            },
            {
                component: 'ImageOrderAPI',
                action: 'resetImageOrder',
                details: { folderPath }
            }
        );
    }

    static async pinImage(folderPath: string, sortMode: string, imageName: string): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.PinImage(folderPath, sortMode, imageName);
            },
            {
                component: 'ImageOrderAPI',
                action: 'pinImage',
                details: { folderPath, sortMode, imageName }
            }
        );
    }

    static async unpinImage(folderPath: string, sortMode: string, imageName: string): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.UnpinImage(folderPath, sortMode, imageName);
            },
            {
                component: 'ImageOrderAPI',
                action: 'unpinImage',
                details: { folderPath, sortMode, imageName }
            }
        );
    }

    static async getPinnedImages(folderPath: string, sortMode: string): Promise<string[]> {
        return this.callOrEmpty(
            async () => {
                const result = await AppBackend.GetPinnedImages(folderPath, sortMode);
                return (result as string[]) || [];
            },
            {
                component: 'ImageOrderAPI',
                action: 'getPinnedImages',
                details: { folderPath, sortMode }
            }
        );
    }

    static async reorderPinnedImages(folderPath: string, sortMode: string, newOrder: string[]): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.ReorderPinnedImages(folderPath, sortMode, newOrder);
            },
            {
                component: 'ImageOrderAPI',
                action: 'reorderPinnedImages',
                details: { folderPath, sortMode }
            }
        );
    }
}
