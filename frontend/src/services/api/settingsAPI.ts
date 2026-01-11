/**
 * Settings API Service - Operations related to application settings
 */

import { Settings } from '../../types';
import * as AppBackend from '../../../wailsjs/go/main/App';
import { persistence } from '../../../wailsjs/go/models';
import { BaseAPI } from './baseAPI';

export class SettingsAPI extends BaseAPI {
    /**
     * Get application settings
     */
    static async getSettings(): Promise<Settings | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.GetSettings();
                // Convert backend Settings to frontend Settings format
                return (result as unknown as Settings) || null;
            },
            {
                component: 'SettingsAPI',
                action: 'getSettings'
            }
        );
    }

    /**
     * Update a single setting in the backend
     */
    static async updateSettings(updates: Record<string, any>): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.UpdateSettings(updates);
            },
            {
                component: 'SettingsAPI',
                action: 'updateSettings',
                details: { keys: Object.keys(updates) }
            }
        );
    }

    /**
     * Save all settings to backend
     */
    static async saveSettings(settings: Settings): Promise<void> {
        return this.callVoid(
            async () => {
                // Convert frontend Settings to backend persistence.Settings format
                await AppBackend.SaveSettings(settings as unknown as persistence.Settings);
            },
            {
                component: 'SettingsAPI',
                action: 'saveSettings'
            }
        );
    }
}
