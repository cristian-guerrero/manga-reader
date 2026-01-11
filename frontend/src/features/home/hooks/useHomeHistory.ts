/**
 * useHomeHistory - Hook to manage recent history loading and events
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { EventsOn, EventsOff } from '../../../../wailsjs/runtime';
import { AppAPI } from '@services/api/appAPI';
import type { HistoryEntry } from '../types';

const MAX_RECENT_ITEMS = 4;

export function useHomeHistory() {
    const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isMountedRef = useRef(true);
    const historyEntriesRef = useRef<HistoryEntry[]>([]);

    // Keep ref in sync with state
    useEffect(() => {
        historyEntriesRef.current = historyEntries;
    }, [historyEntries]);

    const loadRecentHistory = useCallback(async () => {
        if (!isMountedRef.current) return;

        try {
            if (isMountedRef.current) {
                setIsLoading(true);
            }

            const entries = await AppAPI.getHistory();
            console.log(`[HomePage] History received: ${entries?.length || 0} items`);

            if (!isMountedRef.current) return;

            if (entries && Array.isArray(entries) && entries.length > 0) {
                // Show up to 4 recent items
                const recent = entries.slice(0, MAX_RECENT_ITEMS);
                setHistoryEntries(recent);
                setIsLoading(false); // Show UI immediately - thumbnails will load lazily
            } else {
                setHistoryEntries([]);
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Failed to load history', error);
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        let unsubscribeHistory: () => void;
        let unsubscribeAppReady: () => void;

        // Try to load immediately - bindings should be available
        loadRecentHistory();

        // Also listen for app_ready event in case bindings weren't ready immediately
        unsubscribeAppReady = EventsOn('app_ready', () => {
            console.log('[HomePage] Received app_ready event');
            // Use ref instead of state to avoid closure issues
            if (isMountedRef.current && historyEntriesRef.current.length === 0) {
                loadRecentHistory();
            }
        });

        unsubscribeHistory = EventsOn('history_updated', () => {
            console.log('[HomePage] Received history_updated event');
            if (isMountedRef.current) {
                loadRecentHistory();
            }
        });

        return () => {
            isMountedRef.current = false;
            if (unsubscribeHistory) unsubscribeHistory();
            if (unsubscribeAppReady) unsubscribeAppReady();
        };
    }, [loadRecentHistory]);

    return {
        historyEntries,
        isLoading,
    };
}
