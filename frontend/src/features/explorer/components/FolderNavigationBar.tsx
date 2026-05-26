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
    currentIndex: number;
    totalFolders: number;
    onPrevFolder: () => void;
    onNextFolder: () => void;
    t: (key: string) => string;
}

export function FolderNavigationBar({
    prevFolder,
    nextFolder,
    currentIndex,
    totalFolders,
    onPrevFolder,
    onNextFolder,
    t,
}: FolderNavigationBarProps) {
    if (!prevFolder && !nextFolder) {
        return null;
    }

    return (
        <div
            className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 rounded-xl mt-4 flex-shrink-0 gap-4"
            style={{
                backgroundColor: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
            }}
        >
            {/* Previous folder */}
            <div className="flex justify-start">
                <button
                    onClick={onPrevFolder}
                    disabled={!prevFolder}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 active:scale-95"
                    style={{
                        backgroundColor: prevFolder ? 'var(--color-surface-tertiary)' : 'transparent',
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
                        <span className="text-sm font-medium truncate max-w-[180px]">
                            {prevFolder?.name || '—'}
                        </span>
                    </div>
                </button>
            </div>

            {/* Position indicator */}
            <div className="flex items-center justify-center gap-2">
                <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                    {currentIndex + 1} / {totalFolders}
                </span>
                {totalFolders > 1 && totalFolders <= 30 && (
                    <div className="flex gap-1">
                        {Array.from({ length: totalFolders }, (_, i) => (
                            <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                    backgroundColor: i === currentIndex
                                        ? 'var(--color-accent)'
                                        : 'var(--color-border)',
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Next folder */}
            <div className="flex justify-end">
                <button
                    onClick={onNextFolder}
                    disabled={!nextFolder}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 active:scale-95"
                    style={{
                        backgroundColor: nextFolder ? 'var(--color-surface-tertiary)' : 'transparent',
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
                        <span className="text-sm font-medium truncate max-w-[180px]">
                            {nextFolder?.name || '—'}
                        </span>
                    </div>
                    <ChevronRightIcon />
                </button>
            </div>
        </div>
    );
}
