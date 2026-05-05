/**
 * useFolderNavigation - Hook for managing folder navigation in explorer
 */

import { useState, useEffect } from 'react';
import { FolderNavigation } from '@services/api/explorerAPI';
import { AppAPI } from '@services/api/appAPI';

export function useFolderNavigation(folderPath: string | undefined, isActive: boolean) {
    const [folderNav, setFolderNav] = useState<FolderNavigation | null>(null);

    useEffect(() => {
        console.log('[useFolderNavigation] Called with folderPath:', folderPath, 'isActive:', isActive);

        if (!folderPath || !isActive) {
            console.log('[useFolderNavigation] Skipping - folderPath or isActive is falsy');
            setFolderNav(null);
            return;
        }

        let cancelled = false;

        const loadFolderNav = async () => {
            try {
                console.log('[useFolderNavigation] Loading folder navigation for:', folderPath);
                const navInfo = await AppAPI.getFolderNavigation(folderPath);
                if (cancelled) return;

                console.log('[useFolderNavigation] Result:', navInfo);

                if (navInfo) {
                    setFolderNav(navInfo);
                } else {
                    setFolderNav(null);
                }
            } catch (error) {
                console.error('[useFolderNavigation] Failed to load folder navigation:', error);
                if (!cancelled) {
                    setFolderNav(null);
                }
            }
        };

        loadFolderNav();

        return () => {
            cancelled = true;
        };
    }, [folderPath, isActive]);

    return folderNav;
}
