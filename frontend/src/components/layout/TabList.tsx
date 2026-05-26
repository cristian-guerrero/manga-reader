import { useTabStore } from "../../stores/tabStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { getThemeById, darkTheme } from "../../themes";
import { useTranslation } from "react-i18next";
import { Tooltip } from "../ui/Tooltip";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { ContextMenu } from "../ui/ContextMenu";
import type { ContextMenuItem } from "@types";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";

interface SortableTabProps {
  tab: any;
  index: number;
  activeTabId: string;
  tabWidth: number;
  isCompressed: boolean;
  isVeryCompressed: boolean;
  setActiveTab: (id: string) => void;
  closeTab: (id: string) => void;
  tabsCount: number;
  isDark: boolean;
  onContextMenu: (e: React.MouseEvent, tabId: string) => void;
}

function SortableTab({
  tab,
  index,
  activeTabId,
  tabWidth,
  isCompressed,
  isVeryCompressed,
  setActiveTab,
  closeTab,
  tabsCount,
  isDark,
  onContextMenu,
}: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    width: tabWidth,
    minWidth: tabWidth,
    maxWidth: tabWidth,
    zIndex: isDragging ? 50 : activeTabId === tab.id ? 20 : 10,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseDown={(e) => {
        // Stop propagation to prevent Wails window drag
        e.stopPropagation();
        if (e.button === 0) setActiveTab(tab.id);
        if (e.button === 1) closeTab(tab.id);
        listeners?.onMouseDown?.(e);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        listeners?.onPointerDown?.(e);
      }}
      onAuxClick={(e) => {
        e.stopPropagation();
        if (e.button === 1) e.preventDefault();
      }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, tab.id); }}
      className={`relative group h-[34px] flex items-center justify-center cursor-default select-none transition-shadow duration-150 mx-[1px] flex-shrink-0 no-drag`}
    >
      {/* Tab Background */}
      <div
        className={`absolute inset-0 transition-all duration-200 rounded-[6px] ${activeTabId === tab.id
            ? isDark
              ? "bg-white/10 opacity-100 shadow-sm"
              : "bg-black/10 opacity-100 shadow-sm"
            : isDark
              ? "bg-transparent group-hover:bg-white/5"
              : "bg-transparent group-hover:bg-black/5"
          }`}
      />

      {/* Content */}
      <Tooltip content={tab.title} className="w-full min-w-0 overflow-hidden">
        <div className="relative flex items-center justify-between w-full gap-1 z-10 overflow-hidden px-2">
          {/* Title - hidden when very compressed */}
          {!isVeryCompressed && (
            <span
              className={`text-[11px] font-medium truncate whitespace-nowrap transition-all flex-1 min-w-0 ${activeTabId === tab.id
                  ? "opacity-100"
                  : "opacity-60 group-hover:opacity-90"
                } ${isCompressed ? "text-[10px]" : ""}`}
            >
              {tab.title}
            </span>
          )}

          {/* Close button - always visible (when more than 1 tab) */}
          {tabsCount > 1 && (
            <button
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className={`flex items-center justify-center flex-shrink-0 rounded-md hover:bg-white/20 transition-all ${activeTabId === tab.id
                  ? "opacity-70"
                  : "opacity-30 group-hover:opacity-60"
                } hover:!opacity-100 ${isVeryCompressed ? "w-6 h-6" : "w-5 h-5"}`}
            >
              <svg
                width="8"
                height="8"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <path d="M1 1L9 9M9 1L1 9" />
              </svg>
            </button>
          )}
        </div>
      </Tooltip>

      {/* Separator */}
      {/* {activeTabId !== tab.id && !isDragging && (
                <div className="absolute -right-[1.5px] top-[10px] bottom-[10px] w-[1px] bg-white/10 transition-opacity" />
            )} */}
    </div>
  );
}

/**
 * TabList - Renders a list of tabs that compress like browser tabs
 */
export function TabList() {
  const { t } = useTranslation();
  const { tabs, activeTabId, setActiveTab, closeTab, addTab, reorderTabs } =
    useTabStore();
  const { theme: themeId } = useSettingsStore();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tabId?: string;
  } | null>(null);

  // Determine current theme properties
  const currentTheme = useMemo(
    () => getThemeById(themeId) || darkTheme,
    [themeId],
  );
  const isDark = currentTheme.isDark;

  const containerRef = useRef<HTMLDivElement>(null);
  const [tabWidth, setTabWidth] = useState(180);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5, // Responsive but allows for stable clicks
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Calculate optimal tab width based on container size
  const calculateTabWidth = useCallback(() => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const addButtonWidth = 36;
    const tabMargins = tabs.length * 2;
    const availableWidth = containerWidth - addButtonWidth - tabMargins;
    const tabCount = tabs.length;

    if (tabCount === 0) return;

    const idealWidth = Math.floor(availableWidth / tabCount);
    const minWidth = 32;
    const maxWidth = 180;

    const newWidth = Math.max(minWidth, Math.min(maxWidth, idealWidth));
    setTabWidth(newWidth);
  }, [tabs.length]);

  useEffect(() => {
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
    addTab("home", {}, t("common.home") || "Home");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((t) => t.id === active.id);
      const newIndex = tabs.findIndex((t) => t.id === over.id);
      reorderTabs(oldIndex, newIndex);
    }
  };

  const handleCloseApp = useCallback(() => {
    try {
      (window as any).runtime?.Quit();
    } catch {
      console.log('Quit app');
    }
  }, []);

  const handleTabContextMenu = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, tabId });
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

  const isCompressed = tabWidth < 80;
  const isVeryCompressed = tabWidth < 50;

  const tabIds = useMemo(() => tabs.map((t) => t.id), [tabs]);

  return (
    <div
      ref={containerRef}
      className="flex items-center h-full no-drag flex-1 min-w-0"
      onContextMenu={handleContainerContextMenu}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToHorizontalAxis]}
      >
        <div className="flex items-center h-full flex-shrink-0">
          <SortableContext
            items={tabIds}
            strategy={horizontalListSortingStrategy}
          >
            {tabs.map((tab, index) => (
              <SortableTab
                key={tab.id}
                tab={tab}
                index={index}
                activeTabId={activeTabId}
                tabWidth={tabWidth}
                isCompressed={isCompressed}
                isVeryCompressed={isVeryCompressed}
                setActiveTab={setActiveTab}
                closeTab={closeTab}
                tabsCount={tabs.length}
                isDark={isDark}
                onContextMenu={handleTabContextMenu}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>

      {/* Add Tab Button */}
      <Tooltip content={t("common.addTab") || "New Tab"} placement="bottom">
        <button
          onMouseDown={handleAddTab}
          className={`flex items-center justify-center min-w-[26px] h-[26px] rounded-md transition-all ml-1 flex-shrink-0 ${isDark
              ? "hover:bg-white/10 text-white/50 hover:text-white"
              : "hover:bg-black/5 text-[var(--color-accent)]"
            }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </Tooltip>

      {/* Draggable area to fill remaining space */}
      <div className="flex-1 h-full drag min-w-[10px]" />

      {contextMenu && (
        <ContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={handleCloseContextMenu}
          items={buildContextMenuItems(contextMenu.tabId, t, closeTab, handleCloseApp)}
        />
      )}
    </div>
  );
}

function buildContextMenuItems(
  tabId: string | undefined,
  t: (key: string) => string,
  closeTab: (id: string) => void,
  handleCloseApp: () => void,
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];

  if (tabId) {
    items.push({
      id: 'close-tab',
      label: t('common.closeTab'),
      onClick: () => closeTab(tabId),
    });
    items.push({ id: 'separator', type: 'separator', label: '' });
  }

  items.push({ id: 'close-app', label: t('common.close'), onClick: handleCloseApp });

  return items;
}
