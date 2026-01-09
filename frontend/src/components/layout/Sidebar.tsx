import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { Tooltip } from '../common/Tooltip';

// Icons
interface NavItem {
    id: 'home' | 'explorer' | 'history' | 'oneShot' | 'series' | 'download' | 'settings';
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

const navItems: NavItem[] = [
    { id: 'home', icon: <HomeIcon />, labelKey: 'navigation.home' },
    { id: 'explorer', icon: <ExplorerIcon />, labelKey: 'navigation.explorer' },
    { id: 'history', icon: <HistoryIcon />, labelKey: 'navigation.history' },
    { id: 'oneShot', icon: <OneShotIcon />, labelKey: 'navigation.oneShot' },
    { id: 'series', icon: <SeriesIcon />, labelKey: 'navigation.series' },
    { id: 'download', icon: <DownloadIcon />, labelKey: 'navigation.download' },
    { id: 'settings', icon: <SettingsIcon />, labelKey: 'navigation.settings' },
];

export function Sidebar() {
    const { t } = useTranslation();
    const { sidebarCollapsed, toggleSidebar, enabledMenuItems } = useSettingsStore();
    const { activeMenuPage, navigate } = useNavigationStore();

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
                width: sidebarCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width-expanded)'
            }}
        >
            {/* Navigation Items */}
            <nav className="flex-1 py-4 px-3 space-y-1 relative">
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
                        onClick={() => navigate(item.id)}
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
                    }}
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
        </aside>
    );
}

// Individual navigation button
interface NavButtonProps {
    item: NavItem;
    isActive: boolean;
    isCollapsed: boolean;
    onClick: () => void;
}

function NavButton({ item, isActive, isCollapsed, onClick }: NavButtonProps) {
    const { t } = useTranslation();

    return (
        <Tooltip
            content={isCollapsed ? t(item.labelKey) : ''}
            placement="right"
            className="w-full h-11"
        >
            <button
                onClick={onClick}
                className="relative flex items-center w-full h-11 px-3 rounded-lg transition-all group active:scale-[0.98]"
                style={{
                    backgroundColor: isActive ? 'var(--color-accent)' : 'rgba(0, 0, 0, 0)',
                    color: isActive ? 'white' : 'var(--color-text-secondary)',
                }}
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
