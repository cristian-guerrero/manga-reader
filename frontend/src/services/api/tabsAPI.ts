import * as AppBackend from '../../../wailsjs/go/main/App';
import { persistence } from '../../../wailsjs/go/models';
import { BaseAPI } from './baseAPI';

export interface SavedTab {
    id: string;
    title: string;
    page: string;
    fromPage?: string | null;
    params: Record<string, string>;
    explorerState?: any;
    thumbnailScrollPositions?: Record<string, number>;
}

export interface SavedTabsData {
    activeTabId: string;
    tabs: SavedTab[];
}

export class TabsAPI extends BaseAPI {
    static async getTabs(): Promise<SavedTabsData | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.GetTabs();
                if (!result) return null;
                return {
                    activeTabId: result.activeTabId || '',
                    tabs: (result.tabs || []).map((t: any) => ({
                        id: t.id,
                        title: t.title,
                        page: t.page,
                        fromPage: t.fromPage,
                        params: t.params || {},
                        explorerState: t.explorerState,
                        thumbnailScrollPositions: t.thumbnailScrollPositions,
                    })),
                };
            },
            { component: 'TabsAPI', action: 'getTabs' }
        );
    }

    static async saveTabs(data: SavedTabsData): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.SaveTabs(data as unknown as persistence.TabsData);
            },
            { component: 'TabsAPI', action: 'saveTabs', details: { tabCount: data.tabs.length } }
        );
    }
}
