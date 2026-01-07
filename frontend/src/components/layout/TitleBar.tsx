/**
 * TitleBar - Custom window title bar with theme support
 * Provides window controls (minimize, maximize, close) and drag area
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '../common/Tooltip';

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
            className="flex items-center justify-between h-10 select-none theme-transition"
            style={{
                backgroundColor: 'rgba(0, 0, 0, 0)',
                color: 'var(--color-titlebar-text)',
                // @ts-ignore
                '--wails-draggable': 'drag',
            }}
            onDoubleClick={handleMaximize}
        >
            {/* App Logo and Title - Draggable */}
            <div className="flex items-center gap-2 flex-1 drag h-full pl-3">
                {/* Logo */}
                <div
                    className="flex items-center justify-center w-5 h-5 rounded transition-transform hover:scale-110 active:scale-95"
                    style={{
                        background: 'var(--gradient-accent)',
                    }}
                >
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="white"
                    >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                    </svg>
                </div>

                {/* Title */}
                <span className="text-xs font-medium truncate">
                    {title || t('common.appName')}
                </span>
            </div>

            {/* Window Controls */}
            <div className="flex items-center h-full no-drag">
                {/* Minimize */}
                <Tooltip content={t('common.minimize') || "Minimize"} placement="bottom">
                    <button
                        onClick={handleMinimize}
                        className="flex items-center justify-center w-12 h-full transition-colors hover:bg-surface-tertiary hover:text-text-primary"
                        style={{
                            color: 'var(--color-text-secondary)',
                        }}
                        aria-label="Minimize"
                    >
                        <MinimizeIcon />
                    </button>
                </Tooltip>

                {/* Maximize/Restore */}
                <Tooltip content={isMaximized ? (t('common.restore') || "Restore") : (t('common.maximize') || "Maximize")} placement="bottom">
                    <button
                        onClick={handleMaximize}
                        className="flex items-center justify-center w-12 h-full transition-colors hover:bg-surface-tertiary hover:text-text-primary"
                        style={{
                            color: 'var(--color-text-secondary)',
                        }}
                        aria-label={isMaximized ? 'Restore' : 'Maximize'}
                    >
                        {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
                    </button>
                </Tooltip>

                {/* Close */}
                <Tooltip content={t('common.close') || "Close"} placement="bottom">
                    <button
                        onClick={handleClose}
                        className="flex items-center justify-center w-12 h-full transition-colors hover:bg-red-600 hover:text-white"
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
