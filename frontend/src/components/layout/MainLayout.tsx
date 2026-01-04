/**
 * MainLayout - Main application layout with title bar, sidebar, and content area
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useNavigationStore } from '../../stores/navigationStore';
import { TitleBar } from './TitleBar';
import { Sidebar } from './Sidebar';

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
