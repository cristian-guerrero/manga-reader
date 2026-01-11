/**
 * useHomeActions - Hook to handle home page actions (continue, remove, select folder)
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@hooks';
import { useTabStore } from '@stores';
import { useToast } from '@shared/components';
import { AppAPI } from '@services/api/appAPI';

export function useHomeActions() {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { addTab } = useTabStore();
    const { showToast } = useToast();

    const handleContinue = useCallback((path: string) => {
        navigate('viewer', { folder: path });
    }, [navigate]);

    const handleAuxClick = useCallback((e: React.MouseEvent, path: string, name: string) => {
        if (e.button === 1) { // Middle click
            e.preventDefault();
            e.stopPropagation();
            addTab('viewer', { folder: path }, name, {}, false);
        }
    }, [addTab]);

    const handleRemoveHistory = useCallback(async (path: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await AppAPI.removeHistory(path);
            // The list will refresh via the history_updated event
        } catch (error) {
            console.error('Failed to remove history', error);
            showToast(t('history.removeError') || 'Failed to remove history', 'error');
        }
    }, [showToast, t]);

    const handleSelectFolder = useCallback(async () => {
        navigate('oneShot');
    }, [navigate]);

    return {
        handleContinue,
        handleAuxClick,
        handleRemoveHistory,
        handleSelectFolder,
    };
}
