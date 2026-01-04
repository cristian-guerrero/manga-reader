/**
 * usePanicMode - Hook for panic button functionality
 * Instantly clears the screen and returns to home when panic key is pressed
 */

import { useEffect, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigationStore } from '../stores/navigationStore';
import { useSettingsStore } from '../stores/settingsStore';

interface UsePanicModeOptions {
    enabled?: boolean;
}

export function usePanicMode(options: UsePanicModeOptions = {}) {
    const { enabled = true } = options;
    const { triggerPanic, exitPanic, isPanicMode } = useNavigationStore();
    const { panicKey } = useSettingsStore();

    // Handle panic trigger
    const handlePanic = useCallback(() => {
        if (!isPanicMode) {
            triggerPanic();
            // Auto-exit panic mode after a brief moment
            setTimeout(() => {
                exitPanic();
            }, 100);
        }
    }, [isPanicMode, triggerPanic, exitPanic]);

    // Register hotkey
    useHotkeys(
        panicKey.toLowerCase(),
        (event) => {
            event.preventDefault();
            handlePanic();
        },
        {
            enabled,
            enableOnFormTags: true,
            enableOnContentEditable: true,
        },
        [panicKey, handlePanic, enabled]
    );

    return {
        isPanicMode,
        triggerPanic: handlePanic,
        exitPanic,
    };
}

export default usePanicMode;
