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
}
