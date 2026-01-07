import React, { ReactNode } from 'react';
import { Tooltip } from './Tooltip';

interface LibraryCardProps {
    // Data
    id: string;
    name: string;
    thumbnail?: string;
    isTemporary?: boolean;
    
    // Content
    count: number;
    countLabel: string;
    countIcon: ReactNode;
    
    // Actions
    onOpen: () => void;
    onRemove?: (e: React.MouseEvent) => void;
    onPlay?: (e: React.MouseEvent) => void;
    
    // Overlay content (customizable)
    overlayContent?: ReactNode;
    
    // Icons
    fallbackIcon: ReactNode;
    
    // Translations
    archiveLabel?: string;
    removeLabel?: string;
    playLabel?: string;
    
    // Styling
    variant?: 'split' | 'unified'; // 'split' separates image and info, 'unified' keeps them together
}

/**
 * LibraryCard - Shared component for displaying library items (series, one-shot folders, etc.)
 * Supports two variants:
 * - 'split': Separates image and info to prevent tooltip clipping (used in SeriesPage)
 * - 'unified': Keeps everything in one container (used in OneShotPage)
 */
export function LibraryCard({
    id,
    name,
    thumbnail,
    isTemporary = false,
    count,
    countLabel,
    countIcon,
    onOpen,
    onRemove,
    onPlay,
    overlayContent,
    fallbackIcon,
    archiveLabel = 'Archive',
    removeLabel = 'Remove',
    playLabel = 'Open',
    variant = 'unified',
}: LibraryCardProps) {
    const imageContent = (
        <div
            className="aspect-[3/4] relative overflow-hidden"
            style={{ backgroundColor: 'var(--color-surface-tertiary)' }}
        >
            {thumbnail ? (
                <img
                    src={thumbnail}
                    alt={name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105"
                />
            ) : (
                <div className="flex items-center justify-center h-full">
                    <div
                        className="animate-pulse"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        {fallbackIcon}
                    </div>
                </div>
            )}

            {/* Archive Badge */}
            {isTemporary && (
                <div
                    className="absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider z-10 shadow-lg border border-white/10"
                    style={{
                        backgroundColor: 'rgba(56, 189, 248, 0.9)', // Sky 400
                        color: 'white',
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    {archiveLabel}
                </div>
            )}

            {/* Overlay on hover */}
            {overlayContent && (
                <div
                    className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4 bg-black/40 pointer-events-none"
                >
                    {overlayContent}
                </div>
            )}

            {/* Remove button */}
            {onRemove && (
                <div className="absolute top-2 right-2 z-20 opacity-0 group-hover/card:opacity-100 transition-all">
                    <Tooltip content={removeLabel} placement="left">
                        <button
                            onClick={onRemove}
                            className="p-2 rounded-full hover:scale-110 active:scale-90"
                            style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                color: 'white',
                            }}
                            aria-label={removeLabel}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                        </button>
                    </Tooltip>
                </div>
            )}
        </div>
    );

    const infoContent = (
        <div 
            className={`p-4 ${variant === 'split' ? 'rounded-b-xl' : ''}`}
            style={{ 
                backgroundColor: 'var(--color-surface-secondary)',
                ...(variant === 'split' ? {
                    border: '1px solid var(--color-border)',
                    borderTop: 'none',
                } : {})
            }}
        >
            <Tooltip content={name} placement={variant === 'split' ? 'bottom' : 'top'} className={variant === 'unified' ? 'w-full justify-start' : ''}>
                <h3
                    className={`font-semibold truncate mb-1 ${variant === 'unified' ? 'w-full' : 'cursor-default'}`}
                    style={{ color: 'var(--color-text-primary)' }}
                >
                    {name}
                </h3>
            </Tooltip>
            <div
                className="flex items-center gap-1 text-sm"
                style={{ color: 'var(--color-text-muted)' }}
            >
                {countIcon}
                <span>
                    {count} {countLabel}
                </span>
            </div>
        </div>
    );

    if (variant === 'split') {
        return (
            <div className="flex flex-col group/card">
                <div
                    onClick={onOpen}
                    className="relative rounded-t-xl overflow-hidden cursor-pointer hover-lift shadow-sm transition-all hover:border-accent animate-slide-up"
                    style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        border: '1px solid var(--color-border)',
                        borderBottom: 'none',
                    }}
                >
                    {imageContent}
                </div>
                {infoContent}
            </div>
        );
    }

    // Unified variant
    return (
        <div
            onClick={onOpen}
            className="group/card relative rounded-xl overflow-hidden cursor-pointer hover-lift shadow-sm hover:border-accent transition-all animate-slide-up"
            style={{
                backgroundColor: 'var(--color-surface-secondary)',
                border: '1px solid var(--color-border)',
            }}
        >
            {imageContent}
            {infoContent}
        </div>
    );
}

export default LibraryCard;

