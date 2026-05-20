import React from 'react';

interface GridItemProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    style?: React.CSSProperties;
    width?: number;
}

export function GridItem({ children, onClick, className = '', style, width = 200 }: GridItemProps) {
    return (
        <div
            className={`flex-shrink-0 ${className}`}
            onClick={onClick}
            style={{
                width: `${width}px`,
                transition: 'width 0.2s ease',
                ...style,
            }}
        >
            {children}
        </div>
    );
}
