/**
 * SeriesDetailsLoadingState - Loading state component for series details page
 */

export function SeriesDetailsLoadingState() {
    return (
        <div className="flex items-center justify-center h-full">
            <div
                className="w-12 h-12 border-4 rounded-full animate-spin"
                style={{
                    borderColor: 'var(--color-accent)',
                    borderTopColor: 'transparent',
                }}
            />
        </div>
    );
}
