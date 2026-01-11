/**
 * Settings API Service - Operations related to application settings
 */

import { Settings } from '../../types';
import * as AppBackend from '../../../wailsjs/go/main/App';
import { persistence } from '../../../wailsjs/go/models';
import { errorService } from '../errorService';

export class SettingsAPI {
    /**
     * Get application settings
     */
    static async getSettings(): Promise<Settings | null> {
        try {
            const result = await AppBackend.GetSettings();
            // Convert backend Settings to frontend Settings format
            return (result as unknown as Settings) || null;
        } catch (error) {
            errorService.handle(error, {
                component: 'SettingsAPI',
                action: 'getSettings'
            }, { showToast: false });
            return null;
        }
    }

    /**
     * Update a single setting in the backend
     */
    static async updateSettings(updates: Record<string, any>): Promise<void> {
        try {
            await AppBackend.UpdateSettings(updates);
        } catch (error) {
            errorService.handle(error, {
                component: 'SettingsAPI',
                action: 'updateSettings',
                details: { keys: Object.keys(updates) }
            }, { showToast: false });
            throw error;
        }
    }

    /**
     * Save all settings to backend
     */
    static async saveSettings(settings: Settings): Promise<void> {
        try {
            // Convert frontend Settings to backend persistence.Settings format
            await AppBackend.SaveSettings(settings as unknown as persistence.Settings);
        } catch (error) {
            errorService.handle(error, {
                component: 'SettingsAPI',
                action: 'saveSettings'
            }, { showToast: false });
            throw error;
        }
    }
}
