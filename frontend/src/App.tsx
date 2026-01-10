/**
 * App - Main application component
 */

import { useEffect, Suspense, useState, useCallback, useMemo } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './components/pages/HomePage';
import { ViewerPage } from './components/viewers/ViewerPage';
import { OneShotPage } from './components/pages/OneShotPage';
import { SeriesPage } from './components/pages/SeriesPage';
import { SeriesDetailsPage } from './components/pages/SeriesDetailsPage';
import { HistoryPage } from './components/pages/HistoryPage';
import { ExplorerPage } from './components/pages/ExplorerPage';
import { ThumbnailsPage } from './components/pages/ThumbnailsPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { DownloadPage } from './components/pages/DownloadPage';
import { useNavigationStore } from './stores/navigationStore';
import { useSettingsStore } from './stores/settingsStore';
import { useTabStore } from './stores/tabStore';
import { usePanicMode } from './hooks/usePanicMode';
import { ToastProvider } from './components/common/Toast';
import { EventsOn } from '../wailsjs/runtime';
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

// Page router component with optimized rendering
function PageRouter({ tabId, isActive = true }: { tabId?: string; isActive?: boolean }) {
    const activeTabIdFromStore = useTabStore(state => state.activeTabId);
    const id = tabId || activeTabIdFromStore;

    // In persistent mode, we want to ensure each PageRouter instance stays tied to its tab
    // but the stores currently only reflect the active tab. So when inactive, 
    // it will render the active tab's content. This is acceptable as long as it's hidden.

    const { currentPage, params } = useNavigationStore();

    // Create a stable key from params for comparison
    const paramsKey = useMemo(() => {
        return Object.keys(params).sort().map(k => `${k}:${params[k]}`).join('|');
    }, [params]);

    // Memoize page content to prevent unnecessary re-renders
    const pageContent = useMemo(() => {
        return renderPage(currentPage, params, isActive);
    }, [currentPage, paramsKey, isActive]);

    return (
        <div
            className="h-full w-full"
            style={{
                display: isActive ? 'block' : 'none',
                visibility: isActive ? 'visible' : 'hidden' // Double layer for security against layout shifts
            }}
        >
            {pageContent}
        </div>
    );
}

function PageContainer() {
    const { tabs, activeTabId } = useTabStore();
    const { tabMemorySaving } = useSettingsStore();

    if (tabMemorySaving) {
        return <PageRouter key={activeTabId} isActive={true} />;
    }

    return (
        <div className="h-full w-full relative">
            {tabs.map((tab) => (
                <PageRouter
                    key={tab.id}
                    tabId={tab.id}
                    isActive={tab.id === activeTabId}
                />
            ))}
        </div>
    );
}

// Render page based on current navigation
function renderPage(page: string, params: Record<string, string>, isActive: boolean): React.ReactNode {
    switch (page) {
        case 'home':
            return <HomePage />;
        case 'viewer':
            return <ViewerPage folderPath={params.folder} isActive={isActive} />;
        case 'history':
            return <HistoryPage />;
        case 'oneShot':
            return <OneShotPage />;
        case 'series':
            return <SeriesPage />;
        case 'series-details':
            return <SeriesDetailsPage seriesPath={params.series} />;
        case 'settings':
            return <SettingsPage />;
        case 'thumbnails':
            return <ThumbnailsPage folderPath={params.folder} isActive={isActive} />;
        case 'explorer':
            return <ExplorerPage isActive={isActive} />;
        case 'download':
            return <DownloadPage />;
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
        let unsubscribeAppReady: (() => void) | undefined;

        const initApp = async () => {
            try {
                await loadSettings();

                // Restore last page after settings load
                const lastPage = useSettingsStore.getState().lastPage;
                if (lastPage && lastPage !== 'home') {
                    // Only restore main pages, not viewer or other temporary pages
                    const mainPages = ['home', 'oneShot', 'series', 'history', 'download', 'settings'];
                    if (mainPages.includes(lastPage)) {
                        useNavigationStore.getState().navigate(lastPage as any);
                    }
                }
            } catch (error) {
                console.error('[App] Failed to initialize app:', error);
                // App can continue with defaults even if settings load fails

                // Try again when app_ready event fires as backup
                unsubscribeAppReady = EventsOn('app_ready', async () => {
                    console.log('[App] Received app_ready event, retrying settings load');
                    try {
                        await loadSettings();
                    } catch (retryError) {
                        console.error('[App] Failed to load settings on app_ready:', retryError);
                    }
                });
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
            if (unsubscribeAppReady) unsubscribeAppReady();
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
                    <PageContainer />
                </MainLayout>
            </ToastProvider>
        </Suspense>
    );
}

export default App;
