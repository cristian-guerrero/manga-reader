/**
 * Image Order API Service - Operations related to custom image ordering
 */

import * as AppBackend from '../../../wailsjs/go/main/App';
import { errorService } from '../errorService';

export class ImageOrderAPI {
    /**
     * Check if folder has custom image order
     */
    static async hasCustomOrder(folderPath: string): Promise<boolean> {
        try {
            const result = await AppBackend.HasCustomOrder(folderPath);
            return result || false;
        } catch (error) {
            errorService.handle(error, {
                component: 'ImageOrderAPI',
                action: 'hasCustomOrder',
                details: { folderPath }
            }, { showToast: false });
            return false;
        }
    }

    /**
     * Get original image order
     */
    static async getOriginalOrder(folderPath: string): Promise<string[]> {
        try {
            const result = await AppBackend.GetOriginalOrder(folderPath);
            return (result as string[]) || [];
        } catch (error) {
            errorService.handle(error, {
                component: 'ImageOrderAPI',
                action: 'getOriginalOrder',
                details: { folderPath }
            }, { showToast: false });
            return [];
        }
    }

    /**
     * Save custom image order
     */
    static async saveImageOrder(folderPath: string, customOrder: string[], originalOrder: string[]): Promise<void> {
        try {
            await AppBackend.SaveImageOrder(folderPath, customOrder, originalOrder);
        } catch (error) {
            errorService.handle(error, {
                component: 'ImageOrderAPI',
                action: 'saveImageOrder',
                details: { folderPath }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Reset image order to original
     */
    static async resetImageOrder(folderPath: string): Promise<void> {
        try {
            await AppBackend.ResetImageOrder(folderPath);
        } catch (error) {
            errorService.handle(error, {
                component: 'ImageOrderAPI',
                action: 'resetImageOrder',
                details: { folderPath }
            }, { showToast: false });
            throw error;
        }
    }
}
