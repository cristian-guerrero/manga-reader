/**
 * Routes Configuration - Centralized route definitions
 * Separates routing logic from App component for better organization
 */

import { lazy } from 'react';
import { PageType } from '../types';

// Lazy load pages for code splitting
// Handle both named and default exports
const HomePage = lazy(() => import('../features/home/HomePage').then(m => ({ default: m.default || m.HomePage })));
const ViewerPage = lazy(() => import('../features/viewer/ViewerPage').then(m => ({ default: m.default || m.ViewerPage })));
const OneShotPage = lazy(() => import('../components/pages/OneShotPage').then(m => ({ default: m.default || m.OneShotPage })));
const SeriesPage = lazy(() => import('../components/pages/SeriesPage').then(m => ({ default: m.default || m.SeriesPage })));
const SeriesDetailsPage = lazy(() => import('../components/pages/SeriesDetailsPage').then(m => ({ default: m.default || m.SeriesDetailsPage })));
const HistoryPage = lazy(() => import('../features/history/HistoryPage').then(m => ({ default: m.default || m.HistoryPage })));
const ExplorerPage = lazy(() => import('../features/explorer/ExplorerPage').then(m => ({ default: m.default || m.ExplorerPage })));
const ThumbnailsPage = lazy(() => import('../components/pages/ThumbnailsPage').then(m => ({ default: m.default || m.ThumbnailsPage })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then(m => ({ default: m.default || m.SettingsPage })));
const DownloadPage = lazy(() => import('../features/download/DownloadPage').then(m => ({ default: m.default || m.DownloadPage })));

/**
 * Route configuration mapping page types to components
 */
export const routes: Record<PageType, React.LazyExoticComponent<any>> = {
    home: HomePage,
    viewer: ViewerPage,
    'oneShot': OneShotPage,
    series: SeriesPage,
    'series-details': SeriesDetailsPage,
    history: HistoryPage,
    explorer: ExplorerPage,
    thumbnails: ThumbnailsPage,
    settings: SettingsPage,
    download: DownloadPage,
};

/**
 * Render page based on current navigation
 */
export function renderPage(
    page: string,
    params: Record<string, string>,
    isActive: boolean,
    tabId?: string
): React.ReactNode {
    const PageComponent = routes[page as PageType] || routes.home;

    switch (page) {
        case 'home':
            return <PageComponent />;
        case 'viewer':
            // @ts-expect-error - Lazy loaded component types are not properly inferred
            return <PageComponent folderPath={params.folder} isActive={isActive} tabId={tabId} />;
        case 'history':
            return <PageComponent />;
        case 'oneShot':
            return <PageComponent />;
        case 'series':
            return <PageComponent />;
        case 'series-details':
            // @ts-expect-error - Lazy loaded component types are not properly inferred
            return <PageComponent seriesPath={params.series} tabId={tabId} />;
        case 'settings':
            return <PageComponent />;
        case 'thumbnails':
            // @ts-expect-error - Lazy loaded component types are not properly inferred
            return <PageComponent folderPath={params.folder} isActive={isActive} tabId={tabId} />;
        case 'explorer':
            // @ts-expect-error - Lazy loaded component types are not properly inferred
            return <PageComponent isActive={isActive} tabId={tabId} />;
        case 'download':
            return <PageComponent />;
        default:
            return <routes.home />;
    }
}
