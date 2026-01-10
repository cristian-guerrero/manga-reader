import { useTabStore, Tab } from '../../stores/tabStore';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../../stores/navigationStore';

export function TabList() {
    const { t } = useTranslation();
    const { tabs, activeTabId, setActiveTab, closeTab, addTab } = useTabStore();
    const { navigate } = useNavigationStore();

    const handleAddTab = () => {
        addTab('home', {}, t('common.home') || 'Home');
    };

    return (
        <div className="flex items-end h-full pl-2 pr-4 gap-0 no-drag overflow-x-auto no-scrollbar max-w-[calc(100vw-300px)]">
            {tabs.map((tab, index) => (
                <div
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative group h-[32px] min-w-[120px] max-w-[200px] flex items-center px-4 cursor-default transition-all duration-200 select-none ${activeTabId === tab.id ? 'z-10' : 'z-0'
                        }`}
                >
                    {/* Tab Background - Chrome Shape */}
                    <div
                        className={`absolute inset-0 transition-colors duration-200 ${activeTabId === tab.id
                                ? 'bg-surface-primary opacity-100'
                                : 'bg-transparent group-hover:bg-white/5'
                            }`}
                        style={{
                            clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 100%, 0 100%)',
                            marginRight: '-4px',
                            marginLeft: '-4px'
                        }}
                    />

                    {/* Active Bottom Highlight */}
                    {activeTabId === tab.id && (
                        <div
                            className="absolute bottom-0 left-[8px] right-[8px] h-[2px] rounded-full z-20"
                            style={{ background: 'var(--gradient-accent)' }}
                        />
                    )}

                    {/* Content */}
                    <div className="relative flex items-center justify-between w-full gap-2 z-10 overflow-hidden">
                        <span className="text-xs font-medium truncate whitespace-nowrap opacity-80 group-hover:opacity-100 transition-opacity">
                            {tab.title}
                        </span>

                        {/* Close button */}
                        {(tabs.length > 1) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeTab(tab.id);
                                }}
                                className={`flex items-center justify-center w-4 h-4 rounded-full hover:bg-white/10 transition-all ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                    }`}
                            >
                                <svg width="8" height="8" viewBox="0 0 12 12" fill="currentColor">
                                    <path d="M1.41 0L0 1.41L4.59 6L0 10.59L1.41 12L6 7.41L10.59 12L12 10.59L7.41 6L12 1.41L10.59 0L6 4.59L1.41 0Z" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Separator */}
                    {activeTabId !== tab.id && index < tabs.length - 1 && activeTabId !== tabs[index + 1].id && (
                        <div className="absolute right-0 top-2 bottom-2 w-[1px] bg-white/10 group-hover:opacity-0 transition-opacity" />
                    )}
                </div>
            ))}

            {/* Add Tab Button */}
            <button
                onClick={handleAddTab}
                className="flex items-center justify-center min-w-[28px] h-[28px] rounded-full hover:bg-white/10 transition-all ml-1 mb-[2px]"
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
