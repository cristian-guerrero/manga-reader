import React from 'react';

interface GridContainerProps {
    children: React.ReactNode;
    className?: string;
    gap?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'chapters' | 'thumbnails';
    itemWidth?: number;
}

export function GridContainer({ children, className = '', gap = 'md', variant = 'default', itemWidth = 200 }: GridContainerProps) {
    const gapClass = {
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6',
    }[gap];

    const gridStyle: React.CSSProperties = {
        gridTemplateColumns: `repeat(auto-fill, ${itemWidth}px)`,
        justifyContent: 'start',
    };

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
