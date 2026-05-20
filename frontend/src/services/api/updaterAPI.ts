import * as AppBackend from '../../../wailsjs/go/main/App';
import { BaseAPI } from './baseAPI';

export interface UpdateInfo {
  available: boolean;
  version: string;
  url: string;
  channel: string;
}

export interface UpdateState {
  pending: boolean;
  pendingVersion: string;
  downloadedAt: string;
}

export class UpdaterAPI extends BaseAPI {
  static async checkForUpdate(): Promise<UpdateInfo | null> {
    return this.callOrNull(
      async () => {
        const result = await AppBackend.CheckForUpdate();
        return (result as unknown as UpdateInfo) || null;
      },
      { component: 'UpdaterAPI', action: 'checkForUpdate' }
    );
  }

  static async downloadUpdate(version: string): Promise<void> {
    return this.callVoid(
      async () => {
        await AppBackend.DownloadUpdate(version);
      },
      { component: 'UpdaterAPI', action: 'downloadUpdate', details: { version } }
    );
  }

  static async getUpdateState(): Promise<UpdateState> {
    return this.callOrNull(
      async () => {
        const result = await AppBackend.GetUpdateState();
        return (result as unknown as UpdateState) || { pending: false, pendingVersion: '', downloadedAt: '' };
      },
      { component: 'UpdaterAPI', action: 'getUpdateState' }
    ) as Promise<UpdateState>;
  }

  static async getCurrentVersion(): Promise<string> {
    return this.callOrNull(
      async () => {
        return await AppBackend.GetCurrentVersion();
      },
      { component: 'UpdaterAPI', action: 'getCurrentVersion' }
    ) as Promise<string>;
  }

  static async isUpdatePending(): Promise<boolean> {
    return this.callOrFalse(
      async () => {
        return await AppBackend.IsUpdatePending();
      },
      { component: 'UpdaterAPI', action: 'isUpdatePending' }
    );
  }
}
