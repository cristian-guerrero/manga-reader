/**
 * Sidebar - Collapsible navigation sidebar with animated transitions
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { PageType } from '../../types';

// Icons
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

const FolderIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
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

const ChevronLeftIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

interface NavItem {
    id: PageType;
    icon: React.ReactNode;
    labelKey: string;
}

const navItems: NavItem[] = [
    { id: 'home', icon: <HomeIcon />, labelKey: 'navigation.home' },
    { id: 'history', icon: <HistoryIcon />, labelKey: 'navigation.history' },
    { id: 'folders', icon: <FolderIcon />, labelKey: 'navigation.folders' },
    { id: 'series', icon: <SeriesIcon />, labelKey: 'navigation.series' },
    { id: 'settings', icon: <SettingsIcon />, labelKey: 'navigation.settings' },
];

export function Sidebar() {
    const { t } = useTranslation();
    const { sidebarCollapsed, toggleSidebar } = useSettingsStore();
    const { currentPage, navigate } = useNavigationStore();

    const sidebarVariants = {
        expanded: {
            width: 'var(--sidebar-width-expanded)',
            transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
        },
        collapsed: {
            width: 'var(--sidebar-width-collapsed)',
            transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
        },
    };

    return (
        <motion.aside
            initial={false}
            animate={sidebarCollapsed ? 'collapsed' : 'expanded'}
            variants={sidebarVariants}
            className="flex flex-col h-full theme-transition"
            style={{
                backgroundColor: 'rgba(0, 0, 0, 0)',
            }}
        >
            {/* Navigation Items */}
            <nav className="flex-1 py-4 px-3 space-y-1">
                {navItems.map((item) => (
                    <NavButton
                        key={item.id}
                        item={item}
                        isActive={currentPage === item.id}
                        isCollapsed={sidebarCollapsed}
                        onClick={() => navigate(item.id)}
                    />
                ))}
            </nav>

            {/* Collapse Toggle */}
            <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <motion.button
                    onClick={toggleSidebar}
                    className="flex items-center justify-center w-full h-10 rounded-lg transition-colors"
                    style={{
                        backgroundColor: 'var(--color-surface-tertiary)',
                        color: 'var(--color-text-secondary)',
                    }}
                    whileHover={{
                        backgroundColor: 'var(--color-surface-elevated)',
                        color: 'var(--color-text-primary)',
                    }}
                    whileTap={{ scale: 0.98 }}
                >
                    <motion.div
                        animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <ChevronLeftIcon />
                    </motion.div>
                    <AnimatePresence mode="wait">
                        {!sidebarCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="ml-2 text-sm font-medium overflow-hidden whitespace-nowrap"
                            >
                                {t('common.close')}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.button>
            </div>
        </motion.aside>
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
        <motion.button
            onClick={onClick}
            className="relative flex items-center w-full h-11 px-3 rounded-lg transition-colors group"
            style={{
                backgroundColor: isActive ? 'var(--color-accent)' : 'rgba(0, 0, 0, 0)',
                color: isActive ? 'white' : 'var(--color-text-secondary)',
            }}
            whileHover={{
                backgroundColor: isActive ? 'var(--color-accent-hover)' : 'var(--color-surface-tertiary)',
                color: isActive ? 'white' : 'var(--color-text-primary)',
            }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Active indicator */}
            {isActive && (
                <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 w-1 h-6 rounded-r-full"
                    style={{ backgroundColor: 'white' }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
            )}

            {/* Icon */}
            <motion.div
                className="flex-shrink-0"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2 }}
            >
                {item.icon}
            </motion.div>

            {/* Label */}
            <AnimatePresence mode="wait">
                {!isCollapsed && (
                    <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="ml-3 text-sm font-medium truncate"
                    >
                        {t(item.labelKey)}
                    </motion.span>
                )}
            </AnimatePresence>

            {/* Tooltip for collapsed state */}
            {isCollapsed && (
                <div
                    className="absolute left-full ml-2 px-3 py-1.5 text-sm font-medium rounded-lg 
                     opacity-0 invisible group-hover:opacity-100 group-hover:visible
                     transition-all duration-200 z-50 whitespace-nowrap"
                    style={{
                        backgroundColor: 'var(--color-surface-elevated)',
                        color: 'var(--color-text-primary)',
                        boxShadow: 'var(--shadow-lg)',
                        border: '1px solid var(--color-border)',
                    }}
                >
                    {t(item.labelKey)}
                </div>
            )}
        </motion.button>
    );
}

export default Sidebar;
