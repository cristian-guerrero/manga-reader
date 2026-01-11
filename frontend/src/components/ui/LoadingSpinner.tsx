/**
 * LoadingSpinner - Reusable loading spinner component
 */

interface LoadingSpinnerProps {
    /** Size of the spinner (default: 'md') */
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** Custom text to display below spinner */
    text?: string;
    /** Whether to show text (default: false) */
    showText?: boolean;
    /** Custom className */
    className?: string;
    /** Full screen overlay (default: false) */
    fullScreen?: boolean;
    /** Full height container (default: false) - alias for fullScreen */
    fullHeight?: boolean;
}

const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
};

export function LoadingSpinner({
    size = 'md',
    text,
    showText = false,
    className = '',
    fullScreen = false,
    fullHeight = false,
}: LoadingSpinnerProps) {
    const isFullSize = fullScreen || fullHeight;
    const containerClass = isFullSize
        ? 'flex items-center justify-center h-screen w-screen'
        : 'flex items-center justify-center';
    
    return (
        <div className={`${containerClass} ${className}`}>
            <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div
                    className={`${sizeClasses[size]} rounded-full animate-spin-slow`}
                    style={{
                        borderColor: 'var(--color-accent)',
                        borderTopColor: 'transparent',
                    }}
                />
                {(showText || text) && (
                    <span
                        className="text-sm font-medium animate-pulse-slow"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {text || 'Loading...'}
                    </span>
                )}
            </div>
        </div>
    );
}
