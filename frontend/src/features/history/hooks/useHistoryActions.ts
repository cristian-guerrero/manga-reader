/**
 * useHistoryActions - Hook to handle history actions (continue, remove, clear)
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@hooks';
import { useTabStore } from '@stores';
import { useToast } from '@shared/components';
import { AppAPI } from '@services/api/appAPI';
import type { HistoryEntry } from '../types';

export function useHistoryActions(onRemoveEntry: (id: string) => void, onClearAll: () => void) {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { addTab } = useTabStore();
    const { showToast } = useToast();

    const handleContinue = useCallback((entry: HistoryEntry) => {
        navigate('viewer', { folder: entry.folderPath });
    }, [navigate]);

    const handleAuxClick = useCallback((e: React.MouseEvent, entry: HistoryEntry) => {
        if (e.button === 1) { // Middle click
            e.preventDefault();
            e.stopPropagation();
            addTab('viewer', { folder: entry.folderPath }, entry.folderName, {}, false);
        }
    }, [addTab]);

    const handleRemove = useCallback(async (entry: HistoryEntry, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await AppAPI.removeHistory(entry.folderPath);
            onRemoveEntry(entry.id);
        } catch (error) {
            console.error('Failed to remove history entry:', error);
            showToast(t('history.removeError') || 'Failed to remove history entry', 'error');
        }
    }, [showToast, t, onRemoveEntry]);

    const handleClearAll = useCallback(async () => {
        try {
            await AppAPI.clearHistory();
            onClearAll();
            showToast(t('history.clearSuccess') || 'History cleared successfully', 'success');
        } catch (error) {
            console.error('Failed to clear history:', error);
            showToast(t('history.clearError') || 'Failed to clear history', 'error');
        }
    }, [showToast, t, onClearAll]);

    return {
        handleContinue,
        handleAuxClick,
        handleRemove,
        handleClearAll,
    };
}
