/**
 * MainLayout - Main application layout with title bar, sidebar, and content area
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../../stores/navigationStore';


import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { OnFileDrop, OnFileDropOff } from '../../../wailsjs/runtime';
import { useToast } from '../common/Toast';
import { useSettingsStore } from '../../stores/settingsStore';

interface MainLayoutProps {
    children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    const { t } = useTranslation();
    const { isPanicMode, isProcessing, setIsProcessing } = useNavigationStore();
    const { showToast } = useToast();
    const { processDroppedFolders } = useSettingsStore();


    // Page transition variants
    const pageVariants = {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
    };

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
                                showToast(t('folders.addFailed'), 'error');
                            }
                        } else {
                            // @ts-ignore
                            isSeries = await window.go?.main?.App?.IsSeries(path);
                        }

                        // @ts-ignore
                        const navigate = useNavigationStore.getState().navigate;

                        if (isSeries && processDropped) {
                            navigate('series-details', { series: finalPath });
                        } else {
                            navigate('viewer', {
                                folder: finalPath,
                                noHistory: !processDropped ? 'true' : 'false'
                            });
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

    return (
        <div
            className="flex flex-col h-screen w-screen overflow-hidden theme-transition"
            style={{ backgroundColor: 'var(--color-surface-secondary)' }}
        >
            {/* Title Bar */}
            <TitleBar />

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <Sidebar />

                {/* Content Area with Rounded Corner */}
                <main
                    className="flex-1 overflow-hidden relative theme-transition mr-3 mb-3 rounded-tl-[40px] shadow-2xl border"
                    style={{
                        backgroundColor: 'var(--color-surface-primary)',
                        borderColor: 'var(--color-border)'
                    }}
                >
                    {/* Panic Mode Overlay */}
                    <AnimatePresence>
                        {isPanicMode && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-50 rounded-tl-[40px]"
                                style={{ backgroundColor: 'var(--color-surface-primary)' }}
                            />
                        )}
                    </AnimatePresence>

                    {/* Page Content with Transitions */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isPanicMode ? 'panic' : 'content'}
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="h-full w-full overflow-auto"
                            style={{ scrollbarGutter: 'stable' }}
                        >
                            {!isPanicMode && children}
                        </motion.div>
                    </AnimatePresence>

                    {/* Processing Overlay */}
                    <AnimatePresence>
                        {isProcessing && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md bg-black/40 rounded-tl-[40px]"
                            >
                                <motion.div
                                    className="relative w-20 h-20 mb-6"
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    {/* Spinner Background Ring */}
                                    <div className="absolute inset-0 border-4 border-white/10 rounded-full" />

                                    {/* Rotating Ring */}
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 border-4 border-t-transparent rounded-full shadow-glow"
                                        style={{ borderColor: 'var(--color-accent) transparent transparent transparent' }}
                                    />

                                    {/* Center Glow */}
                                    <div className="absolute inset-4 bg-accent/20 blur-xl rounded-full" />
                                </motion.div>

                                <motion.div
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="text-white font-bold text-xl tracking-wider text-shadow text-center px-6"
                                >
                                    {t('common.processing') || 'Processing...'}
                                </motion.div>
                                <motion.div
                                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="text-white/60 text-sm mt-2 text-center"
                                >
                                    {t('common.pleaseWait') || 'Please wait while we prepare your content'}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}

export default MainLayout;
