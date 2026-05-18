import { useState, useEffect } from 'react';
import { UIPreferencesAPI } from '@services/api/uiPreferencesAPI';
import type { ViewMode } from '../types';

export function useHistoryView() {
    const [viewMode, setViewModeState] = useState<ViewMode>('list');

    useEffect(() => {
        UIPreferencesAPI.getHistoryViewMode().then((mode) => {
            const valid: ViewMode = (mode === 'grid' || mode === 'list') ? mode : 'list';
            setViewModeState(valid);
        }).catch(() => {});
    }, []);

    const setViewMode = (mode: ViewMode) => {
        setViewModeState(mode);
        UIPreferencesAPI.setHistoryViewMode(mode).catch(() => {});
    };

    return { viewMode, setViewMode };
}
