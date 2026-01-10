/**
 * useKeyboardNav - Hook for keyboard navigation in the viewer
 * Optimized to avoid unnecessary re-registrations
 */

import { useCallback, useRef, useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useViewerStore } from '../stores/viewerStore';
import { useNavigationStore } from '../stores/navigationStore';
import { useSettingsStore } from '../stores/settingsStore';

interface UseKeyboardNavOptions {
    enabled?: boolean;
}

export function useKeyboardNav(options: UseKeyboardNavOptions = {}) {
    const { enabled = true } = options;
    const {
        nextImage,
        prevImage,
        goToImage,
        images,
        zoomIn,
        zoomOut,
        resetZoom,
    } = useViewerStore();
    const { goBack } = useNavigationStore();
    const { toggleSidebar } = useSettingsStore();

    // Use refs to maintain stable references and avoid re-registering hotkeys
    const callbacksRef = useRef({
        nextImage,
        prevImage,
        goToImage,
        zoomIn,
        zoomOut,
        resetZoom,
        goBack,
        toggleSidebar,
    });

    // Update refs when callbacks change
    useEffect(() => {
        callbacksRef.current = {
            nextImage,
            prevImage,
            goToImage,
            zoomIn,
            zoomOut,
            resetZoom,
            goBack,
            toggleSidebar,
        };
    }, [nextImage, prevImage, goToImage, zoomIn, zoomOut, resetZoom, goBack, toggleSidebar]);

    // Create stable callbacks that use refs
    const handleNext = useCallback((e: KeyboardEvent) => {
        e.preventDefault();
        callbacksRef.current.nextImage();
    }, []);

    const handlePrev = useCallback((e: KeyboardEvent) => {
        e.preventDefault();
        callbacksRef.current.prevImage();
    }, []);

    const handleHome = useCallback((e: KeyboardEvent) => {
        e.preventDefault();
        callbacksRef.current.goToImage(0);
    }, []);

    const handleEnd = useCallback((e: KeyboardEvent) => {
        e.preventDefault();
        callbacksRef.current.goToImage(images.length - 1);
    }, [images.length]);

    const handleZoomIn = useCallback((e: KeyboardEvent) => {
        e.preventDefault();
        callbacksRef.current.zoomIn();
    }, []);

    const handleZoomOut = useCallback((e: KeyboardEvent) => {
        e.preventDefault();
        callbacksRef.current.zoomOut();
    }, []);

    const handleResetZoom = useCallback((e: KeyboardEvent) => {
        e.preventDefault();
        callbacksRef.current.resetZoom();
    }, []);

    const handleToggleSidebar = useCallback((e: KeyboardEvent) => {
        e.preventDefault();
        callbacksRef.current.toggleSidebar();
    }, []);

    const handleGoBack = useCallback((e: KeyboardEvent) => {
        e.preventDefault();
        callbacksRef.current.goBack();
    }, []);

    // Next page - Right arrow, D, Space, Page Down
    useHotkeys(
        'right, d, space, pagedown',
        handleNext,
        { enabled },
        [handleNext, enabled]
    );

    // Previous page - Left arrow, A, Page Up
    useHotkeys(
        'left, a, pageup',
        handlePrev,
        { enabled },
        [handlePrev, enabled]
    );

    // First page - Home
    useHotkeys(
        'home',
        handleHome,
        { enabled },
        [handleHome, enabled]
    );

    // Last page - End
    useHotkeys(
        'end',
        handleEnd,
        { enabled },
        [handleEnd, enabled]
    );

    // Zoom in - Plus, Equal
    useHotkeys(
        'plus, equal, ctrl+=',
        handleZoomIn,
        { enabled },
        [handleZoomIn, enabled]
    );

    // Zoom out - Minus
    useHotkeys(
        'minus, ctrl+-',
        handleZoomOut,
        { enabled },
        [handleZoomOut, enabled]
    );

    // Reset zoom - 0
    useHotkeys(
        '0, ctrl+0',
        handleResetZoom,
        { enabled },
        [handleResetZoom, enabled]
    );

    // Toggle sidebar - B
    useHotkeys(
        'b',
        handleToggleSidebar,
        { enabled },
        [handleToggleSidebar, enabled]
    );

    // Go back - Backspace
    useHotkeys(
        'backspace',
        handleGoBack,
        { enabled },
        [handleGoBack, enabled]
    );

    return {
        nextImage,
        prevImage,
        goToImage,
        zoomIn,
        zoomOut,
        resetZoom,
    };
}

export default useKeyboardNav;
