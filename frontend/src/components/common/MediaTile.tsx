import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { Tooltip } from './Tooltip';

interface MediaTileProps {
    id: string;
    name: string;
    thumbnail?: string;
    fallbackIcon?: ReactNode;

    // Lazy loading
    onVisible?: () => void;

    // Actions
    onClick?: () => void;
    onSecondaryAction?: (e: React.MouseEvent) => void;
    secondaryActionIcon?: ReactNode;
    secondaryActionLabel?: string;

    // Overlay
    overlayContent?: ReactNode;

    // Bottom Content
    footerLeft?: ReactNode;
    footerRight?: ReactNode;

    // Badges
    badgeText?: string;
    badgeColor?: string;

    // Styling
    aspectRatio?: string; // e.g. "aspect-[2/3]"
    className?: string;
    variant?: 'default' | 'elevated' | 'glass';
    showFooter?: boolean;
}

/**
 * MediaTile - A unified, high-performance component for item thumbnails
 * with consistent look and feel across the application.
 */
export function MediaTile({
    id,
    name,
    thumbnail,
    fallbackIcon,
    onVisible,
    onClick,
    onSecondaryAction,
    secondaryActionIcon,
    secondaryActionLabel,
    overlayContent,
    footerLeft,
    footerRight,
    badgeText,
    badgeColor,
    aspectRatio = "aspect-[2/3]",
    className = "",
    variant = 'default',
    showFooter = true,
}: MediaTileProps) {
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || isVisible) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    onVisible?.();
                }
            },
            {
                rootMargin: '200px',
                threshold: 0.01
            }
        );

        observer.observe(el);

        // Immediate check
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight + 200 && rect.bottom > -200) {
            setIsVisible(true);
            onVisible?.();
        }

        return () => observer.disconnect();
    }, [isVisible, onVisible]);

    const getVariantClasses = () => {
        switch (variant) {
            case 'elevated': return 'bg-surface-elevated shadow-lg';
            case 'glass': return 'glass backdrop-blur-md';
            default: return 'bg-surface-secondary';
        }
    };

    return (
        <div
            ref={containerRef}
            className={`group/tile relative rounded-xl overflow-hidden border border-white/5 hover:border-accent/50 transition-all hover:shadow-xl cursor-pointer animate-scale-in hover-lift ${getVariantClasses()} ${className}`}
            onClick={onClick}
        >
            {/* Thumbnail Area */}
            <div className={`${aspectRatio} w-full relative overflow-hidden bg-surface-tertiary`}>
                {thumbnail ? (
                    isVisible ? (
                        <img
                            src={thumbnail}
                            alt={name}
                            className="w-full h-full object-cover group-hover/tile:scale-105 transition-transform duration-500 opacity-0"
                            onLoad={(e) => {
                                (e.target as HTMLImageElement).classList.add('opacity-100');
                            }}
                        />
                    ) : (
                        <div className="w-full h-full" />
                    )
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-accent/40 group-hover/tile:scale-110 transition-transform duration-500">
                        {fallbackIcon || (
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                        )}
                    </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />

                {/* Badge (e.g. Archive) */}
                {badgeText && (
                    <div
                        className="absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider z-10 shadow-lg border border-white/10"
                        style={{
                            backgroundColor: badgeColor || 'rgba(56, 189, 248, 0.9)',
                            color: 'white',
                            backdropFilter: 'blur(4px)'
                        }}
                    >
                        {badgeText}
                    </div>
                )}

                {/* Secondary Action (e.g. Remove) */}
                {onSecondaryAction && secondaryActionIcon && (
                    <div className="absolute top-2 right-2 z-20 opacity-0 group-hover/tile:opacity-100 transition-all">
                        <Tooltip content={secondaryActionLabel || ""} placement="left">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSecondaryAction(e);
                                }}
                                className="p-2 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/40 backdrop-blur-md transition-colors"
                            >
                                {secondaryActionIcon}
                            </button>
                        </Tooltip>
                    </div>
                )}

                {/* Custom Overlay Content (e.g. Play button) */}
                <div className="absolute inset-0 opacity-0 group-hover/tile:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10 pointer-events-none bg-black/20">
                    <div className="pointer-events-auto">
                        {overlayContent}
                    </div>
                </div>
            </div>

            {/* Footer / Info */}
            {showFooter && (
                <div className="p-3 bg-gradient-to-t from-black/20 to-transparent">
                    <h3 className="font-semibold text-white truncate text-shadow-sm" title={name}>
                        {name}
                    </h3>
                    {(footerLeft || footerRight) && (
                        <div className="flex items-center justify-between mt-1 min-h-[24px]">
                            <div className="text-xs text-white/70 truncate flex-1 mr-2">
                                {footerLeft}
                            </div>
                            <div className="flex-shrink-0">
                                {footerRight}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default MediaTile;
