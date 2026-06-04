import { useState, useEffect } from 'react';
import { FolderNavigation, ExplorerAPI } from '@services/api/explorerAPI';

export function useFolderNavigation(folderPath: string | undefined, isActive: boolean, navRoot?: string, sortBy?: string, sortOrder?: string) {
    const [folderNav, setFolderNav] = useState<FolderNavigation | null>(null);

    useEffect(() => {
        if (!folderPath || !isActive) {
            setFolderNav(null);
            return;
        }

        let cancelled = false;

        const loadFolderNav = async () => {
            try {
                const effectiveRoot = navRoot || folderPath;
                const hasSortPrefs = sortBy !== undefined && (sortBy !== 'name' || sortOrder === 'desc');
                const navInfo = hasSortPrefs
                    ? await ExplorerAPI.getFolderNavigationWithSort(effectiveRoot, sortBy ?? 'name', sortOrder ?? 'asc')
                    : await ExplorerAPI.getFolderNavigation(effectiveRoot);
                if (cancelled) return;

                if (!navInfo) {
                    setFolderNav(null);
                    return;
                }

                if (navRoot && navInfo.allFolders && navRoot !== folderPath) {
                    const index = navInfo.allFolders.findIndex(f => f.path === folderPath);
                    if (index >= 0) {
                        const adjustedNav: FolderNavigation = {
                            parentPath: navInfo.parentPath,
                            currentIndex: index,
                            totalFolders: navInfo.totalFolders,
                            allFolders: navInfo.allFolders,
                        };
                        if (index > 0) {
                            adjustedNav.prevFolder = navInfo.allFolders[index - 1];
                        }
                        if (index < navInfo.allFolders.length - 1) {
                            adjustedNav.nextFolder = navInfo.allFolders[index + 1];
                        }
                        setFolderNav(adjustedNav);
                        return;
                    }
                }

                setFolderNav(navInfo);
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
    }, [folderPath, isActive, navRoot, sortBy, sortOrder]);

    return folderNav;
}
