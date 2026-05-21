import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@stores';
import { useNavigation } from '@hooks';

interface MobileBottomNavProps {
    visible: boolean;
    contentRef: React.RefObject<HTMLElement | null>;
}

type MobileNavItem = {
    id: 'home' | 'explorer' | 'oneShot' | 'series';
    icon: JSX.Element;
    labelKey: string;
};

const HomeIcon = ({ active }: { active?: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

const ExplorerIcon = ({ active }: { active?: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
    </svg>
);

const OneShotIcon = ({ active }: { active?: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="16" y2="11" />
        <line x1="8" y1="15" x2="12" y2="15" />
    </svg>
);

const SeriesIcon = ({ active }: { active?: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6" y2="6.01" />
        <line x1="6" y1="18" x2="6" y2="18.01" />
    </svg>
);

const mobileNavItems: MobileNavItem[] = [
    { id: 'home', icon: <HomeIcon />, labelKey: 'navigation.home' },
    { id: 'explorer', icon: <ExplorerIcon />, labelKey: 'navigation.explorer' },
    { id: 'oneShot', icon: <OneShotIcon />, labelKey: 'navigation.oneShot' },
    { id: 'series', icon: <SeriesIcon />, labelKey: 'navigation.series' },
];

export function MobileBottomNav({ visible, contentRef }: MobileBottomNavProps) {
    const { t } = useTranslation();
    const { activeMenuPage, navigate } = useNavigation();
    const enabledMenuItems = useSettingsStore((state) => state.enabledMenuItems);

    const visibleItems = mobileNavItems.filter(item => enabledMenuItems?.[item.id] !== false);

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 border-t flex items-center justify-around transition-transform duration-300 ease-in-out"
            style={{
                backgroundColor: 'var(--color-surface-secondary)',
                borderColor: 'var(--color-border)',
                transform: visible ? 'translateY(0)' : 'translateY(100%)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                zIndex: 50,
            }}
        >
            {visibleItems.map((item) => {
                const isActive = activeMenuPage === item.id;
                const IconComponent = item.id === 'home' ? HomeIcon :
                    item.id === 'explorer' ? ExplorerIcon :
                    item.id === 'oneShot' ? OneShotIcon : SeriesIcon;

                return (
                    <button
                        key={item.id}
                        onClick={() => {
                            if (item.id === 'explorer' && activeMenuPage === 'explorer') {
                                navigate(item.id, { resetToRoot: 'true' });
                            } else {
                                navigate(item.id);
                            }
                        }}
                        className="relative flex flex-col items-center justify-center min-w-[64px] min-h-[56px] flex-1 py-1.5 transition-colors"
                        style={{
                            color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                        }}
                    >
                        {isActive && (
                            <div
                                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                                style={{ backgroundColor: 'var(--color-accent)' }}
                            />
                        )}
                        <div className="transition-transform duration-200" style={{ transform: isActive ? 'scale(1.15)' : 'scale(1)' }}>
                            <IconComponent active={isActive} />
                        </div>
                        <span className="text-[10px] mt-1 font-semibold truncate" style={{ fontWeight: isActive ? 700 : 500 }}>
                            {t(item.labelKey)}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}
