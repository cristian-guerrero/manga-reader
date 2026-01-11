/**
 * useViewerNavigationSeek - Hook to handle navigation within the same folder
 * Extracted from ViewerPage to improve separation of concerns
 */

import { useEffect } from 'react';
import { useTabStore } from '@stores';
import { ImageInfo, FolderInfo } from '@types';

interface UseViewerNavigationSeekOptions {
    tabId?: string;
    isActive: boolean;
    folderPath?: string;
    currentFolder: FolderInfo | null;
    images: ImageInfo[];
    currentIndex: number;
    resumeIndex: number;
    setResumeIndex: (index: number) => void;
    setResetKey: (fn: (prev: number) => number) => void;
    lastProcessedParamsRef: React.MutableRefObject<{ targetPath?: string; startIndex?: string } | null>;
    updateTabState: (updates: any) => void;
}

export function useViewerNavigationSeek({
    tabId,
    isActive,
    folderPath,
    currentFolder,
    images,
    currentIndex,
    resumeIndex,
    setResumeIndex,
    setResetKey,
    lastProcessedParamsRef,
    updateTabState,
}: UseViewerNavigationSeekOptions) {
    const currentParams = useTabStore((state) => state.tabs.find((t) => t.id === tabId)?.params);

    useEffect(() => {
        if (!isActive || !folderPath || images.length === 0) return;
        if (currentFolder?.path !== folderPath) return;

        const targetPath = currentParams?.targetPath;
        const explicitStartIndex = currentParams?.startIndex ? parseInt(currentParams.startIndex, 10) : -1;

        // Check if these params have already been processed
        const currentParamsKey = `${targetPath || ''}_${currentParams?.startIndex || ''}`;
        const lastParamsKey = lastProcessedParamsRef.current
            ? `${lastProcessedParamsRef.current.targetPath || ''}_${lastProcessedParamsRef.current.startIndex || ''}`
            : null;

        let targetIndex = -1;
        if (targetPath) {
            targetIndex = images.findIndex((img) => img.path === targetPath);
        } else if (explicitStartIndex >= 0) {
            targetIndex = explicitStartIndex;
        }

        // Only process if params are new or different
        if (currentParamsKey === lastParamsKey && lastParamsKey !== '') {
            console.log(`[useViewerNavigationSeek] Navigation seek: Skipping - already processed params`);
            return;
        }

        if (targetIndex >= 0) {
            // Calculate diff based on currentIndex, not resumeIndex (which may not be updated yet)
            const indexDiffFromCurrent = Math.abs(targetIndex - currentIndex);

            // If targetIndex matches currentIndex, these are old params that should be ignored
            if (targetIndex === currentIndex) {
                console.log(`[useViewerNavigationSeek] Navigation seek: Ignoring old params - targetIndex ${targetIndex} matches currentIndex ${currentIndex}`);
                lastProcessedParamsRef.current = { targetPath, startIndex: currentParams?.startIndex };
                return;
            }

            // Only apply if it's significantly different from currentIndex (user navigation)
            const isCurrentIndexSet = currentIndex > 0 && currentIndex < images.length;
            const isCloseToCurrent = indexDiffFromCurrent <= 5;
            const shouldApply = targetIndex !== currentIndex && (isCloseToCurrent || !isCurrentIndexSet);

            if (shouldApply) {
                console.log(`[useViewerNavigationSeek] Navigation seek detected: ${targetIndex} (currentIndex: ${currentIndex}, resumeIndex: ${resumeIndex}, diffFromCurrent: ${indexDiffFromCurrent}, isCurrentIndexSet: ${isCurrentIndexSet})`);
                setResumeIndex(targetIndex);
                lastProcessedParamsRef.current = { targetPath, startIndex: currentParams?.startIndex };
                setResetKey((prev) => prev + 1);
                updateTabState({ currentIndex: targetIndex });
            } else {
                console.log(`[useViewerNavigationSeek] Navigation seek: Ignoring ${targetIndex} (currentIndex: ${currentIndex}, resumeIndex: ${resumeIndex}, diffFromCurrent: ${indexDiffFromCurrent}, isCurrentIndexSet: ${isCurrentIndexSet}, likely old params)`);
                lastProcessedParamsRef.current = { targetPath, startIndex: currentParams?.startIndex };
            }
        } else {
            // No valid target index, but mark params as processed if they exist
            if (targetPath || currentParams?.startIndex) {
                lastProcessedParamsRef.current = { targetPath, startIndex: currentParams?.startIndex };
            }
        }
    }, [currentParams?.targetPath, currentParams?.startIndex, isActive, folderPath, images.length, currentIndex, resumeIndex, updateTabState, currentFolder?.path]);
}
