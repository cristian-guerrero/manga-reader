import React from 'react';

interface GridContainerProps {
    children: React.ReactNode;
    className?: string;
    gap?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'chapters' | 'thumbnails';
}

/**
 * GridContainer - Common grid container component
 * Handles all responsive breakpoints consistently across all pages
 * Items will maintain reasonable size and add more columns as screen size increases
 * 
 * Variants:
 * - default: Standard grid for folders, series, explorer (grid-cols-1 sm:2 lg:3 xl:4 2xl:6 3xl:7 4xl:8)
 * - chapters: Grid for chapters in series details (grid-cols-1 sm:2 lg:4 xl:5 2xl:7 3xl:8 4xl:9)
 * - thumbnails: Grid for thumbnails starting with 2 columns (grid-cols-2 sm:3 md:4 lg:5 xl:6 2xl:7 3xl:8 4xl:9)
 */
export function GridContainer({ children, className = '', gap = 'md', variant = 'default' }: GridContainerProps) {
    const gapClass = {
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6',
    }[gap];

    // Use auto-fill with fixed item width to automatically add more columns
    // Items will maintain their exact size (200px) and spacing, just more items will appear
    const gridStyle: React.CSSProperties = {
        gridTemplateColumns: 'repeat(auto-fill, 200px)',
        justifyContent: 'start', // Align items to the start, don't stretch
    };

    // For mobile, ensure at least 1 column
    const mobileClass = variant === 'thumbnails' ? 'grid-cols-2' : 'grid-cols-1';

    return (
        <div
            className={`grid ${mobileClass} ${gapClass} animate-fade-in ${className}`}
            style={gridStyle}
        >
            {children}
        </div>
    );
}

