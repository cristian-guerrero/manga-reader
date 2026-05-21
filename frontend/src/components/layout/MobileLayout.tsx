import { useRef, useState, useCallback } from 'react';
import { useNavigation } from '@hooks';
import { useScrollAware } from '@hooks/useScrollAware';
import { MobileScrollProvider } from '@contexts/MobileScrollContext';
import { MobileBottomNav } from './MobileBottomNav';

interface MobileLayoutProps {
    children: React.ReactNode;
}

function MobileLayoutContent({ children }: MobileLayoutProps) {
    const { isPanicMode, isProcessing } = useNavigation();
    const contentRef = useRef<HTMLDivElement>(null);
    const [headerVisible, setHeaderVisible] = useState(true);
    const { navVisible } = useScrollAware(contentRef, 10, setHeaderVisible);

    return (
        <MobileScrollProvider value={{ headerVisible }}>
            <div
                className="flex flex-col h-screen w-screen overflow-hidden theme-transition"
                style={{ backgroundColor: 'var(--color-surface-primary)' }}
            >
                <div
                    ref={contentRef}
                    className="flex-1 overflow-auto relative"
                    style={{
                        backgroundColor: 'var(--color-surface-primary)',
                        paddingBottom: '56px',
                    }}
                >
                    {isPanicMode && (
                        <div
                            className="absolute inset-0 z-50 animate-fade-in"
                            style={{ backgroundColor: 'var(--color-surface-primary)' }}
                        />
                    )}

                    {!isPanicMode && children}

                    {isProcessing && (
                        <div
                            className="absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md bg-black/40 animate-fade-in"
                        >
                            <div
                                className="relative w-16 h-16 mb-4"
                                style={{ animation: 'scaleIn 1.5s ease-in-out infinite' }}
                            >
                                <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
                                <div
                                    className="absolute inset-0 border-4 border-t-transparent rounded-full shadow-glow animate-spin"
                                    style={{ borderColor: 'var(--color-accent) transparent transparent transparent' }}
                                />
                                <div className="absolute inset-3 bg-accent/20 blur-lg rounded-full" />
                            </div>
                            <div className="text-white font-bold text-base tracking-wider text-shadow">
                                Processing...
                            </div>
                        </div>
                    )}
                </div>

                <MobileBottomNav visible={navVisible} contentRef={contentRef} />
            </div>
        </MobileScrollProvider>
    );
}

export function MobileLayout(props: MobileLayoutProps) {
    return <MobileLayoutContent {...props} />;
}
