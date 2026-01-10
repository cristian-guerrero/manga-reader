import React, { ReactNode } from 'react';
import { MediaTile } from './MediaTile';

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
    onAuxClick?: (e: React.MouseEvent) => void;
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
 * - 'split': Separates image and info (used in SeriesPage)
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
    onAuxClick,
    onRemove,
    onPlay,
    overlayContent,
    fallbackIcon,
    archiveLabel = 'Archive',
    removeLabel = 'Remove',
    playLabel = 'Open',
    variant = 'unified',
}: LibraryCardProps) {
    if (variant === 'split') {
        return (
            <div className="flex flex-col group/card h-full">
                <MediaTile
                    id={id}
                    name={name}
                    thumbnail={thumbnail}
                    fallbackIcon={fallbackIcon}
                    onClick={onOpen}
                    onAuxClick={onAuxClick}
                    onSecondaryAction={onRemove}
                    secondaryActionIcon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                    }
                    secondaryActionLabel={removeLabel}
                    overlayContent={overlayContent}
                    badgeText={isTemporary ? archiveLabel : undefined}
                    aspectRatio="aspect-[3/4]"
                    showFooter={false}
                    className="rounded-b-none border-b-0"
                />
                <div
                    className="p-4 rounded-b-xl border border-white/5 bg-surface-secondary border-t-0 flex flex-col justify-center"
                    style={{ minHeight: '80px' }}
                >
                    <h3 className="font-semibold text-white truncate mb-1" title={name}>
                        {name}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-white/50">
                        {countIcon}
                        <span>{count} {countLabel}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <MediaTile
            id={id}
            name={name}
            thumbnail={thumbnail}
            fallbackIcon={fallbackIcon}
            onClick={onOpen}
            onAuxClick={onAuxClick}
            onSecondaryAction={onRemove}
            secondaryActionIcon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
            }
            secondaryActionLabel={removeLabel}
            overlayContent={overlayContent}
            badgeText={isTemporary ? archiveLabel : undefined}
            aspectRatio="aspect-[3/4]"
            footerLeft={
                <div className="flex items-center gap-1">
                    {countIcon}
                    <span>{count} {countLabel}</span>
                </div>
            }
        />
    );
}

export default LibraryCard;

