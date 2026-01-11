/**
 * HistoryHeader - Header component with view mode toggle and clear button
 */

import { useTranslation } from 'react-i18next';
import { Tooltip } from '@shared/components';
import { GridIcon, ListIcon, TrashIcon } from './HistoryIcons';
import type { ViewMode } from '../types';

interface HistoryHeaderProps {
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    onClearClick: () => void;
    hasHistory: boolean;
    enableHistory: boolean;
}

export function HistoryHeader({
    viewMode,
    onViewModeChange,
    onClearClick,
    hasHistory,
    enableHistory,
}: HistoryHeaderProps) {
    const { t } = useTranslation();

    return (
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <h1
                className="text-2xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
            >
                {t('history.title')}
            </h1>
            <div className="flex items-center gap-2">
                {enableHistory && hasHistory && (
                    <>
                        {/* View mode toggle */}
                        <div className="flex items-center bg-surface-tertiary rounded-lg p-1 border border-white/5">
                            <Tooltip content={t('history.listView') || 'List View'} placement="bottom">
                                <button
                                    onClick={() => onViewModeChange('list')}
                                    className={`p-1.5 rounded transition-colors ${viewMode === 'list'
                                        ? 'bg-accent text-white'
                                        : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                                        }`}
                                >
                                    <ListIcon />
                                </button>
                            </Tooltip>
                            <Tooltip content={t('history.gridView') || 'Grid View'} placement="bottom">
                                <button
                                    onClick={() => onViewModeChange('grid')}
                                    className={`p-1.5 rounded transition-colors ${viewMode === 'grid'
                                        ? 'bg-accent text-white'
                                        : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                                        }`}
                                >
                                    <GridIcon />
                                </button>
                            </Tooltip>
                        </div>
                        <Tooltip content={t('history.clearHistory')} placement="bottom">
                            <button
                                onClick={onClearClick}
                                className="btn-ghost text-sm flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                                style={{ color: '#ef4444' }}
                            >
                                <TrashIcon />
                                {t('history.clearHistory')}
                            </button>
                        </Tooltip>
                    </>
                )}
            </div>
        </div>
    );
}
