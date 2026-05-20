import * as AppBackend from '../../../wailsjs/go/main/App';
import { BaseAPI } from './baseAPI';

export interface ExplorerSortPref {
    sortBy: string;
    sortOrder: string;
}

export interface SeriesDetailsSortPref {
    sortBy: string;
    sortOrder: string;
}

export class UIPreferencesAPI extends BaseAPI {
    static async getExplorerSortPreferences(): Promise<Record<string, ExplorerSortPref>> {
        return this.call(
            async () => {
                const result = await AppBackend.GetExplorerSortPreferences();
                return (result as Record<string, ExplorerSortPref>) || {};
            },
            {
                component: 'UIPreferencesAPI',
                action: 'getExplorerSortPreferences',
                defaultValue: {} as Record<string, ExplorerSortPref>,
            }
        );
    }

    static async getExplorerSortPreference(path: string): Promise<ExplorerSortPref | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.GetExplorerSortPreference(path);
                return result as ExplorerSortPref | null;
            },
            {
                component: 'UIPreferencesAPI',
                action: 'getExplorerSortPreference',
                details: { path },
            }
        );
    }

    static async setExplorerSortPreference(path: string, sortBy: string, sortOrder: string): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.SetExplorerSortPreference(path, sortBy, sortOrder);
            },
            {
                component: 'UIPreferencesAPI',
                action: 'setExplorerSortPreference',
                details: { path, sortBy, sortOrder },
            }
        );
    }

    static async getSeriesSortBy(): Promise<string | null> {
        return this.callOrNull(
            async () => AppBackend.GetSeriesSortBy(),
            { component: 'UIPreferencesAPI', action: 'getSeriesSortBy' }
        );
    }

    static async setSeriesSortBy(value: string): Promise<void> {
        return this.callVoid(
            async () => AppBackend.SetSeriesSortBy(value),
            { component: 'UIPreferencesAPI', action: 'setSeriesSortBy', details: { value } }
        );
    }

    static async getSeriesSortOrder(): Promise<string | null> {
        return this.callOrNull(
            async () => AppBackend.GetSeriesSortOrder(),
            { component: 'UIPreferencesAPI', action: 'getSeriesSortOrder' }
        );
    }

    static async setSeriesSortOrder(value: string): Promise<void> {
        return this.callVoid(
            async () => AppBackend.SetSeriesSortOrder(value),
            { component: 'UIPreferencesAPI', action: 'setSeriesSortOrder', details: { value } }
        );
    }

    static async getOneShotSortBy(): Promise<string | null> {
        return this.callOrNull(
            async () => AppBackend.GetOneShotSortBy(),
            { component: 'UIPreferencesAPI', action: 'getOneShotSortBy' }
        );
    }

    static async setOneShotSortBy(value: string): Promise<void> {
        return this.callVoid(
            async () => AppBackend.SetOneShotSortBy(value),
            { component: 'UIPreferencesAPI', action: 'setOneShotSortBy', details: { value } }
        );
    }

    static async getOneShotSortOrder(): Promise<string | null> {
        return this.callOrNull(
            async () => AppBackend.GetOneShotSortOrder(),
            { component: 'UIPreferencesAPI', action: 'getOneShotSortOrder' }
        );
    }

    static async setOneShotSortOrder(value: string): Promise<void> {
        return this.callVoid(
            async () => AppBackend.SetOneShotSortOrder(value),
            { component: 'UIPreferencesAPI', action: 'setOneShotSortOrder', details: { value } }
        );
    }

    static async getSeriesDetailsSortPreferences(): Promise<Record<string, SeriesDetailsSortPref>> {
        return this.call(
            async () => {
                const result = await AppBackend.GetSeriesDetailsSortPreferences();
                return (result as Record<string, SeriesDetailsSortPref>) || {};
            },
            {
                component: 'UIPreferencesAPI',
                action: 'getSeriesDetailsSortPreferences',
                defaultValue: {} as Record<string, SeriesDetailsSortPref>,
            }
        );
    }

    static async getSeriesDetailsSortPreference(seriesPath: string): Promise<SeriesDetailsSortPref | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.GetSeriesDetailsSortPreference(seriesPath);
                return result as SeriesDetailsSortPref | null;
            },
            {
                component: 'UIPreferencesAPI',
                action: 'getSeriesDetailsSortPreference',
                details: { seriesPath },
            }
        );
    }

    static async setSeriesDetailsSortPreference(seriesPath: string, sortBy: string, sortOrder: string): Promise<void> {
        return this.callVoid(
            async () => AppBackend.SetSeriesDetailsSortPreference(seriesPath, sortBy, sortOrder),
            {
                component: 'UIPreferencesAPI',
                action: 'setSeriesDetailsSortPreference',
                details: { seriesPath, sortBy, sortOrder },
            }
        );
    }

    static async getExplorerRootViewMode(): Promise<string | null> {
        return this.callOrNull(
            async () => AppBackend.GetExplorerRootViewMode(),
            { component: 'UIPreferencesAPI', action: 'getExplorerRootViewMode' }
        );
    }

    static async setExplorerRootViewMode(value: string): Promise<void> {
        return this.callVoid(
            async () => AppBackend.SetExplorerRootViewMode(value),
            { component: 'UIPreferencesAPI', action: 'setExplorerRootViewMode', details: { value } }
        );
    }

    static async getHistoryViewMode(): Promise<string | null> {
        return this.callOrNull(
            async () => AppBackend.GetHistoryViewMode(),
            { component: 'UIPreferencesAPI', action: 'getHistoryViewMode' }
        );
    }

    static async setHistoryViewMode(value: string): Promise<void> {
        return this.callVoid(
            async () => AppBackend.SetHistoryViewMode(value),
            { component: 'UIPreferencesAPI', action: 'setHistoryViewMode', details: { value } }
        );
    }
}
