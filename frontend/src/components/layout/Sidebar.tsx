import { useTranslation } from 'react-i18next';
import { useCallback, useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNavigation } from '../../hooks/useNavigation';
import { useTabStore } from '../../stores/tabStore';
import { Tooltip } from '../ui/Tooltip';
import { ContextMenu } from '../ui/ContextMenu';
import type { ContextMenuItem } from '@types';

// Icons
interface NavItem {
    id: 'home' | 'explorer' | 'history' | 'oneShot' | 'series' | 'download' | 'colorizer' | 'settings' | 'library-manager';
    icon: JSX.Element;
    labelKey: string;
}

const ChevronLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const HomeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

const HistoryIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const OneShotIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="16" y2="11" />
        <line x1="8" y1="15" x2="12" y2="15" />
    </svg>
);

const SeriesIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6" y2="6.01" />
        <line x1="6" y1="18" x2="6" y2="18.01" />
    </svg>
);

const SettingsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);
const ExplorerIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);
const DownloadIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);
const ColorizerIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="10.5" r="2.5" />
        <circle cx="8.5" cy="7.5" r="2.5" />
        <circle cx="6.5" cy="12.5" r="2.5" />
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12c0 2.028.603 3.916 1.639 5.494" />
        <path d="M12 8v8" />
        <path d="M8 12h8" />
    </svg>
);
const LibrariesIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M12 6v7" />
        <path d="M9 9h6" />
    </svg>
);

const navItems: NavItem[] = [
    { id: 'home', icon: <HomeIcon />, labelKey: 'navigation.home' },
    { id: 'explorer', icon: <ExplorerIcon />, labelKey: 'navigation.explorer' },
    { id: 'history', icon: <HistoryIcon />, labelKey: 'navigation.history' },
    { id: 'oneShot', icon: <OneShotIcon />, labelKey: 'navigation.oneShot' },
    { id: 'series', icon: <SeriesIcon />, labelKey: 'navigation.series' },
    { id: 'download', icon: <DownloadIcon />, labelKey: 'navigation.download' },
    { id: 'colorizer', icon: <ColorizerIcon />, labelKey: 'navigation.colorizer' },
    { id: 'library-manager', icon: <LibrariesIcon />, labelKey: 'navigation.libraryManager' },
    { id: 'settings', icon: <SettingsIcon />, labelKey: 'navigation.settings' },
];

export function Sidebar() {
    const { t } = useTranslation();
    const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);
    const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);
    const enabledMenuItems = useSettingsStore((s) => s.enabledMenuItems);
    const { activeMenuPage, navigate } = useNavigation();
    const { addTab } = useTabStore();
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        navItemId?: string;
        navItemLabel?: string;
    } | null>(null);

    const handleCloseApp = useCallback(() => {
        try {
            (window as any).runtime?.Quit();
        } catch {
            console.log('Quit app');
        }
    }, []);

    const handleNavContextMenu = useCallback(
        (e: React.MouseEvent, itemId: string, itemLabel: string) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({ x: e.clientX, y: e.clientY, navItemId: itemId, navItemLabel: itemLabel });
        },
        [],
    );

    const handleContainerContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY });
    }, []);

    const handleCloseContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    const visibleItems = navItems.filter(item => enabledMenuItems?.[item.id] !== false);

    // Calculate Y offset for the indicator based on visible items
    // Use activeMenuPage instead of currentPage to show the correct menu item as active
    const activeItemIndex = visibleItems.findIndex(item => item.id === activeMenuPage);
    const indicatorY = activeItemIndex !== -1 ? activeItemIndex * 48 : 0; // 48px is height of NavButton (44px + 4px gap roughly)
    const showIndicator = activeItemIndex !== -1;

    return (
        <aside
            className={`flex flex-col h-full theme-transition sidebar-transition ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
                }`}
            style={{
                backgroundColor: 'rgba(0, 0, 0, 0)',
                width: sidebarCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width-expanded)',
                '--wails-draggable': 'drag'
            } as any}
        >
            {/* Navigation Items */}
            <nav className="flex-1 py-4 px-3 space-y-1 relative" onContextMenu={handleContainerContextMenu}>
                {/* Active indicator */}
                {showIndicator && (
                    <div
                        className="sidebar-item-active-indicator"
                        style={{
                            transform: `translateY(${indicatorY}px)`,
                            top: '26px' // Adjust for initial padding and alignment
                        }}
                    />
                )}

                {visibleItems.map((item) => (
                    <NavButton
                        key={item.id}
                        item={item}
                        isActive={activeMenuPage === item.id}
                        isCollapsed={sidebarCollapsed}
                        onClick={() => {
                            // If clicking on explorer button while already in explorer, reset to root
                            if (item.id === 'explorer' && activeMenuPage === 'explorer') {
                                navigate(item.id, { resetToRoot: 'true' });
                            } else {
                                navigate(item.id);
                            }
                        }}
                        onContextMenu={(e) => handleNavContextMenu(e, item.id, t(item.labelKey))}
                    />
                ))}
            </nav>

            {/* Collapse Toggle */}
            <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                    onClick={toggleSidebar}
                    className="flex items-center justify-center w-full h-10 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                        backgroundColor: 'var(--color-surface-tertiary)',
                        color: 'var(--color-text-secondary)',
                        '--wails-draggable': 'no-drag'
                    } as any}
                >
                    <div
                        className="transition-transform duration-300"
                        style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                        <ChevronLeftIcon />
                    </div>
                    {!sidebarCollapsed && (
                        <span
                            className="ml-2 text-sm font-medium overflow-hidden whitespace-nowrap animate-fade-in"
                        >
                            {t('common.close')}
                        </span>
                    )}
                </button>
            </div>

            {contextMenu && (
                <ContextMenu
                    position={{ x: contextMenu.x, y: contextMenu.y }}
                    onClose={handleCloseContextMenu}
                    items={buildSidebarContextMenuItems(contextMenu.navItemId, contextMenu.navItemLabel, t, addTab, handleCloseApp)}
                />
            )}
        </aside>
    );
}

function buildSidebarContextMenuItems(
    navItemId: string | undefined,
    navItemLabel: string | undefined,
    t: (key: string) => string,
    addTab: (...args: any[]) => string,
    handleCloseApp: () => void,
): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];

    if (navItemId) {
        items.push({
            id: 'open-in-tab',
            label: t('common.openInTab'),
            onClick: () => addTab(navItemId, {}, navItemLabel),
        });
        items.push({ id: 'separator', type: 'separator', label: '' });
    }

    items.push({ id: 'close-app', label: t('common.close'), onClick: handleCloseApp });

    return items;
}

// Individual navigation button
interface NavButtonProps {
    item: NavItem;
    isActive: boolean;
    isCollapsed: boolean;
    onClick: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

function NavButton({ item, isActive, isCollapsed, onClick, onContextMenu }: NavButtonProps) {
    const { t } = useTranslation();

    return (
        <Tooltip
            content={isCollapsed ? t(item.labelKey) : ''}
            placement="right"
            className="w-full h-11"
        >
            <button
                onClick={onClick}
                onContextMenu={onContextMenu}
                className="relative flex items-center w-full h-11 px-3 rounded-lg transition-all group active:scale-[0.98]"
                style={{
                    backgroundColor: isActive ? 'var(--color-accent)' : 'rgba(0, 0, 0, 0)',
                    color: isActive ? 'white' : 'var(--color-text-secondary)',
                    '--wails-draggable': 'no-drag'
                } as any}
            >
                {/* Icon */}
                <div
                    className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                >
                    {item.icon}
                </div>

                {/* Label */}
                {!isCollapsed && (
                    <span
                        className="ml-3 text-sm font-medium truncate animate-fade-in"
                    >
                        {t(item.labelKey)}
                    </span>
                )}
            </button>
        </Tooltip>
    );
}

export default Sidebar;
