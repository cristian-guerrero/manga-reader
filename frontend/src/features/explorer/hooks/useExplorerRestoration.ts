/**
 * useExplorerRestoration - Hook to handle state restoration and initialization
 * Extracted from ExplorerPage to improve separation of concerns
 */

import { useEffect, useRef } from 'react';
import { useNavigation } from '../../../hooks';
import { MAIN_PAGES_TO_SAVE } from '../../../constants';
import { useTabStore } from '../../../stores';

interface UseExplorerRestorationOptions {
    tabId?: string;
    isActive: boolean;
    explorerState: { currentPath: string | null; pathHistory: string[] } | null;
    previousPage: string | null;
    fromPage: string | null;
    params: Record<string, string>;
    setParams: (params: Record<string, string>) => void;
    loadDirectory: (path: string, pushHistory?: boolean) => Promise<void>;
    setCurrentPath: (path: string | null) => void;
    setPathHistory: React.Dispatch<React.SetStateAction<string[]>>;
    setEntries: React.Dispatch<React.SetStateAction<any[]>>;
    loadBaseFolders: () => Promise<void>;
}

export function useExplorerRestoration({
    tabId,
    isActive,
    explorerState,
    previousPage,
    fromPage,
    params,
    setParams,
    loadDirectory,
    setCurrentPath,
    setPathHistory,
    setEntries,
    loadBaseFolders,
}: UseExplorerRestorationOptions) {
    const isMountedRef = useRef(true);
    const isInitializingRef = useRef(true);

    // Get initial state from tab
    const getInitialExplorerState = () => {
        const tabs = useTabStore.getState().tabs;
        const tab = tabId ? tabs.find((t) => t.id === tabId) : useTabStore.getState().getActiveTab();
        return tab?.explorerState || null;
    };

    // Handle resetToRoot parameter
    useEffect(() => {
        if (isActive && params?.resetToRoot === 'true') {
            setCurrentPath(null);
            setPathHistory([]);
            setEntries([]);
            loadBaseFolders();
            setParams({});
        }
    }, [params?.resetToRoot, setParams, isActive, setCurrentPath, setPathHistory, setEntries, loadBaseFolders]);

    // Restore explorer state from store
    useEffect(() => {
        isMountedRef.current = true;

        const tabInitialState = getInitialExplorerState();

        if (tabInitialState?.currentPath) {
            isInitializingRef.current = true;
            setTimeout(() => {
                if (isMountedRef.current && tabInitialState.currentPath) {
                    loadDirectory(tabInitialState.currentPath, false).finally(() => {
                        setTimeout(() => {
                            isInitializingRef.current = false;
                        }, 50);
                    });
                }
            }, 0);
        } else {
            const savedPath = explorerState?.currentPath;
            const isReturning = fromPage === 'viewer' || fromPage === 'thumbnails' || (previousPage && !MAIN_PAGES_TO_SAVE.includes(previousPage as any));

            if (isReturning && savedPath) {
                isInitializingRef.current = true;
                setPathHistory(explorerState.pathHistory || []);
                setTimeout(() => {
                    if (isMountedRef.current && savedPath) {
                        loadDirectory(savedPath, false).finally(() => {
                            setTimeout(() => {
                                isInitializingRef.current = false;
                            }, 50);
                        });
                    }
                }, 0);
            } else {
                isInitializingRef.current = false;
            }
        }

        return () => {
            isMountedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

    return {
        isInitializingRef,
    };
}
