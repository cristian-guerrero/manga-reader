/**
 * MainLayout - Main application layout with title bar, sidebar, and content area
 */

import { useTranslation } from 'react-i18next';
import { useNavigation, useDragAndDrop, useClipboardMonitor, useIsMobileNetwork } from '../../hooks';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { MobileLayout } from './MobileLayout';

interface MainLayoutProps {
    children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    const { t } = useTranslation();
    const { isPanicMode, isProcessing } = useNavigation();
    const isMobileView = useIsMobileNetwork();

    // Use hooks for drag & drop and clipboard monitoring (desktop only)
    useDragAndDrop();
    useClipboardMonitor();

    if (isMobileView) {
        return <MobileLayout>{children}</MobileLayout>;
    }

    return (
        <div
            className="flex flex-col h-screen w-screen overflow-hidden theme-transition"
            style={{ background: 'var(--gradient-sidebar-bg)' }}
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
                        background: 'var(--gradient-surface-primary)',
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
