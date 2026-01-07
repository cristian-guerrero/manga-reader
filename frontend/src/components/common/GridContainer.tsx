import React from 'react';

interface GridContainerProps {
    children: React.ReactNode;
    className?: string;
    gap?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'chapters';
}

/**
 * GridContainer - Common grid container component
 * Handles all responsive breakpoints consistently across all pages
 * Items will maintain reasonable size and add more columns as screen size increases
 * 
 * Variants:
 * - default: Standard grid for folders, series, explorer (grid-cols-1 sm:2 lg:3 xl:4 2xl:6 3xl:7 4xl:8)
 * - chapters: Grid for chapters in series details (grid-cols-1 sm:2 lg:4 xl:5 2xl:7 3xl:8 4xl:9)
 */
export function GridContainer({ children, className = '', gap = 'md', variant = 'default' }: GridContainerProps) {
    const gapClass = {
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6',
    }[gap];

    const variantClasses = {
        default: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 3xl:grid-cols-7 4xl:grid-cols-8',
        chapters: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-9',
    };

    return (
        <div
            className={`grid ${variantClasses[variant]} ${gapClass} animate-fade-in ${className}`}
        >
            {children}
        </div>
    );
}

