import { useState, useEffect } from 'react';

interface EnvironmentResult {
    buildType?: string;
    platform?: string;
    arch?: string;
}

function isSmallScreen() {
    return window.innerWidth < 640;
}

export function useIsMobileNetwork(): boolean {
    const [isMobileView, setIsMobileView] = useState(false);

    useEffect(() => {
        const checkMode = async () => {
            let isNetwork = false;

            try {
                if (window.runtime?.Environment) {
                    const env = await window.runtime.Environment() as EnvironmentResult;
                    isNetwork = env.buildType === 'network';
                }
            } catch {
                // Fallback for Wails dev mode
            }

            setIsMobileView(isNetwork && isSmallScreen());
        };

        checkMode();

        const handleResize = () => {
            checkMode();
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return isMobileView;
}
