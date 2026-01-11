/**
 * SeriesLoadingState - Loading state component for series page
 */

export function SeriesLoadingState() {
    return (
        <div className="flex items-center justify-center py-20">
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
