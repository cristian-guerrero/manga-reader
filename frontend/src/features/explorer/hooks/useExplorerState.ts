/**
 * useExplorerState - Hook to manage explorer state
 * Extracted from ExplorerPage to improve separation of concerns
 */

import { useState, useRef, useEffect } from 'react';
import { useTabStore } from '../../../stores';

interface ExplorerState {
    currentPath: string | null;
    pathHistory: string[];
}

interface UseExplorerStateOptions {
    tabId?: string;
    isActive: boolean;
}

export function useExplorerState({ tabId, isActive }: UseExplorerStateOptions) {
    // Get initial state from the specific TAB, not the global active tab
    const getInitialExplorerState = () => {
        const tabs = useTabStore.getState().tabs;
        const tab = tabId ? tabs.find((t) => t.id === tabId) : useTabStore.getState().getActiveTab();
        return tab?.explorerState || null;
    };

    const initialState = getInitialExplorerState();
    const [currentPath, setCurrentPath] = useState<string | null>(initialState?.currentPath || null);
    const [pathHistory, setPathHistory] = useState<string[]>(initialState?.pathHistory || []);
    const currentPathRef = useRef<string | null>(currentPath);

    // Update ref when currentPath changes
    useEffect(() => {
        currentPathRef.current = currentPath;
    }, [currentPath]);

    // Save explorer state to the specific TAB when it changes (but only when active)
    useEffect(() => {
        if (isActive && tabId) {
            const tabs = useTabStore.getState().tabs;
            const tabIndex = tabs.findIndex((t) => t.id === tabId);
            if (tabIndex >= 0) {
                useTabStore.setState({
                    tabs: tabs.map((t, i) => i === tabIndex ? {
                        ...t,
                        explorerState: { currentPath, pathHistory }
                    } : t)
                });
            }
        }
    }, [currentPath, pathHistory, isActive, tabId]);

    return {
        currentPath,
        setCurrentPath,
        pathHistory,
        setPathHistory,
        currentPathRef,
    };
}
