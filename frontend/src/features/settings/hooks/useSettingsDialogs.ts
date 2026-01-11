/**
 * useSettingsDialogs - Hook to manage dialog states
 */

import { useState } from 'react';

export function useSettingsDialogs() {
    const [isResetOpen, setIsResetOpen] = useState(false);
    const [isClearCacheOpen, setIsClearCacheOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    return {
        isResetOpen,
        setIsResetOpen,
        isClearCacheOpen,
        setIsClearCacheOpen,
        isHelpOpen,
        setIsHelpOpen,
    };
}
