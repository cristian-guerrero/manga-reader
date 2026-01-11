/**
 * useHistoryData - Hook to manage history data loading and events
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { EventsOn, EventsOff } from '../../../../wailsjs/runtime';
import { AppAPI } from '@services/api/appAPI';
import { useSettingsStore } from '@stores';
import type { HistoryEntry } from '../types';

export function useHistoryData() {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isMountedRef = useRef(true);
    const enableHistory = useSettingsStore((state: any) => state.enableHistory);

    const loadHistory = useCallback(async () => {
        if (!isMountedRef.current) return;

        try {
            if (isMountedRef.current) {
                setIsLoading(true);
            }

            const entries = await AppAPI.getHistory();

            if (!isMountedRef.current) return;

            if (entries && Array.isArray(entries)) {
                setHistory(entries);
            } else {
                setHistory([]);
            }
            setIsLoading(false);
        } catch (error) {
            console.error('Failed to load history:', error);
            if (isMountedRef.current) {
                setHistory([]);
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        let unsubscribeHistory: () => void;
        let unsubscribeAppReady: () => void;

        if (enableHistory) {
            // Try to load immediately - bindings should be available
            loadHistory();

            // Listen for app_ready event in case bindings weren't ready immediately
            unsubscribeAppReady = EventsOn('app_ready', () => {
                console.log('[HistoryPage] Received app_ready event');
                if (isMountedRef.current && enableHistory) {
                    loadHistory();
                }
            });

            unsubscribeHistory = EventsOn('history_updated', () => {
                if (isMountedRef.current) loadHistory();
            });
        } else {
            setIsLoading(false);
            setHistory([]);
        }

        return () => {
            isMountedRef.current = false;
            if (unsubscribeHistory) unsubscribeHistory();
            if (unsubscribeAppReady) unsubscribeAppReady();
        };
    }, [enableHistory, loadHistory]);

    const removeEntry = useCallback((id: string) => {
        setHistory((prev) => prev.filter((h) => h.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setHistory([]);
    }, []);

    return {
        history,
        isLoading,
        loadHistory,
        removeEntry,
        clearAll,
    };
}
