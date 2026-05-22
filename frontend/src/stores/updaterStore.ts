import { create } from 'zustand';
import { UpdaterAPI, type UpdateInfo, type UpdateState } from '../services/api/updaterAPI';

interface UpdaterStoreState {
  currentVersion: string;
  updateInfo: UpdateInfo | null;
  updateState: UpdateState;
  isChecking: boolean;
  isDownloading: boolean;
  lastCheckTime: number | null;
  updatedRecently: boolean;

  init: () => Promise<void>;
  checkForUpdate: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  dismissUpdated: () => void;
}

export const useUpdaterStore = create<UpdaterStoreState>((set, get) => ({
  currentVersion: '',
  updateInfo: null,
  updateState: { pending: false, pendingVersion: '', downloadedAt: '' },
  isChecking: false,
  isDownloading: false,
  lastCheckTime: null,
  updatedRecently: false,

  init: async () => {
    const [version, state, justUpdated] = await Promise.all([
      UpdaterAPI.getCurrentVersion(),
      UpdaterAPI.getUpdateState(),
      UpdaterAPI.wasJustUpdated(),
    ]);

    set({
      currentVersion: version || 'dev',
      updateState: state || { pending: false, pendingVersion: '', downloadedAt: '' },
    });

    if (justUpdated) {
      set({ updatedRecently: true });
      setTimeout(() => set({ updatedRecently: false }), 5000);
    }
  },

  checkForUpdate: async () => {
    if (get().isChecking) return;

    set({ isChecking: true });
    try {
      const [info, state] = await Promise.all([
        UpdaterAPI.checkForUpdate(),
        UpdaterAPI.getUpdateState(),
      ]);
      set({
        updateInfo: state.pending ? null : info,
        updateState: state,
        isChecking: false,
        lastCheckTime: Date.now(),
      });
    } catch {
      set({ isChecking: false, lastCheckTime: Date.now() });
    }
  },

  downloadUpdate: async () => {
    const { updateInfo } = get();
    if (!updateInfo?.available || get().isDownloading) return;

    set({ isDownloading: true });
    try {
      await UpdaterAPI.downloadUpdate(updateInfo.version);
      const state = await UpdaterAPI.getUpdateState();
      set({
        updateState: state,
        isDownloading: false,
        updateInfo: null,
      });
    } catch {
      set({ isDownloading: false });
    }
  },

  dismissUpdated: () => {
    set({ updatedRecently: false });
  },
}));
