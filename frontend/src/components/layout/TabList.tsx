import { useTabStore } from '../../stores/tabStore';
import { useTranslation } from 'react-i18next';
import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * TabList - Renders a list of tabs that compress like browser tabs
 */
export function TabList() {
    const { t } = useTranslation();
    const { tabs, activeTabId, setActiveTab, closeTab, addTab } = useTabStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const [tabWidth, setTabWidth] = useState(180);

    // Calculate optimal tab width based on container size
    const calculateTabWidth = useCallback(() => {
        if (!containerRef.current) return;

        // Get the full container width (flex-1 fills available space)
        const containerWidth = containerRef.current.clientWidth;
        const addButtonWidth = 36; // Width of add tab button + margin
        const tabMargins = tabs.length * 2; // 1px margin on each side
        const availableWidth = containerWidth - addButtonWidth - tabMargins;
        const tabCount = tabs.length;

        if (tabCount === 0) return;

        // Calculate ideal width per tab to fill the space
        const idealWidth = Math.floor(availableWidth / tabCount);

        // Clamp between min (just close button) and max (full tab)
        const minWidth = 32;  // Just close button
        const maxWidth = 180; // Full tab with title

        const newWidth = Math.max(minWidth, Math.min(maxWidth, idealWidth));
        setTabWidth(newWidth);
    }, [tabs.length]);

    // Recalculate on resize or tab count change
    useEffect(() => {
        // Use requestAnimationFrame to ensure layout is complete
        const rafId = requestAnimationFrame(() => {
            calculateTabWidth();
        });

        const resizeObserver = new ResizeObserver(() => {
            calculateTabWidth();
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            cancelAnimationFrame(rafId);
            resizeObserver.disconnect();
        };
    }, [calculateTabWidth]);

    const handleAddTab = () => {
        addTab('home', {}, t('common.home') || 'Home');
    };

    // Determine if tabs are compressed enough to hide title
    const isCompressed = tabWidth < 80;
    const isVeryCompressed = tabWidth < 50;

    return (
        <div
            ref={containerRef}
            className="flex items-center h-full no-drag flex-1 min-w-0"
        >
            <div ref={tabsContainerRef} className="flex items-center h-full flex-shrink-0">
                {tabs.map((tab, index) => (
                    <div
                        key={tab.id}
                        style={{ width: tabWidth, minWidth: tabWidth, maxWidth: tabWidth }}
                        onMouseDown={(e) => {
                            if (e.button === 0) setActiveTab(tab.id);
                            if (e.button === 1) closeTab(tab.id);
                        }}
                        onAuxClick={(e) => {
                            if (e.button === 1) e.preventDefault();
                        }}
                        className={`relative group h-[34px] flex items-center justify-center cursor-default select-none transition-all duration-150 mx-[1px] flex-shrink-0 ${activeTabId === tab.id ? 'z-20' : 'z-10'
                            }`}
                        title={tab.title}
                    >
                        {/* Tab Background */}
                        <div
                            className={`absolute inset-0 transition-all duration-200 rounded-[6px] ${activeTabId === tab.id
                                ? 'bg-white/10 opacity-100 shadow-sm'
                                : 'bg-transparent group-hover:bg-white/5'
                                }`}
                        />

                        {/* Content */}
                        <div className="relative flex items-center justify-between w-full gap-1 z-10 overflow-hidden px-2">
                            {/* Title - hidden when very compressed */}
                            {!isVeryCompressed && (
                                <span
                                    className={`text-[11px] font-medium truncate whitespace-nowrap transition-all flex-1 min-w-0 ${activeTabId === tab.id ? 'opacity-100' : 'opacity-60 group-hover:opacity-90'
                                        } ${isCompressed ? 'text-[10px]' : ''}`}
                                >
                                    {tab.title}
                                </span>
                            )}

                            {/* Close button - always visible (when more than 1 tab) */}
                            {tabs.length > 1 && (
                                <button
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeTab(tab.id);
                                    }}
                                    className={`flex items-center justify-center flex-shrink-0 rounded-md hover:bg-white/20 transition-all ${activeTabId === tab.id ? 'opacity-70' : 'opacity-30 group-hover:opacity-60'
                                        } hover:!opacity-100 ${isVeryCompressed ? 'w-6 h-6' : 'w-5 h-5'}`}
                                >
                                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                                        <path d="M1 1L9 9M9 1L1 9" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Separator */}
                        {activeTabId !== tab.id && index < tabs.length - 1 && activeTabId !== tabs[index + 1].id && (
                            <div className="absolute -right-[1.5px] top-[10px] bottom-[10px] w-[1px] bg-white/10 transition-opacity" />
                        )}
                    </div>
                ))}
            </div>

            {/* Add Tab Button */}
            <button
                onMouseDown={handleAddTab}
                className="flex items-center justify-center min-w-[26px] h-[26px] rounded-md hover:bg-white/10 transition-all ml-1 text-white/50 hover:text-white flex-shrink-0"
                title={t('common.addTab') || "New Tab"}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>

            {/* Draggable area to fill remaining space */}
            <div className="flex-1 h-full drag min-w-[10px]" />
        </div>
    );
}
