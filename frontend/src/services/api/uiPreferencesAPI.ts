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

    static async getExplorerSortPreference(path: string): Promise<ExplorerSortPref> {
        return this.call(
            async () => {
                const result = await AppBackend.GetExplorerSortPreference(path);
                return { sortBy: result.sortBy || 'name', sortOrder: result.sortOrder || 'asc' };
            },
            {
                component: 'UIPreferencesAPI',
                action: 'getExplorerSortPreference',
                details: { path },
                defaultValue: { sortBy: 'name', sortOrder: 'asc' },
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

    static async getSeriesSortBy(): Promise<string> {
        return this.call(
            async () => AppBackend.GetSeriesSortBy(),
            { component: 'UIPreferencesAPI', action: 'getSeriesSortBy', defaultValue: 'name' }
        );
    }

    static async setSeriesSortBy(value: string): Promise<void> {
        return this.callVoid(
            async () => AppBackend.SetSeriesSortBy(value),
            { component: 'UIPreferencesAPI', action: 'setSeriesSortBy', details: { value } }
        );
    }

    static async getSeriesSortOrder(): Promise<string> {
        return this.call(
            async () => AppBackend.GetSeriesSortOrder(),
            { component: 'UIPreferencesAPI', action: 'getSeriesSortOrder', defaultValue: 'asc' }
        );
    }

    static async setSeriesSortOrder(value: string): Promise<void> {
        return this.callVoid(
            async () => AppBackend.SetSeriesSortOrder(value),
            { component: 'UIPreferencesAPI', action: 'setSeriesSortOrder', details: { value } }
        );
    }

    static async getOneShotSortBy(): Promise<string> {
        return this.call(
            async () => AppBackend.GetOneShotSortBy(),
            { component: 'UIPreferencesAPI', action: 'getOneShotSortBy', defaultValue: 'name' }
        );
    }

    static async setOneShotSortBy(value: string): Promise<void> {
        return this.callVoid(
            async () => AppBackend.SetOneShotSortBy(value),
            { component: 'UIPreferencesAPI', action: 'setOneShotSortBy', details: { value } }
        );
    }

    static async getOneShotSortOrder(): Promise<string> {
        return this.call(
            async () => AppBackend.GetOneShotSortOrder(),
            { component: 'UIPreferencesAPI', action: 'getOneShotSortOrder', defaultValue: 'asc' }
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

    static async getSeriesDetailsSortPreference(seriesPath: string): Promise<SeriesDetailsSortPref> {
        return this.call(
            async () => {
                const result = await AppBackend.GetSeriesDetailsSortPreference(seriesPath);
                return { sortBy: result.sortBy || 'name', sortOrder: result.sortOrder || 'asc' };
            },
            {
                component: 'UIPreferencesAPI',
                action: 'getSeriesDetailsSortPreference',
                details: { seriesPath },
                defaultValue: { sortBy: 'name', sortOrder: 'asc' },
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

    static async getExplorerRootViewMode(): Promise<string> {
        return this.call(
            async () => AppBackend.GetExplorerRootViewMode(),
            { component: 'UIPreferencesAPI', action: 'getExplorerRootViewMode', defaultValue: 'grid' }
        );
    }

    static async setExplorerRootViewMode(value: string): Promise<void> {
        return this.callVoid(
            async () => AppBackend.SetExplorerRootViewMode(value),
            { component: 'UIPreferencesAPI', action: 'setExplorerRootViewMode', details: { value } }
        );
    }

    static async getHistoryViewMode(): Promise<string> {
        return this.call(
            async () => AppBackend.GetHistoryViewMode(),
            { component: 'UIPreferencesAPI', action: 'getHistoryViewMode', defaultValue: 'list' }
        );
    }

    static async setHistoryViewMode(value: string): Promise<void> {
        return this.callVoid(
            async () => AppBackend.SetHistoryViewMode(value),
            { component: 'UIPreferencesAPI', action: 'setHistoryViewMode', details: { value } }
        );
    }
}
