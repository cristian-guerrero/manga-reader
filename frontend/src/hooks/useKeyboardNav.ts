/**
 * useKeyboardNav - Hook for keyboard navigation in the viewer
 */

import { useCallback } from 'react';
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

    // Next page - Right arrow, D, Space, Page Down
    useHotkeys(
        'right, d, space, pagedown',
        (e) => {
            e.preventDefault();
            nextImage();
        },
        { enabled },
        [nextImage]
    );

    // Previous page - Left arrow, A, Page Up
    useHotkeys(
        'left, a, pageup',
        (e) => {
            e.preventDefault();
            prevImage();
        },
        { enabled },
        [prevImage]
    );

    // First page - Home
    useHotkeys(
        'home',
        (e) => {
            e.preventDefault();
            goToImage(0);
        },
        { enabled },
        [goToImage]
    );

    // Last page - End
    useHotkeys(
        'end',
        (e) => {
            e.preventDefault();
            goToImage(images.length - 1);
        },
        { enabled },
        [goToImage, images.length]
    );

    // Zoom in - Plus, Equal
    useHotkeys(
        'plus, equal, ctrl+=',
        (e) => {
            e.preventDefault();
            zoomIn();
        },
        { enabled },
        [zoomIn]
    );

    // Zoom out - Minus
    useHotkeys(
        'minus, ctrl+-',
        (e) => {
            e.preventDefault();
            zoomOut();
        },
        { enabled },
        [zoomOut]
    );

    // Reset zoom - 0
    useHotkeys(
        '0, ctrl+0',
        (e) => {
            e.preventDefault();
            resetZoom();
        },
        { enabled },
        [resetZoom]
    );

    // Toggle sidebar - B
    useHotkeys(
        'b',
        (e) => {
            e.preventDefault();
            toggleSidebar();
        },
        { enabled },
        [toggleSidebar]
    );

    // Go back - Backspace
    useHotkeys(
        'backspace',
        (e) => {
            e.preventDefault();
            goBack();
        },
        { enabled },
        [goBack]
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
