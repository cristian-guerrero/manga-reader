/**
 * MainLayout - Main application layout with title bar, sidebar, and content area
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
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
    const { isPanicMode } = useNavigationStore();
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

                        if (processDropped) {
                            // @ts-ignore
                            isSeries = await window.go?.main?.App?.IsSeries(path);
                            // @ts-ignore
                            await window.go?.main?.App?.AddFolder(path);
                        }

                        // @ts-ignore
                        const navigate = useNavigationStore.getState().navigate;

                        if (isSeries && processDropped) {
                            navigate('series-details', { series: path });
                        } else {
                            navigate('viewer', {
                                folder: path,
                                noHistory: !processDropped ? 'true' : 'false'
                            });
                        }
                        showToast(`Opening: ${path.split(/[\\/]/).pop()}`, 'success');
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
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            {/* Title Bar */}
            <TitleBar />

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <Sidebar />

                {/* Content */}
                <main className="flex-1 overflow-hidden relative">
                    {/* Panic Mode Overlay */}
                    <AnimatePresence>
                        {isPanicMode && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-50"
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
                </main>
            </div>
        </div>
    );
}

export default MainLayout;
