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

interface FolderNavigationBarProps {
    prevFolder?: { path: string; name: string };
    nextFolder?: { path: string; name: string };
    showControls: boolean;
    onPrevFolder: () => void;
    onNextFolder: () => void;
    t: (key: string) => string;
}

export function FolderNavigationBar({
    prevFolder,
    nextFolder,
    showControls,
    onPrevFolder,
    onNextFolder,
    t,
}: FolderNavigationBarProps) {
    if (!prevFolder && !nextFolder) {
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
            <button
                onClick={onPrevFolder}
                disabled={!prevFolder}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 active:scale-95"
                style={{
                    backgroundColor: prevFolder ? 'var(--color-surface-elevated)' : 'transparent',
                    color: prevFolder ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    border: '1px solid var(--color-border)',
                    opacity: prevFolder ? 1 : 0.4,
                    cursor: prevFolder ? 'pointer' : 'not-allowed',
                }}
            >
                <ChevronLeftIcon />
                <div className="flex flex-col items-start">
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('explorer.prevFolder')}
                    </span>
                    <span className="text-sm font-medium truncate max-w-[150px]">
                        {prevFolder?.name || '—'}
                    </span>
                </div>
            </button>

            <button
                onClick={onNextFolder}
                disabled={!nextFolder}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 active:scale-95"
                style={{
                    backgroundColor: nextFolder ? 'var(--color-surface-elevated)' : 'transparent',
                    color: nextFolder ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    border: '1px solid var(--color-border)',
                    opacity: nextFolder ? 1 : 0.4,
                    cursor: nextFolder ? 'pointer' : 'not-allowed',
                }}
            >
                <div className="flex flex-col items-end">
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('explorer.nextFolder')}
                    </span>
                    <span className="text-sm font-medium truncate max-w-[150px]">
                        {nextFolder?.name || '—'}
                    </span>
                </div>
                <ChevronRightIcon />
            </button>
        </div>
    );
}
