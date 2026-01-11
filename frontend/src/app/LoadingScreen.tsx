/**
 * LoadingScreen - Loading component shown during app initialization
 */

export function LoadingScreen() {
    return (
        <div
            className="flex items-center justify-center h-screen w-screen animate-fade-in"
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            <div className="flex flex-col items-center gap-4 animate-scale-in">
                {/* Animated logo */}
                <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center"
                    style={{
                        background: 'var(--gradient-accent)',
                        animation: 'rotateLogo 2s ease-in-out infinite'
                    }}
                >
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="white"
                    >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                    </svg>
                </div>

                {/* Loading text */}
                <div
                    className="text-lg font-medium animate-pulse-slow"
                    style={{ color: 'var(--color-text-secondary)' }}
                >
                    Loading...
                </div>

                {/* Progress bar */}
                <div
                    className="w-48 h-1 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--color-surface-tertiary)' }}
                >
                    <div
                        className="h-full rounded-full animate-progress"
                        style={{
                            background: 'var(--gradient-accent)',
                            width: '100%'
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
