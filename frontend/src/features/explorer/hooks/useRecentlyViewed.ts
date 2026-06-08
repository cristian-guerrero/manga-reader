/**
 * useRecentlyViewed - Hook to load and manage recently viewed folders
 */

import { useState, useCallback } from 'react';
import { ExplorerAPI } from '@services/api/explorerAPI';
import { RecentFolderEntry } from '../types';

interface UseRecentlyViewedReturn {
    recentFolders: RecentFolderEntry[];
    loading: boolean;
    refresh: () => Promise<void>;
    removeFolder: (folderPath: string) => Promise<void>;
    clearAll: () => Promise<void>;
}

export function useRecentlyViewed(): UseRecentlyViewedReturn {
    const [recentFolders, setRecentFolders] = useState<RecentFolderEntry[]>([]);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const folders = await ExplorerAPI.getRecentFolders();
            setRecentFolders(folders);
        } catch (error) {
            console.error('[useRecentlyViewed] Failed to load recent folders:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const removeFolder = useCallback(async (folderPath: string) => {
        await ExplorerAPI.removeRecentFolder(folderPath);
        setRecentFolders(prev => prev.filter(f => f.folderPath !== folderPath));
    }, []);

    const clearAll = useCallback(async () => {
        await ExplorerAPI.clearRecentFolders();
        setRecentFolders([]);
    }, []);

    return { recentFolders, loading, refresh, removeFolder, clearAll };
}
