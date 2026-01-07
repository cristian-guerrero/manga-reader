
import React, { ReactNode } from 'react';

interface TooltipProps {
    content: string;
    children: ReactNode;
    placement?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
}

export function Tooltip({ content, children, placement = 'bottom', className = '' }: TooltipProps) {
    // Positioning classes based on placement
    const positionClasses = {
        top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
        bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
        left: 'right-full mr-2 top-1/2 -translate-y-1/2',
        right: 'left-full ml-2 top-1/2 -translate-y-1/2',
    };

    return (
        <div className={`group/tooltip relative flex items-center justify-center ${className}`}>
            {children}
            {content && (
                <div
                    className={`absolute ${positionClasses[placement]} px-3 py-1.5 text-xs font-medium rounded-lg 
                        opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible
                        transition-all duration-200 whitespace-nowrap pointer-events-none`}
                    style={{
                        backgroundColor: 'var(--color-surface-elevated)',
                        color: 'var(--color-text-primary)',
                        boxShadow: 'var(--shadow-lg)',
                        border: '1px solid var(--color-border)',
                        zIndex: 9999,
                    }}
                >
                    {content}
                </div>
            )}
        </div>
    );
}

export default Tooltip;
