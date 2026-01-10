import { useTabStore } from '../../stores/tabStore';
import { useTranslation } from 'react-i18next';

/**
 * TabList - Renders a list of draggable-safe tabs with a floating "pill" style
 */
export function TabList() {
    const { t } = useTranslation();
    const { tabs, activeTabId, setActiveTab, closeTab, addTab } = useTabStore();

    const handleAddTab = () => {
        addTab('home', {}, t('common.home') || 'Home');
    };

    return (
        <div className="flex items-center h-full no-drag overflow-x-auto no-scrollbar max-w-[calc(100vw-300px)]">
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
                    className={`relative group h-[34px] min-w-[120px] max-w-[200px] flex items-center px-3 cursor-default select-none transition-all duration-150 mx-[1px] ${activeTabId === tab.id ? 'z-20' : 'z-10'
                        }`}
                >
                    {/* Tab Background - Floating Rounded Pill */}
                    <div
                        className={`absolute inset-0 transition-all duration-200 rounded-[6px] ${activeTabId === tab.id
                            ? 'bg-white/10 opacity-100 shadow-sm'
                            : 'bg-transparent group-hover:bg-white/5'
                            }`}
                    />

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
                                className={`flex items-center justify-center w-5 h-5 rounded-md hover:bg-white/20 transition-all ${activeTabId === tab.id ? 'opacity-70' : 'opacity-30 group-hover:opacity-60'
                                    } hover:!opacity-100`}
                            >
                                <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                                    <path d="M1 1L9 9M9 1L1 9" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Separator - shows between inactive tabs */}
                    {activeTabId !== tab.id && index < tabs.length - 1 && activeTabId !== tabs[index + 1].id && (
                        <div className="absolute -right-[1.5px] top-[10px] bottom-[10px] w-[1px] bg-white/10 transition-opacity" />
                    )}
                </div>
            ))}

            {/* Add Tab Button */}
            <button
                onMouseDown={handleAddTab}
                className="flex items-center justify-center min-w-[26px] h-[26px] rounded-md hover:bg-white/10 transition-all ml-1 text-white/50 hover:text-white"
                title={t('common.addTab') || "New Tab"}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>
        </div>
    );
}
