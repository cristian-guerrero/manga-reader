/**
 * DownloadPage - Main download page refactored with hooks
 * Separated concerns: hooks handle logic, components handle UI
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@stores';
import { useToast, Button, HelpDialog, Tooltip } from '@shared/components';
import { FolderAPI } from '@services/api/folderAPI';
import { useDownloadJobs, useDownloadGrouping, useDownloadActions } from './hooks';
import { DownloadForm } from './components/DownloadForm';
import { DownloadJobList } from './components/DownloadJobList';
import { DownloadSettingsDialog } from './components/DownloadSettingsDialog';
import { SeriesSelectionModal } from './components/SeriesSelectionModal';
import type { DownloadJob } from './types';

export function DownloadPage() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const downloadPath = useSettingsStore((s) => s.downloadPath);
    const autoResumeDownloads = useSettingsStore((s) => s.autoResumeDownloads);
    const updateSettings = useSettingsStore((s) => s.updateSettings);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Use hooks for separated concerns
    const { history, loadHistory } = useDownloadJobs();
    const { groupedHistory, expandedSeries, toggleSeries, expandSeries } = useDownloadGrouping(history);
    const {
        isLoading,
        seriesInfo,
        selectedChapters,
        setSelectedChapters,
        isSeriesModalOpen,
        setIsSeriesModalOpen,
        handleStartDownload,
        handleDownloadSeries,
        handleClearHistory,
        handleRemoveJob,
        handleResumeDownload,
        handleRemoveSeries,
        handlePlayDownload,
        handlePlaySeries,
    } = useDownloadActions(loadHistory);

    // Handle series download completion - expand the series
    const handleSeriesDownloadComplete = async () => {
        const seriesName = await handleDownloadSeries();
        if (seriesName) {
            expandSeries(seriesName);
        }
    };

    const handleSelectPath = async () => {
        try {
            const path = await FolderAPI.selectFolder();
            if (path) {
                updateSettings({ downloadPath: path });
            }
        } catch (err) {
            console.error('Failed to select path:', err);
        }
    };

    return (
        <div
            className="h-full overflow-auto p-6 animate-fade-in"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            <header className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                        {t('download.title')}
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        {t('download.subtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Tooltip content={t('download.settings.title')} placement="left">
                        <Button
                            onClick={() => setIsSettingsOpen(true)}
                            variant="ghost"
                            className="p-2 rounded-full hover:bg-white/10"
                            aria-label={t('download.settings.title')}
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                        </Button>
                    </Tooltip>
                    <Tooltip content={t('download.help.title')} placement="left">
                        <Button
                            onClick={() => setIsHelpOpen(true)}
                            variant="ghost"
                            className="p-2 rounded-full hover:bg-white/10"
                            aria-label={t('download.help.title')}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                        </Button>
                    </Tooltip>
                </div>
            </header>

            {/* Input Section */}
            <DownloadForm
                onStartDownload={handleStartDownload}
                isLoading={isLoading}
                onSelectPath={handleSelectPath}
                downloadPath={downloadPath || t('download.defaultPath')}
            />

            {/* History Section */}
            <section className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {t('download.downloadHistory')}
                    </h2>
                    {history.length > 0 && (
                        <Button
                            onClick={handleClearHistory}
                            variant="ghost"
                            size="sm"
                            className="text-sm font-medium hover:text-red-400 hover:bg-transparent px-0"
                        >
                            {t('download.clearHistory')}
                        </Button>
                    )}
                </div>

                <DownloadJobList
                    groupedHistory={groupedHistory}
                    expandedSeries={expandedSeries}
                    toggleSeries={toggleSeries}
                    autoResumeDownloads={autoResumeDownloads || false}
                    onRemoveJob={handleRemoveJob}
                    onResumeDownload={handleResumeDownload}
                    onRemoveSeries={handleRemoveSeries}
                    onPlayDownload={handlePlayDownload}
                    onPlaySeries={handlePlaySeries}
                />
            </section>

            {/* Download Settings Dialog */}
            <DownloadSettingsDialog
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            {/* Help Dialog */}
            <HelpDialog
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
                title={t('download.help.title')}
            >
                <div>
                    <h4 className="font-semibold text-sm uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('download.help.supportedSites')}
                    </h4>
                    <div className="p-3 rounded bg-white/5 border border-white/10 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {t('download.help.supportedList')}
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold text-sm uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('download.help.instructions')}
                    </h4>
                    <ul className="list-disc pl-5 space-y-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        <li>{t('download.help.step1')}</li>
                        <li>{t('download.help.step2')}</li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-semibold text-sm uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('download.help.clipboard')}
                    </h4>
                    <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {t('download.help.clipboardDesc')}
                    </p>
                </div>
            </HelpDialog>

            {/* Series Selection Modal */}
            {isSeriesModalOpen && seriesInfo && (
                <SeriesSelectionModal
                    seriesInfo={seriesInfo}
                    selectedChapters={selectedChapters}
                    onSelectionChange={setSelectedChapters}
                    onDownload={handleSeriesDownloadComplete}
                    onClose={() => setIsSeriesModalOpen(false)}
                />
            )}
        </div>
    );
}

export default DownloadPage;
