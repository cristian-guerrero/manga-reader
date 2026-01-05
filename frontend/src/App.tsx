/**
 * App - Main application component
 */

import { useEffect, Suspense, useState, useCallback } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './components/HomePage';
import { ViewerPage } from './components/viewers/ViewerPage';
import { FoldersPage } from './components/browser/FoldersPage';
import { SeriesPage } from './components/browser/SeriesPage';
import { SeriesDetailsPage } from './components/browser/SeriesDetailsPage';
import { HistoryPage } from './components/browser/HistoryPage';
import { ExplorerPage } from './components/browser/ExplorerPage';
import { ThumbnailsPage } from './components/browser/ThumbnailsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { useNavigationStore } from './stores/navigationStore';
import { useSettingsStore } from './stores/settingsStore';
import { usePanicMode } from './hooks/usePanicMode';
import { ToastProvider } from './components/common/Toast';
import './i18n';

declare global {
    interface Window {
        go?: {
            main?: {
                App?: {
                    WindowIsMaximised?: () => Promise<boolean>;
                    [key: string]: any;
                };
            };
        };
    }
}

// Loading component
function LoadingScreen() {
    return (
        <div
            className="flex items-center justify-center h-screen w-screen animate-fade-in"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            <div className="flex flex-col items-center gap-4 animate-scale-in">
                {/* Animated logo */}
                <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center"
                    style={{
                        background: 'var(--gradient-accent)',
                        animation: 'rotateLogo 2s ease-in-out infinite'
                    }}
                >
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="white"
                    >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                    </svg>
                </div>

                {/* Loading text */}
                <div
                    className="text-lg font-medium animate-pulse-slow"
                    style={{ color: 'var(--color-text-secondary)' }}
                >
                    Loading...
                </div>

                {/* Progress bar */}
                <div
                    className="w-48 h-1 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--color-surface-tertiary)' }}
                >
                    <div
                        className="h-full rounded-full animate-progress"
                        style={{
                            background: 'var(--gradient-accent)',
                            width: '100%'
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

// Page router component
function PageRouter() {
    const { currentPage, params } = useNavigationStore();

    return (
        <div className="h-full w-full">
            {renderPage(currentPage, params)}
        </div>
    );
}

// Render page based on current navigation
function renderPage(page: string, params: Record<string, string>): React.ReactNode {
    switch (page) {
        case 'home':
            return <HomePage />;
        case 'viewer':
            return <ViewerPage folderPath={params.folder} />;
        case 'history':
            return <HistoryPage />;
        case 'folders':
            return <FoldersPage />;
        case 'series':
            return <SeriesPage />;
        case 'series-details':
            return <SeriesDetailsPage seriesPath={params.series} />;
        case 'settings':
            return <SettingsPage />;
        case 'thumbnails':
            return <ThumbnailsPage folderPath={params.folder} />;
        case 'explorer':
            return <ExplorerPage />;
        default:
            return <HomePage />;
    }
}

function App() {
    const { loadSettings } = useSettingsStore();
    const [isMaximized, setIsMaximized] = useState(false);

    // Initialize panic mode hook
    usePanicMode();

    // Check window maximization state - use local detection instead of backend call
    const checkMaximized = useCallback(() => {
        // Consider maximized if window fills ~95% of screen
        const isFullScreen =
            window.outerWidth >= window.screen.availWidth * 0.95 &&
            window.outerHeight >= window.screen.availHeight * 0.95;
        setIsMaximized(isFullScreen);
    }, []);

    // Load settings on mount and set up window resize listener
    useEffect(() => {
        const initApp = async () => {
            await loadSettings();

            // Restore last page after settings load
            const lastPage = useSettingsStore.getState().lastPage;
            if (lastPage && lastPage !== 'home') {
                // Only restore main pages, not viewer or other temporary pages
                const mainPages = ['home', 'folders', 'series', 'history', 'settings'];
                if (mainPages.includes(lastPage)) {
                    useNavigationStore.getState().navigate(lastPage as any);
                }
            }
        };

        initApp();
        checkMaximized();

        // Debounced resize handler to avoid excessive backend calls
        let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
        const handleResize = () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(checkMaximized, 200);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (resizeTimeout) clearTimeout(resizeTimeout);
        };
    }, [loadSettings, checkMaximized]);

    // Apply rounded corners when not maximized
    useEffect(() => {
        if (isMaximized) {
            document.body.classList.remove('window-rounded');
        } else {
            document.body.classList.add('window-rounded');
        }
    }, [isMaximized]);

    return (
        <Suspense fallback={<LoadingScreen />}>
            <ToastProvider>
                <MainLayout>
                    <PageRouter />
                </MainLayout>
            </ToastProvider>
        </Suspense>
    );
}

export default App;
