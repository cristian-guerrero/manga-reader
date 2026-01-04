/**
 * MainLayout - Main application layout with title bar, sidebar, and content area
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useNavigationStore } from '../../stores/navigationStore';


import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { OnFileDrop, OnFileDropOff } from '../../../wailsjs/runtime';



interface MainLayoutProps {
    children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    const { isPanicMode } = useNavigationStore();

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
                // Determine if we need to navigate or just add
                // Navigate to the first dragged folder immediately
                if (paths.length === 1) {
                    try {
                        // @ts-ignore
                        await window.go?.main?.App?.AddFolder(paths[0]);
                        // @ts-ignore
                        const navigate = useNavigationStore.getState().navigate;
                        navigate('viewer', { folder: paths[0] });
                    } catch (e) {
                        console.error("Failed to open dropped folder", e);
                    }
                } else {
                    for (const path of paths) {
                        try {
                            // @ts-ignore
                            await window.go?.main?.App?.AddFolder(path);
                        } catch (error) {
                            console.error('Failed to add folder:', error);
                        }
                    }
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
