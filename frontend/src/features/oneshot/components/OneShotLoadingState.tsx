/**
 * OneShotLoadingState - Loading state component for oneshot page
 */

export function OneShotLoadingState() {
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
