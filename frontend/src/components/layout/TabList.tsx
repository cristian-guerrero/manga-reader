import { useTabStore } from '../../stores/tabStore';
import { useTranslation } from 'react-i18next';

/**
 * TabEar - Creates the smooth inverted curve at the bottom of Chrome-style tabs
 */
const TabEar = ({ side }: { side: 'left' | 'right' }) => (
    <svg
        className={`absolute bottom-0 ${side === 'left' ? '-left-[10px]' : '-right-[10px]'} w-[10px] h-[10px] pointer-events-none z-20`}
        viewBox="0 0 10 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d={side === 'left'
                ? "M10 0C10 5.52285 5.52285 10 0 10H10V0Z"
                : "M0 0C0 5.52285 4.47715 10 10 10H0V0Z"
            }
            fill="var(--color-surface-primary)"
        />
    </svg>
);

export function TabList() {
    const { t } = useTranslation();
    const { tabs, activeTabId, setActiveTab, closeTab, addTab } = useTabStore();

    const handleAddTab = () => {
        addTab('home', {}, t('common.home') || 'Home');
    };

    return (
        <div className="flex items-end h-[40px] pl-2 no-drag overflow-x-auto no-scrollbar max-w-[calc(100vw-300px)]">
            {tabs.map((tab, index) => (
                <div
                    key={tab.id}
                    onMouseDown={(e) => {
                        // Switch on left click down or middle click
                        if (e.button === 0) setActiveTab(tab.id);
                        if (e.button === 1) closeTab(tab.id);
                    }}
                    onAuxClick={(e) => {
                        // Prevent default browser behavior for middle click
                        if (e.button === 1) e.preventDefault();
                    }}
                    className={`relative group h-[32px] min-w-[140px] max-w-[240px] flex items-center px-4 cursor-default select-none transition-all duration-150 ${activeTabId === tab.id ? 'z-20' : 'z-10'
                        }`}
                >
                    {/* Tab Background */}
                    <div
                        className={`absolute inset-0 transition-all duration-200 ${activeTabId === tab.id
                            ? 'bg-surface-primary opacity-100 rounded-t-lg shadow-[0_-2px_10px_rgba(0,0,0,0.2)]'
                            : 'bg-transparent group-hover:bg-white/5 group-hover:rounded-t-lg mx-[4px] h-[26px] my-auto'
                            }`}
                    >
                        {activeTabId === tab.id && (
                            <>
                                <TabEar side="left" />
                                <TabEar side="right" />
                            </>
                        )}
                    </div>

                    {/* Content */}
                    <div className="relative flex items-center justify-between w-full gap-2 z-10 overflow-hidden">
                        <span className={`text-[11px] font-medium truncate whitespace-nowrap transition-all ${activeTabId === tab.id ? 'opacity-100' : 'opacity-60 group-hover:opacity-90'
                            }`}>
                            {tab.title}
                        </span>

                        {/* Close button */}
                        {(tabs.length > 1) && (
                            <button
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeTab(tab.id);
                                }}
                                className={`flex items-center justify-center w-5 h-5 rounded-md hover:bg-white/10 transition-all ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                    }`}
                            >
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
                                    <path d="M11 1.27L10.73 1 6 5.73 1.27 1 1 1.27 5.73 6 1 10.73 1.27 11 6 6.27 10.73 11 11 10.73 6.27 6 11 1.27z" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Separator */}
                    {activeTabId !== tab.id && index < tabs.length - 1 && activeTabId !== tabs[index + 1].id && (
                        <div className="absolute right-0 top-[10px] bottom-[10px] w-[1px] bg-white/20 transition-opacity" />
                    )}
                </div>
            ))}

            {/* Add Tab Button */}
            <button
                onMouseDown={handleAddTab}
                className="flex items-center justify-center min-w-[28px] h-[28px] rounded-full hover:bg-white/10 transition-all ml-2 mb-[4px] text-white/70 hover:text-white"
                title={t('common.addTab') || "New Tab"}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>
        </div>
    );
}
