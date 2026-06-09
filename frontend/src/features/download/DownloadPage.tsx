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
            style={{ background: 'var(--gradient-surface-primary)' }}
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
                <div className="space-y-4">
                    {/* Getting Started */}
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--color-accent)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            {t('download.help.gettingStarted')}
                        </h4>
                        <p className="text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>
                            {t('download.help.gettingStartedDesc')}
                        </p>
                        <ol className="list-decimal pl-5 space-y-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            <li>{t('download.help.step1')}</li>
                            <li>{t('download.help.step2')}</li>
                            <li>{t('download.help.step3')}</li>
                        </ol>
                    </div>

                    {/* Clipboard Monitor */}
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--color-accent)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            </svg>
                            {t('download.help.clipboard')}
                        </h4>
                        <p className="text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>
                            {t('download.help.clipboardDesc')}
                        </p>
                        <div className="space-y-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            <p className="flex items-start gap-2">
                                <span className="mt-1">•</span>
                                {t('download.help.clipboardSingle')}
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="mt-1">•</span>
                                {t('download.help.clipboardSeries')}
                            </p>
                        </div>
                    </div>

                    {/* Supported Sites */}
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--color-accent)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
                            {t('download.help.supportedSites')}
                        </h4>
                        <p className="text-sm mb-3" style={{ color: 'var(--color-text-primary)' }}>
                            {t('download.help.supportedSitesDesc')}
                        </p>
                        <div className="space-y-2">
                            <div>
                                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                                    {t('download.help.sites Hentai')}
                                </p>
                                <p className="text-xs p-2 rounded" style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-primary)' }}>
                                    nHentai.net · nHentai.xxx · nHentai.com · nHentai.website · nHentai.to · Hentaiera.com · HentaiRead.io · Hentai2Read.com · Hentaivox.com · Hentaifox.com · IMHentai.xxx · IMHentai.to · Hentaifc.com · ComicPorn.xxx · E-Hentai.org · Hentaiforce.net · lHentai.com · 3Hentai.net
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                                    {t('download.help.sitesGeneral')}
                                </p>
                                <p className="text-xs p-2 rounded" style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-primary)' }}>
                                    Hitomi.la · MangaDex.org · MangaToon.mobi · Manga18.club · Comics18.org · LectorHentai · MairimashitaIruma
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                                    {t('download.help.sitesKorean')}
                                </p>
                                <p className="text-xs p-2 rounded" style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-primary)' }}>
                                    ManhwaWeb.com · ZonaTMO.com · Submanhwa.com
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Settings Info */}
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--color-accent)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                            {t('download.help.settings')}
                        </h4>
                        <p className="text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>
                            {t('download.help.settingsDesc')}
                        </p>
                        <div className="space-y-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            <p className="flex items-start gap-2">
                                <span className="mt-1">•</span>
                                {t('download.help.parallelChapters')}
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="mt-1">•</span>
                                {t('download.help.parallelImages')}
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="mt-1">•</span>
                                {t('download.help.autoResume')}
                            </p>
                        </div>
                    </div>

                    {/* Tips */}
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--color-accent)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                <path d="M2 17l10 5 10-5"></path>
                                <path d="M2 12l10 5 10-5"></path>
                            </svg>
                            {t('download.help.tips')}
                        </h4>
                        <div className="space-y-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            <p className="flex items-start gap-2">
                                <span className="mt-1">•</span>
                                {t('download.help.tipSeries')}
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="mt-1">•</span>
                                {t('download.help.tipHistory')}
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="mt-1">•</span>
                                {t('download.help.tipFolder')}
                            </p>
                        </div>
                    </div>
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
