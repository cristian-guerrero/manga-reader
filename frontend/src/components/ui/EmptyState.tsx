/**
 * EmptyState - Reusable empty state component
 */

import { ReactNode } from 'react';

interface EmptyStateProps {
    /** Icon or emoji to display */
    icon?: ReactNode;
    /** Main title text */
    title: string;
    /** Optional description text */
    description?: string;
    /** Optional action button */
    action?: {
        label: string;
        onClick: () => void;
        variant?: 'primary' | 'secondary';
    };
    /** Custom className */
    className?: string;
    /** Full height container (default: true) */
    fullHeight?: boolean;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className = '',
    fullHeight = true,
}: EmptyStateProps) {
    const containerClass = fullHeight
        ? 'flex flex-col items-center justify-center h-full gap-4'
        : 'flex flex-col items-center justify-center gap-4 py-8';

    return (
        <div
            className={`${containerClass} ${className}`}
            style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
            {icon && (
                <div className="text-6xl animate-scale-in">
                    {icon}
                </div>
            )}
            <div className="flex flex-col items-center gap-2 text-center max-w-md">
                <h3
                    className="text-xl font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                >
                    {title}
                </h3>
                {description && (
                    <p
                        className="text-sm"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {description}
                    </p>
                )}
            </div>
            {action && (
                <button
                    onClick={action.onClick}
                    className={`btn-${action.variant || 'primary'} hover:scale-105 active:scale-95 transition-transform`}
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
