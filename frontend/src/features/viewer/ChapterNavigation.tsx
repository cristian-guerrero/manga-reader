/**
 * ChapterNavigation - Bottom navigation bar for chapter navigation in series
 */

const ChevronLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

interface ChapterNavigationProps {
    prevChapter?: { path: string; name: string };
    nextChapter?: { path: string; name: string };
    showControls: boolean;
    onPrevChapter: () => void;
    onNextChapter: () => void;
    t: (key: string) => string;
}

export function ChapterNavigation({
    prevChapter,
    nextChapter,
    showControls,
    onPrevChapter,
    onNextChapter,
    t,
}: ChapterNavigationProps) {
    if (!prevChapter && !nextChapter) {
        return null;
    }

    return (
        <div
            className={`absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-50 transition-all duration-300 ${
                showControls ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
            }`}
            style={{
                background: 'linear-gradient(to top, var(--color-surface-overlay), transparent)',
            }}
        >
            {/* Previous chapter */}
            <button
                onClick={onPrevChapter}
                disabled={!prevChapter}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 active:scale-95"
                style={{
                    backgroundColor: prevChapter ? 'var(--color-surface-elevated)' : 'transparent',
                    color: prevChapter ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    border: '1px solid var(--color-border)',
                    opacity: prevChapter ? 1 : 0.4,
                    cursor: prevChapter ? 'pointer' : 'not-allowed',
                }}
            >
                <ChevronLeftIcon />
                <div className="flex flex-col items-start">
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('viewer.prevChapter')}
                    </span>
                    <span className="text-sm font-medium truncate max-w-[150px]">
                        {prevChapter?.name || '—'}
                    </span>
                </div>
            </button>

            {/* Next chapter */}
            <button
                onClick={onNextChapter}
                disabled={!nextChapter}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 active:scale-95"
                style={{
                    backgroundColor: nextChapter ? 'var(--color-surface-elevated)' : 'transparent',
                    color: nextChapter ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    border: '1px solid var(--color-border)',
                    opacity: nextChapter ? 1 : 0.4,
                    cursor: nextChapter ? 'pointer' : 'not-allowed',
                }}
            >
                <div className="flex flex-col items-end">
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('viewer.nextChapter')}
                    </span>
                    <span className="text-sm font-medium truncate max-w-[150px]">
                        {nextChapter?.name || '—'}
                    </span>
                </div>
                <ChevronRightIcon />
            </button>
        </div>
    );
}
