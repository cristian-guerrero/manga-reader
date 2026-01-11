/**
 * useWindowManagement - Hook for managing window state (maximized, rounded corners)
 */

import { useState, useEffect, useCallback } from 'react';
import { DEBOUNCE_DELAYS } from '../constants';

/**
 * Hook to manage window maximization state and rounded corners
 */
export function useWindowManagement() {
    const [isMaximized, setIsMaximized] = useState(false);

    // Check window maximization state - use local detection instead of backend call
    const checkMaximized = useCallback(() => {
        // Consider maximized if window fills ~95% of screen
        const isFullScreen =
            window.outerWidth >= window.screen.availWidth * 0.95 &&
            window.outerHeight >= window.screen.availHeight * 0.95;
        setIsMaximized(isFullScreen);
    }, []);

    useEffect(() => {
        checkMaximized();

        // Debounced resize handler to avoid excessive backend calls
        let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
        const handleResize = () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(checkMaximized, DEBOUNCE_DELAYS.WINDOW_RESIZE);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (resizeTimeout) clearTimeout(resizeTimeout);
        };
    }, [checkMaximized]);

    // Apply rounded corners when not maximized
    useEffect(() => {
        if (isMaximized) {
            document.body.classList.remove('window-rounded');
        } else {
            document.body.classList.add('window-rounded');
        }
    }, [isMaximized]);
}
