/**
 * useViewerControls - Hook to handle viewer controls (auto-hide, etc.)
 * Extracted from ViewerPage to improve separation of concerns
 */

import { useState, useEffect, useRef } from 'react';

export function useViewerControls() {
    const [showControls, setShowControls] = useState(true);
    const [showWidthSlider, setShowWidthSlider] = useState(false);
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const [showSpeedSlider, setShowSpeedSlider] = useState(false);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-hide controls
    useEffect(() => {
        const handleMouseMove = () => {
            setShowControls(true);
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, []);

    return {
        showControls,
        setShowControls,
        showWidthSlider,
        setShowWidthSlider,
        isAutoScrolling,
        setIsAutoScrolling,
        showSpeedSlider,
        setShowSpeedSlider,
    };
}
