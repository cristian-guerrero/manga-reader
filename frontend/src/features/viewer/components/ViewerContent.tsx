/**
 * ViewerContent - Component to render viewer based on mode
 * Extracted from ViewerPage to improve separation of concerns
 */

import { VerticalViewer } from '../VerticalViewer';
import { LateralViewer } from '../LateralViewer';
import { ViewerMode, ImageInfo } from '@types';

interface ViewerContentProps {
    mode: ViewerMode;
    images: ImageInfo[];
    initialIndex: number;
    initialScrollPosition?: number;
    showControls: boolean;
    hasChapterButtons: boolean;
    isAutoScrolling: boolean;
    scrollSpeed: number;
    onAutoScrollStateChange: (isAutoScrolling: boolean) => void;
    onRestorationComplete: () => void;
    onIndexChange: (index: number) => void;
    onScrollPositionChange?: (scrollTop: number) => void;
    verticalWidth: number;
    onWidthChange: (width: number) => void;
    isActive: boolean;
    onPageChange: () => void;
    tabId?: string;
    onNextBoundary?: () => void;
    onPrevBoundary?: () => void;
}

export function ViewerContent({
    mode,
    images,
    initialIndex,
    initialScrollPosition,
    showControls,
    hasChapterButtons,
    isAutoScrolling,
    scrollSpeed,
    onAutoScrollStateChange,
    onRestorationComplete,
    onIndexChange,
    onScrollPositionChange,
    verticalWidth,
    onWidthChange,
    isActive,
    onPageChange,
    tabId,
    onNextBoundary,
    onPrevBoundary,
}: ViewerContentProps) {
    if (mode === 'vertical') {
        return (
            <div className="h-full w-full opacity-100">
                <VerticalViewer
                    images={images}
                    initialIndex={initialIndex}
                    initialScrollPosition={initialScrollPosition}
                    showControls={showControls}
                    hasChapterButtons={hasChapterButtons}
                    isAutoScrolling={isAutoScrolling}
                    scrollSpeed={scrollSpeed}
                    onAutoScrollStateChange={onAutoScrollStateChange}
                    onRestorationComplete={onRestorationComplete}
                    onIndexChange={onIndexChange}
                    onScrollPositionChange={onScrollPositionChange}
                    verticalWidth={verticalWidth}
                    onWidthChange={onWidthChange}
                    isActive={isActive}
                />
            </div>
        );
    }

    return (
        <div className="h-full w-full opacity-100">
            <LateralViewer
                images={images}
                onPageChange={onPageChange}
                initialIndex={initialIndex}
                showControls={showControls}
                hasChapterButtons={hasChapterButtons}
                onRestorationComplete={onRestorationComplete}
                tabId={tabId}
                onNextBoundary={onNextBoundary}
                onPrevBoundary={onPrevBoundary}
            />
        </div>
    );
}
