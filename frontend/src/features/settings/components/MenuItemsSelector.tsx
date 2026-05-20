/**
 * MenuItemsSelector - Component for toggling menu items visibility
 */

import { useTranslation } from 'react-i18next';
import { Toggle } from '@shared/components';

interface MenuItemsSelectorProps {
    enabledMenuItems: Record<string, boolean> | undefined;
    onToggleMenuItem: (item: string) => void;
}

export function MenuItemsSelector({ enabledMenuItems, onToggleMenuItem }: MenuItemsSelectorProps) {
    const { t } = useTranslation();

    return (
        <div className="grid grid-cols-2 gap-3 mt-2">
            {['home', 'explorer', 'history', 'oneShot', 'series', 'library-manager', 'download', 'colorizer'].map((item) => {
                const isSettings = item === 'settings';
                const isEnabled = enabledMenuItems?.[item] !== false;

                return (
                    <div
                        key={item}
                        className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${isSettings ? 'opacity-80 cursor-default' : 'hover:bg-white/5 cursor-pointer'}`}
                        onClick={() => !isSettings && onToggleMenuItem(item)}
                    >
                        <Toggle
                            checked={isEnabled}
                            onChange={() => onToggleMenuItem(item)}
                            disabled={isSettings}
                        />
                        <span className="text-sm font-medium select-none" style={{ color: 'var(--color-text-secondary)' }}>
                            {t(`navigation.${item}`)}
                            {isSettings && <span className="ml-1 opacity-50 text-[10px]">({t('common.alwaysOn') || 'Always On'})</span>}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
