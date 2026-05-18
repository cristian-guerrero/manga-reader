import { useState, useEffect } from 'react';
import { FolderNavigation } from '@services/api/explorerAPI';
import { AppAPI } from '@services/api/appAPI';

export function useFolderNavigation(folderPath: string | undefined, isActive: boolean, navRoot?: string) {
    const [folderNav, setFolderNav] = useState<FolderNavigation | null>(null);

    useEffect(() => {
        if (!folderPath || !isActive) {
            setFolderNav(null);
            return;
        }

        let cancelled = false;

        const loadFolderNav = async () => {
            try {
                // When navRoot is set, use it to get the flat children list
                // and determine the current folder's position within it
                const effectiveRoot = navRoot || folderPath;
                const navInfo = await AppAPI.getFolderNavigation(effectiveRoot);
                if (cancelled) return;

                if (!navInfo) {
                    setFolderNav(null);
                    return;
                }

                // If we have a flat folder list and the current folder differs from the root,
                // find the current position in the flat list
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

                // Otherwise use the response as-is
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
    }, [folderPath, isActive, navRoot]);

    return folderNav;
}
