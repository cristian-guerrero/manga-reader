/**
 * ErrorDisplay - Reusable error display component
 */

import { ReactNode } from 'react';

interface ErrorDisplayProps {
    /** Error title */
    title?: string;
    /** Error message */
    message: string;
    /** Optional error details */
    details?: string;
    /** Optional icon (default: error icon) */
    icon?: ReactNode;
    /** Optional retry action */
    onRetry?: () => void;
    /** Optional dismiss action */
    onDismiss?: () => void;
    /** Custom className */
    className?: string;
    /** Full height container (default: false) */
    fullHeight?: boolean;
    /** Variant style */
    variant?: 'error' | 'warning' | 'info';
}

const variantStyles = {
    error: {
        iconColor: 'var(--color-error)',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'var(--color-error)',
    },
    warning: {
        iconColor: 'var(--color-warning)',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        borderColor: 'var(--color-warning)',
    },
    info: {
        iconColor: 'var(--color-accent)',
        bgColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'var(--color-accent)',
    },
};

const defaultErrorIcon = (
    <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

export function ErrorDisplay({
    title = 'Error',
    message,
    details,
    icon,
    onRetry,
    onDismiss,
    className = '',
    fullHeight = false,
    variant = 'error',
}: ErrorDisplayProps) {
    const styles = variantStyles[variant];
    const containerClass = fullHeight
        ? 'flex flex-col items-center justify-center h-full gap-4'
        : 'flex flex-col gap-4 p-4 rounded-lg border';

    return (
        <div
            className={`${containerClass} ${className}`}
            style={{
                backgroundColor: fullHeight ? 'var(--color-surface-primary)' : styles.bgColor,
                borderColor: fullHeight ? 'transparent' : styles.borderColor,
            }}
        >
            <div className="flex flex-col items-center gap-4 text-center max-w-md">
                <div style={{ color: styles.iconColor }}>
                    {icon || defaultErrorIcon}
                </div>
                <div className="flex flex-col gap-2">
                    <h3
                        className="text-lg font-semibold"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {title}
                    </h3>
                    <p
                        className="text-sm"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {message}
                    </p>
                    {details && (
                        <details className="text-xs mt-2">
                            <summary
                                className="cursor-pointer"
                                style={{ color: 'var(--color-text-tertiary)' }}
                            >
                                Show details
                            </summary>
                            <pre
                                className="mt-2 p-2 rounded text-left overflow-auto"
                                style={{
                                    backgroundColor: 'var(--color-surface-secondary)',
                                    color: 'var(--color-text-secondary)',
                                }}
                            >
                                {details}
                            </pre>
                        </details>
                    )}
                </div>
                {(onRetry || onDismiss) && (
                    <div className="flex gap-2">
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="btn-primary hover:scale-105 active:scale-95 transition-transform"
                            >
                                Retry
                            </button>
                        )}
                        {onDismiss && (
                            <button
                                onClick={onDismiss}
                                className="btn-secondary hover:scale-105 active:scale-95 transition-transform"
                            >
                                Dismiss
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
