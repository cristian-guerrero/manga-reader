import React from 'react';

interface GridContainerProps {
    children: React.ReactNode;
    className?: string;
    gap?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'chapters' | 'thumbnails';
    itemWidth?: number;
}

export function GridContainer({ children, className = '', gap = 'md', variant = 'default', itemWidth = 200 }: GridContainerProps) {
    const minWidth = Math.max(itemWidth, 50);

    return (
        <div
            className={`grid grid-cols-2 gap-x-5 gap-y-3 animate-fade-in px-2 sm:px-3 sm:grid-cols-[repeat(auto-fill,minmax(var(--grid-item-width),1fr))] ${className}`}
            style={{ '--grid-item-width': `${minWidth}px` } as React.CSSProperties}
        >
            {children}
        </div>
    );
}
