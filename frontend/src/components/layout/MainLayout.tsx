/**
 * MainLayout - Main application layout with title bar, sidebar, and content area
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../../stores/navigationStore';


import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { OnFileDrop, OnFileDropOff, EventsOn } from '../../../wailsjs/runtime';
import { useToast } from '../common/Toast';
import { useSettingsStore } from '../../stores/settingsStore';
import * as AppBackend from '../../../wailsjs/go/main/App';

interface MainLayoutProps {
    children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    const { t } = useTranslation();
    const { isPanicMode, isProcessing, setIsProcessing, currentPage } = useNavigationStore();
    const { showToast } = useToast();
    const { processDroppedFolders } = useSettingsStore();


    // Handle drag and drop
    useEffect(() => {
        // Register drop listener
        OnFileDrop(async (x, y, paths) => {
            if (paths && paths.length > 0) {
                // Get current settings from store to avoid closure capture issues
                const currentSettings = useSettingsStore.getState();
                const processDropped = currentSettings.processDroppedFolders;

                try {
                    setIsProcessing(true);
                    // Resolve all paths to folders (e.g. if someone drags a .jpg)
                    const resolvedPaths = (await Promise.all(
                        paths.map(async (p) => {
                            // @ts-ignore
                            return await window.go?.main?.App?.ResolveFolder(p);
                        })
                    )) as string[];

                    // Deduplicate folders (to avoid processing the same folder multiple times if several files are dragged)
                    const uniqueFolders = Array.from(new Set(resolvedPaths));

                    // Determine if we need to navigate or just add
                    if (uniqueFolders.length === 1) {
                        const path = uniqueFolders[0];
                        let isSeries = false;
                        let finalPath = path;

                        if (processDropped) {
                            try {
                                // @ts-ignore
                                const result = await window.go?.main?.App?.AddFolder(path);
                                if (result) {
                                    finalPath = result.path;
                                    isSeries = result.isSeries;
                                }
                            } catch (error) {
                                console.error('Failed to add folder:', error);
                                showToast(t('oneShot.addFailed'), 'error');
                            }
                        } else {
                            // @ts-ignore
                            isSeries = await window.go?.main?.App?.IsSeries(path);
                        }

                        // @ts-ignore
                        const navigate = useNavigationStore.getState().navigate;

                        if (isSeries && processDropped) {
                            // If it's a series, set activeMenuPage to 'series'
                            navigate('series-details', { series: finalPath }, 'series');
                        } else {
                            // If it's a oneshot, set activeMenuPage to 'oneShot'
                            navigate('viewer', {
                                folder: finalPath,
                                noHistory: !processDropped ? 'true' : 'false'
                            }, 'oneShot');
                        }
                        showToast(`Opening: ${finalPath.split(/[\\/]/).pop()}`, 'success');
                    } else {
                        let addedCount = 0;
                        for (const path of uniqueFolders) {
                            try {
                                if (processDropped) {
                                    // @ts-ignore
                                    await window.go?.main?.App?.AddFolder(path);
                                    addedCount++;
                                }
                            } catch (error) {
                                console.error('Failed to add folder:', error);
                            }
                        }
                        if (addedCount > 0) {
                            showToast(`Added ${addedCount} folders to library`, 'success');
                        } else if (!processDropped) {
                            showToast("Drag & Drop processing is disabled in settings", "info");
                        }
                    }
                } catch (e) {
                    console.error("Failed to process dropped items", e);
                    showToast("Failed to process dropped items", "error");
                } finally {
                    setIsProcessing(false);
                }
            }
        }, false);



        return () => {
            // Cleanup
            OnFileDropOff();
        };
    }, []);

    // Global clipboard monitoring - works from any page
    useEffect(() => {
        // Listen for clipboard URL detection from backend
        const unoff = EventsOn('clipboard_url_detected', async (text: string) => {
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
            const isManga18Series = isManga18 && text.includes('/manhwa/') && !text.includes('/chap-');

            // For series URLs, don't auto-start - user must go to download page
            if (isHitomiSeries || isManga18Series) {
                showToast(t('download.seriesDetectedClipboard') || 'Series detected. Go to Downloads page to select chapters', 'info');
                return;
            }

            // For single chapters, auto-start download
            try {
                // Check if it's a series or single chapter
                const info = await (AppBackend as any).FetchMangaInfo(text);

                if (info.Type === 'series') {
                    // It's a series - don't auto-start, just show toast
                    showToast(t('download.seriesDetectedClipboard') || 'Series detected. Go to Downloads page to select chapters', 'info');
                } else {
                    // It's a single chapter - start download automatically
                    await AppBackend.StartDownload(text, "", "");
                    showToast(t('download.startedFromClipboard') || 'Download started from clipboard', 'success');
                }
            } catch (err: any) {
                // If FetchMangaInfo fails, try to start download anyway (might be a valid URL)
                try {
                    await AppBackend.StartDownload(text, "", "");
                    showToast(t('download.startedFromClipboard') || 'Download started from clipboard', 'success');
                } catch (downloadErr: any) {
                    // If both fail, show error
                    showToast(err.toString() || 'Failed to process clipboard URL', 'error');
                }
            }
        });

        return () => unoff();
    }, [t, showToast]);

    return (
        <div
            className="flex flex-col h-screen w-screen overflow-hidden theme-transition"
            style={{ backgroundColor: 'var(--color-surface-secondary)' }}
        >
            {/* Title Bar */}
            <TitleBar />

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar with shadow overlay */}
                <div className="relative z-10">
                    <Sidebar />
                    {/* Curved shadow overlay that projects onto content */}
                    <div
                        className="absolute top-0 right-0 h-full pointer-events-none"
                        style={{
                            width: '50px',
                            transform: 'translateX(100%)',
                            background: 'linear-gradient(to right, rgba(0,0,0,0.06), rgba(0,0,0,0.02) 50%, transparent)',
                            borderTopLeftRadius: '40px',
                            maskImage: 'linear-gradient(to bottom, transparent 0px, black 40px, black 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, black 40px, black 100%)',
                        }}
                    />
                </div>

                {/* Content Area - no rounded corner since sidebar overlays it */}
                <main
                    className="flex-1 overflow-hidden relative theme-transition mr-3 mb-3 shadow-lg border"
                    style={{
                        backgroundColor: 'var(--color-surface-primary)',
                        borderColor: 'var(--color-border)',
                        borderTopLeftRadius: '40px',
                    }}
                >
                    {/* Panic Mode Overlay */}
                    {isPanicMode && (
                        <div
                            className="absolute inset-0 z-50 rounded-tl-[40px] animate-fade-in"
                            style={{ backgroundColor: 'var(--color-surface-primary)' }}
                        />
                    )}

                    {/* Page Content with Transitions */}
                    <div
                        className="h-full w-full overflow-auto animate-fade-in"
                        style={{ scrollbarGutter: 'stable' }}
                    >
                        {!isPanicMode && children}
                    </div>

                    {/* Processing Overlay */}
                    {isProcessing && (
                        <div
                            className="absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md bg-black/40 rounded-tl-[40px] animate-fade-in"
                        >
                            <div
                                className="relative w-20 h-20 mb-6"
                                style={{ animation: 'scaleIn 1.5s ease-in-out infinite' }}
                            >
                                {/* Spinner Background Ring */}
                                <div className="absolute inset-0 border-4 border-white/10 rounded-full" />

                                {/* Rotating Ring */}
                                <div
                                    className="absolute inset-0 border-4 border-t-transparent rounded-full shadow-glow animate-spin"
                                    style={{ borderColor: 'var(--color-accent) transparent transparent transparent' }}
                                />

                                {/* Center Glow */}
                                <div className="absolute inset-4 bg-accent/20 blur-xl rounded-full" />
                            </div>

                            <div
                                className="text-white font-bold text-xl tracking-wider text-shadow text-center px-6 animate-scale-in"
                            >
                                {t('common.processing') || 'Processing...'}
                            </div>
                            <div
                                className="text-white/60 text-sm mt-2 text-center animate-pulse-slow"
                            >
                                {t('common.pleaseWait') || 'Please wait while we prepare your content'}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default MainLayout;
