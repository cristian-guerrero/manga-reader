/**
 * useSeriesDetailsActions - Hook to handle series details actions (open chapter, aux click)
 */

import { useCallback } from 'react';
import { useNavigation } from '@hooks';
import { useTabStore } from '@stores';

export function useSeriesDetailsActions() {
    const { navigate } = useNavigation();
    const { addTab } = useTabStore();

    const handleOpenChapter = useCallback((path: string) => {
        // Maintain 'series' as active menu page when viewing a chapter from series details
        navigate('viewer', { folder: path, shallow: 'true' }, 'series');
    }, [navigate]);

    const handleAuxClick = useCallback((e: React.MouseEvent, path: string, name: string) => {
        if (e.button === 1) { // Middle click
            e.preventDefault();
            e.stopPropagation();
            addTab('viewer', { folder: path }, name, {}, false);
        }
    }, [addTab]);

    return {
        handleOpenChapter,
        handleAuxClick,
    };
}
