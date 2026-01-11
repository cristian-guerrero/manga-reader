/**
 * HistoryPage - Main history page refactored with hooks
 * Separated concerns: hooks handle logic, components handle UI
 */

import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@stores';
import { ConfirmDialog, GridContainer } from '@shared/components';
import { useHistoryData, useHistoryView, useHistoryActions } from './hooks';
import { VirtualizedList } from './components/VirtualizedList';
import { HistoryListItem } from './components/HistoryListItem';
import { HistoryGridItem } from './components/HistoryGridItem';
import { HistoryHeader } from './components/HistoryHeader';
import { HistoryEmptyState } from './components/HistoryEmptyState';
import { HistoryLoadingState } from './components/HistoryLoadingState';
import { TrashIcon } from './components/HistoryIcons';
import type { HistoryEntry } from './types';

export function HistoryPage() {
    const { t } = useTranslation();
    const enableHistory = useSettingsStore((state: any) => state.enableHistory);
    const [isClearHistoryOpen, setIsClearHistoryOpen] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Use hooks for separated concerns
    const { history, isLoading, removeEntry, clearAll } = useHistoryData();
    const { viewMode, setViewMode } = useHistoryView();
    const {
        handleContinue,
        handleAuxClick,
        handleRemove,
        handleClearAll: handleClearAllAction,
    } = useHistoryActions(removeEntry, clearAll);

    const handleClearAllClick = () => {
        setIsClearHistoryOpen(true);
    };

    const confirmClearAll = async () => {
        await handleClearAllAction();
        setIsClearHistoryOpen(false);
    };

    // Render functions
    const renderListItem = useCallback((entry: HistoryEntry, index: number) => {
        return (
            <HistoryListItem
                key={entry.id}
                entry={entry}
                onContinue={handleContinue}
                onAuxClick={handleAuxClick}
                onRemove={handleRemove}
            />
        );
    }, [handleContinue, handleAuxClick, handleRemove]);

    const renderGridItem = useCallback((entry: HistoryEntry, index: number) => {
        return (
            <HistoryGridItem
                key={entry.id}
                entry={entry}
                onContinue={handleContinue}
                onAuxClick={handleAuxClick}
                onRemove={handleRemove}
            />
        );
    }, [handleContinue, handleAuxClick, handleRemove]);

    return (
        <div
            className="h-full overflow-hidden p-6 flex flex-col"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            {/* Header */}
            <HistoryHeader
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onClearClick={handleClearAllClick}
                hasHistory={history.length > 0}
                enableHistory={enableHistory}
            />

            {/* History content */}
            <div className="flex-1 overflow-hidden">
                {!enableHistory ? (
                    <HistoryEmptyState enableHistory={false} />
                ) : isLoading ? (
                    <HistoryLoadingState />
                ) : history.length === 0 ? (
                    <HistoryEmptyState enableHistory={true} />
                ) : viewMode === 'list' ? (
                    <div
                        ref={scrollContainerRef}
                        className="h-full overflow-auto space-y-3"
                        style={{ scrollbarGutter: 'stable' }}
                    >
                        <VirtualizedList
                            items={history}
                            itemHeight={120}
                            containerRef={scrollContainerRef}
                            renderItem={renderListItem}
                            overscan={3}
                        />
                    </div>
                ) : (
                    <div
                        ref={scrollContainerRef}
                        className="h-full overflow-auto"
                        style={{ scrollbarGutter: 'stable' }}
                    >
                        <GridContainer>
                            {history.map((entry, index) => renderGridItem(entry, index))}
                        </GridContainer>
                    </div>
                )}
            </div>

            {/* Clear History Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isClearHistoryOpen}
                onClose={() => setIsClearHistoryOpen(false)}
                onConfirm={confirmClearAll}
                title={t('history.clearHistory')}
                message={t('history.confirmClear')}
                isDestructive={true}
                confirmText={t('common.confirm') || 'Confirm'}
                cancelText={t('common.cancel') || 'Cancel'}
                icon={<TrashIcon />}
            />
        </div>
    );
}

export default HistoryPage;
