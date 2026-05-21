import { RefObject, useEffect, useRef, useState } from 'react';

export function useScrollAware(
    containerRef: RefObject<HTMLElement | null>,
    threshold = 10,
    onHeaderVisibilityChange?: (visible: boolean) => void
): { navVisible: boolean } {
    const [navVisible, setNavVisible] = useState(true);
    const lastScrollTop = useRef(0);
    const ticking = useRef(false);

    useEffect(() => {
        const container = containerRef?.current;
        if (!container) return;

        let scrollEl: HTMLElement | null = null;

        const getScrollElement = (): HTMLElement | null => {
            const candidates = container.querySelectorAll('[class*="overflow-auto"], [class*="overflow-y-auto"]');
            for (const child of Array.from(candidates)) {
                const el = child as HTMLElement;
                if (el.scrollHeight > el.clientHeight + 10) {
                    return el;
                }
            }
            return container;
        };

        const handleScroll = (e: Event) => {
            if (ticking.current) return;
            ticking.current = true;

            const el = e.target as HTMLElement;
            requestAnimationFrame(() => {
                const scrollTop = el.scrollTop;
                const scrollHeight = el.scrollHeight;
                const clientHeight = el.clientHeight;
                const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20;

                if (scrollTop > lastScrollTop.current && scrollTop > threshold) {
                    if (!isAtBottom) {
                        setNavVisible(false);
                        onHeaderVisibilityChange?.(false);
                    }
                } else {
                    setNavVisible(true);
                    onHeaderVisibilityChange?.(true);
                }

                lastScrollTop.current = scrollTop <= 0 ? 0 : scrollTop;
                ticking.current = false;
            });
        };

        const setup = () => {
            if (scrollEl) {
                scrollEl.removeEventListener('scroll', handleScroll);
            }
            scrollEl = getScrollElement();
            if (scrollEl) {
                scrollEl.addEventListener('scroll', handleScroll, { passive: true });
            }
        };

        setup();

        const observer = new MutationObserver(() => {
            setup();
        });

        observer.observe(container, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            if (scrollEl) {
                scrollEl.removeEventListener('scroll', handleScroll);
            }
        };
    }, [containerRef, threshold, onHeaderVisibilityChange]);

    return { navVisible };
}
