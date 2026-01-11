/**
 * useHistoryView - Hook to manage view mode (grid/list) preferences
 */

import { useState, useEffect } from 'react';
import type { ViewMode } from '../types';

const VIEW_MODE_STORAGE_KEY = 'history_viewMode';

export function useHistoryView() {
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
        return (saved === 'grid' || saved === 'list') ? saved : 'list';
    });

    // Save view mode preference
    useEffect(() => {
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    }, [viewMode]);

    return {
        viewMode,
        setViewMode,
    };
}
