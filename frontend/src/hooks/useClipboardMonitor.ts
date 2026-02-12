/**
 * useClipboardMonitor - Hook for monitoring clipboard for URLs
 * Extracted from MainLayout for better separation of concerns
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { EventsOn } from '../../wailsjs/runtime';
import { useSettingsStore } from '../stores/settingsStore';
import { useToast } from '../components/common/Toast';
import { AppAPI } from '../services/api/appAPI';
import alertSound from '../assets/sounds/alert.mp3';

/**
 * Hook to monitor clipboard for URLs and auto-start downloads
 */
export function useClipboardMonitor() {
    const { t } = useTranslation();
    const { showToast } = useToast();

    useEffect(() => {
        // Listen for clipboard URL detection from backend
        const unsubscribe = EventsOn('clipboard_url_detected', async (text: string) => {
            if (!text) return;

            // Check if clipboard monitoring is enabled
            const currentSettings = useSettingsStore.getState();
            if (!currentSettings.clipboardAutoMonitor) {
                return;
            }

            // Hitomi Series Detection: Don't auto-start, just show toast
            const isHitomi = text.includes('hitomi.la');
            const isHitomiSeries = isHitomi && (
                text.includes('/artist/') ||
                text.includes('/series/') ||
                text.includes('/tag/') ||
                text.includes('/character/') ||
                text.includes('/group/') ||
                text.includes('index-') ||
                text.includes('search.html') ||
                text.includes('?q=')
            );

            // Manga18.club Series Detection: Don't auto-start series, just show toast
            const isManga18 = text.includes('manga18.club');
            // A chapter URL has a segment after /manhwa/{series}/ like /chap-, /chapter-, or just a number
            const isManga18Chapter = isManga18 && /manga18\.club\/manhwa\/[^/]+\/(chap-|chapter-|\d+)/.test(text);
            const isManga18Series = isManga18 && text.includes('/manhwa/') && !isManga18Chapter;

            // E-Hentai Detection
            const isEHentai = text.includes('e-hentai.org') || text.includes('exhentai.org') || text.includes('ehentai.org');
            const isEHentaiGallery = isEHentai && (text.includes('/g/') || text.includes('/s/'));

            // For series URLs, don't auto-start - user must go to download page
            if (isHitomiSeries || isManga18Series) {
                showToast(t('download.seriesDetectedClipboard') || 'Series detected. Go to Downloads page to select chapters', 'info');
                return;
            }

            // For E-Hentai galleries, auto-start directly to avoid slow fetchMangaInfo
            if (isEHentaiGallery) {
                try {
                    await AppAPI.startDownload(text, "", "");
                    const audio = new Audio(alertSound);
                    audio.play().catch(e => console.error('Failed to play alert sound:', e));
                    showToast(t('download.startedFromClipboard') || 'Download started from clipboard', 'success');
                    return;
                } catch (err) {
                    console.error('Failed to auto-start E-Hentai download:', err);
                }
            }

            // For single chapters, auto-start download
            try {
                // Check if it's a series or single chapter
                const info = await AppAPI.fetchMangaInfo(text);

                // Check if info is null (fetchMangaInfo can return null on error)
                if (!info) {
                    // If fetchMangaInfo failed, try to start download anyway
                    // This handles cases where the URL might still be valid
                    await AppAPI.startDownload(text, "", "");

                    // Play alert sound
                    const audio = new Audio(alertSound);
                    audio.play().catch(e => console.error('Failed to play alert sound:', e));

                    showToast(t('download.startedFromClipboard') || 'Download started from clipboard', 'success');
                    return;
                }

                if (info.Type === 'series') {
                    // It's a series - don't auto-start, just show toast
                    showToast(t('download.seriesDetectedClipboard') || 'Series detected. Go to Downloads page to select chapters', 'info');
                } else {
                    // It's a single chapter - start download automatically
                    await AppAPI.startDownload(text, "", "");

                    // Play alert sound
                    const audio = new Audio(alertSound);
                    audio.play().catch(e => console.error('Failed to play alert sound:', e));

                    showToast(t('download.startedFromClipboard') || 'Download started from clipboard', 'success');
                }
            } catch (err: any) {
                // If FetchMangaInfo fails, try to start download anyway (might be a valid URL)
                try {
                    await AppAPI.startDownload(text, "", "");

                    // Play alert sound
                    const audio = new Audio(alertSound);
                    audio.play().catch(e => console.error('Failed to play alert sound:', e));

                    showToast(t('download.startedFromClipboard') || 'Download started from clipboard', 'success');
                } catch (downloadErr: any) {
                    // If both fail, show error with more details
                    let errorMessage = t('download.failedClipboard') || 'Failed to process clipboard URL';
                    if (downloadErr instanceof Error) {
                        errorMessage = downloadErr.message;
                    } else if (downloadErr?.toString) {
                        errorMessage = downloadErr.toString();
                    }
                    showToast(errorMessage, 'error');
                }
            }
        });

        return () => unsubscribe();
    }, [t, showToast]);
}
