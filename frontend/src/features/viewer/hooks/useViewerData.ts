/**
 * useViewerData - Hook for loading viewer data (folder info and images)
 */

import { useState, useEffect } from 'react';
import { FolderInfo, ImageInfo } from '../../../types';
import { AppAPI } from '../../../services/api/appAPI';

interface UseViewerDataOptions {
    folderPath: string | undefined;
    isActive: boolean;
    tabId?: string;
    useShallow?: boolean;
}

interface UseViewerDataResult {
    folderInfo: FolderInfo | null;
    images: ImageInfo[];
    isLoading: boolean;
    error: Error | null;
}

export function useViewerData({
    folderPath,
    isActive,
    tabId,
    useShallow = false,
}: UseViewerDataOptions): UseViewerDataResult {
    const [folderInfo, setFolderInfo] = useState<FolderInfo | null>(null);
    const [images, setImages] = useState<ImageInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!folderPath || !isActive) {
            return;
        }

        let cancelled = false;

        const loadData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const [folder, imageList] = await Promise.all([
                    useShallow
                        ? AppAPI.getFolderInfoShallow(folderPath)
                        : AppAPI.getFolderInfo(folderPath),
                    useShallow
                        ? AppAPI.getImagesShallow(folderPath)
                        : AppAPI.getImages(folderPath),
                ]);

                if (cancelled) return;

                if (folder) {
                    setFolderInfo(folder);
                }
                if (imageList) {
                    setImages(imageList);
                }
            } catch (err) {
                if (cancelled) return;
                console.error('[useViewerData] Failed to load data:', err);
                setError(err instanceof Error ? err : new Error('Failed to load viewer data'));
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadData();

        return () => {
            cancelled = true;
        };
    }, [folderPath, isActive, useShallow]);

    return { folderInfo, images, isLoading, error };
}
