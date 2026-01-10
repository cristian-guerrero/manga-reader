/**
 * TitleBar - Custom window title bar with theme support
 * Provides window controls (minimize, maximize, close) and drag area
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '../common/Tooltip';
import { TabList } from './TabList';
import { useTabStore } from '../../stores/tabStore';
import { useSettingsStore } from '../../stores/settingsStore';

// Icons
const MinimizeIcon = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
        <rect y="5" width="12" height="2" rx="1" />
    </svg>
);

const MaximizeIcon = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="10" height="10" rx="1.5" />
    </svg>
);

const RestoreIcon = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="7" height="7" rx="1" />
        <path d="M4 3V2C4 1.44772 4.44772 1 5 1H10C10.5523 1 11 1.44772 11 2V7C11 7.55228 10.5523 8 10 8H9" />
    </svg>
);

const CloseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
        <path d="M1.41 0L0 1.41L4.59 6L0 10.59L1.41 12L6 7.41L10.59 12L12 10.59L7.41 6L12 1.41L10.59 0L6 4.59L1.41 0Z" />
    </svg>
);

interface TitleBarProps {
    title?: string;
}

export function TitleBar({ title }: TitleBarProps) {
    const { t } = useTranslation();
    const [isMaximized, setIsMaximized] = useState(false);
    const { tabs } = useTabStore();
    const { sidebarCollapsed } = useSettingsStore();

    // Check maximized state on mount
    useEffect(() => {
        checkMaximized();
        // Listen for window resize to update maximized state
        window.addEventListener('resize', checkMaximized);
        return () => window.removeEventListener('resize', checkMaximized);
    }, []);

    const checkMaximized = async () => {
        try {
            // @ts-ignore - Wails runtime
            if (window.runtime) {
                const maximized = await window.runtime.WindowIsMaximised();
                setIsMaximized(maximized);
            }
        } catch {
            // Fallback for development
        }
    };

    const handleMinimize = () => {
        try {
            // @ts-ignore - Wails runtime
            window.runtime?.WindowMinimise();
        } catch {
            console.log('Minimize clicked');
        }
    };

    const handleMaximize = () => {
        try {
            // @ts-ignore - Wails runtime
            if (isMaximized) {
                window.runtime?.WindowUnmaximise();
            } else {
                window.runtime?.WindowMaximise();
            }
            setIsMaximized(!isMaximized);
        } catch {
            console.log('Maximize clicked');
        }
    };

    const handleClose = () => {
        try {
            // @ts-ignore - Wails runtime
            window.runtime?.Quit();
        } catch {
            console.log('Close clicked');
        }
    };

    return (
        <header
            className="flex items-center justify-between h-12 select-none theme-transition wails-drag"
            style={{
                backgroundColor: 'var(--color-surface-secondary)',
                color: 'var(--color-titlebar-text)',
                borderBottom: '1px solid var(--color-border-primary)'
            }}
        >
            {/* Left side: Tabs starting with a small margin */}
            <div className="flex items-center flex-1 h-full min-w-0">
                {/* Spacer to prevent being "stuck" to the edge */}
                <div
                    className="w-3 h-full flex-shrink-0 drag"
                    onDoubleClick={handleMaximize}
                />

                {/* Tabs - fills all available space */}
                <TabList />
            </div>

            {/* Window Controls */}
            <div className="flex items-center h-full no-drag">
                {/* Minimize */}
                <Tooltip content={t('common.minimize') || "Minimize"} placement="bottom" className="h-full no-drag">
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMinimize();
                        }}
                        className="flex items-center justify-center w-12 h-full transition-colors hover:bg-white/5 hover:text-text-primary no-drag"
                        style={{
                            color: 'var(--color-text-secondary)',
                        }}
                        aria-label="Minimize"
                    >
                        <MinimizeIcon />
                    </button>
                </Tooltip>

                {/* Maximize/Restore */}
                <Tooltip content={isMaximized ? (t('common.restore') || "Restore") : (t('common.maximize') || "Maximize")} placement="bottom" className="h-full no-drag">
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMaximize();
                        }}
                        className="flex items-center justify-center w-12 h-full transition-colors hover:bg-white/5 hover:text-text-primary no-drag"
                        style={{
                            color: 'var(--color-text-secondary)',
                        }}
                        aria-label={isMaximized ? 'Restore' : 'Maximize'}
                    >
                        {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
                    </button>
                </Tooltip>

                {/* Close */}
                <Tooltip content={t('common.close') || "Close"} placement="bottom" className="h-full no-drag">
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleClose();
                        }}
                        className="flex items-center justify-center w-12 h-full transition-colors hover:bg-red-600 hover:text-white no-drag"
                        style={{
                            color: 'var(--color-text-secondary)',
                        }}
                        aria-label="Close"
                    >
                        <CloseIcon />
                    </button>
                </Tooltip>
            </div>
        </header>
    );
}

export default TitleBar;
