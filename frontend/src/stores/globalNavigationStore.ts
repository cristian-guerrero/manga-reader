/**
 * Global Navigation Store - Manages truly global navigation state
 * Only state that is NOT per-tab should be here
 */

import { create } from 'zustand';
import { FolderInfo } from '../types';
import { useTabStore } from './tabStore';

interface GlobalNavigationStoreState {
    // Panic mode (global state)
    isPanicMode: boolean;
    triggerPanic: () => void;
    exitPanic: () => void;

    // Processing mode (global state)
    isProcessing: boolean;
    setIsProcessing: (isProcessing: boolean) => void;

    // Folders (global state)
    folders: FolderInfo[];
    setFolders: (folders: FolderInfo[] | ((prev: FolderInfo[]) => FolderInfo[])) => void;
}

export const useGlobalNavigationStore = create<GlobalNavigationStoreState>((set, get) => ({
    // Panic mode
    isPanicMode: false,
    
    triggerPanic: () => {
        set({ isPanicMode: true });
        // Panic also navigates active tab to settings as a safety
        const activeTab = useTabStore.getState().getActiveTab();
        useTabStore.getState().updateActiveTab({
            page: 'settings',
            params: {},
            history: [...activeTab.history, { page: 'settings', params: {} }],
            activeMenuPage: 'settings',
            title: 'Settings'
        });
    },
    
    exitPanic: () => {
        set({ isPanicMode: false });
    },

    // Processing mode
    isProcessing: false,
    
    setIsProcessing: (isProcessing) => {
        set({ isProcessing });
    },

    // Folders
    folders: [],
    
    setFolders: (folders) => {
        if (typeof folders === 'function') {
            const currentFolders = get().folders;
            set({ folders: folders(currentFolders) });
        } else {
            set({ folders });
        }
    },
}));
