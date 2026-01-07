import React from 'react';

interface GridItemProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * GridItem - Common wrapper component for grid items
 * Limits the maximum width of items to prevent them from growing too large on wide screens
 */
export function GridItem({ children, onClick, className = '', style }: GridItemProps) {
    return (
        <div
            className={`w-full max-w-[200px] ${className}`}
            onClick={onClick}
            style={style}
        >
            {children}
        </div>
    );
}

