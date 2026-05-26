import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@shared/components';
import { ColorizerAPI } from '@services/api/colorizerAPI';
import type { DownloadItem, DownloadState } from '../types';

const IDLE_STATE: DownloadState = {
  status: 'idle', message: '', savedFiles: [], progress: { current: 0, total: 0 },
};

export function useColorizerDownload(
  droppedImages: { path: string; name: string }[],
  currentImage: string | null,
  colorizedCache: Record<string, string>,
  useDefaultFolder: boolean,
) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [downloadState, setDownloadState] = useState<DownloadState>(IDLE_STATE);
  const [singleItem, setSingleItem] = useState<DownloadItem | undefined>();
  const [multipleItems, setMultipleItems] = useState<DownloadItem[] | undefined>();

  const currentColorizedImage = currentImage ? colorizedCache[currentImage] : null;

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setDownloadState(IDLE_STATE);
    setSingleItem(undefined);
    setMultipleItems(undefined);
  }, []);

  const saveOne = useCallback(async (item: DownloadItem): Promise<string | null> => {
    return useDefaultFolder
      ? ColorizerAPI.saveColorizedImageAuto(item.base64Data, item.fileName, item.originalPath)
      : ColorizerAPI.saveColorizedImage(item.base64Data, item.fileName);
  }, [useDefaultFolder]);

  const saveMultiple = useCallback(async (items: DownloadItem[]): Promise<string[] | null> => {
    const payload = items.map(i => ({ base64Data: i.base64Data, fileName: i.fileName }));
    if (useDefaultFolder) {
      const sourcePaths = items.map(i => i.originalPath);
      return ColorizerAPI.saveMultipleColorizedImagesAuto(payload, sourcePaths);
    }
    return ColorizerAPI.saveMultipleColorizedImages(payload);
  }, [useDefaultFolder]);

  const executeDownload = useCallback(async () => {
    if (singleItem) {
      setDownloadState(prev => ({
        ...prev, status: 'saving', message: t('colorizer.downloadDialog.saving') || 'Saving...',
        progress: { current: 0, total: 1 },
      }));
      try {
        const savedPath = await saveOne(singleItem);
        if (savedPath) {
          setDownloadState({
            status: 'success',
            message: t('colorizer.downloadDialog.savedTo', { path: savedPath }) || `Saved to ${savedPath}`,
            savedFiles: [savedPath],
            progress: { current: 1, total: 1 },
          });
        } else {
          setDownloadState(prev => ({ ...prev, status: 'cancelled', message: t('colorizer.downloadDialog.cancelled') || 'Download cancelled' }));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Download failed';
        setDownloadState(prev => ({ ...prev, status: 'error', message: msg }));
      }
    } else if (multipleItems && multipleItems.length > 0) {
      const total = multipleItems.length;
      setDownloadState(prev => ({
        ...prev, status: 'saving', message: t('colorizer.downloadDialog.selectingFolder') || 'Select destination folder...',
        progress: { current: 0, total },
      }));
      try {
        const savedPaths = await saveMultiple(multipleItems);
        if (!savedPaths || savedPaths.length === 0) {
          setDownloadState(prev => ({ ...prev, status: 'cancelled', message: t('colorizer.downloadDialog.cancelled') || 'Download cancelled' }));
          return;
        }
        const savedCount = savedPaths.length;
        setDownloadState({
          status: 'success',
          message: savedCount < total
            ? t('colorizer.downloadDialog.savedSome', { count: savedCount, total }) || `Saved ${savedCount}/${total} images`
            : t('colorizer.downloadDialog.savedAllTo', { count: savedCount }) || `${savedCount} images saved successfully`,
          savedFiles: savedPaths,
          progress: { current: savedCount, total },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Download failed';
        setDownloadState(prev => ({ ...prev, status: 'error', message: msg }));
      }
    }
  }, [singleItem, multipleItems, saveOne, saveMultiple, t]);

  const handleDownload = useCallback(() => {
    if (!currentColorizedImage || !currentImage) {
      showToast('No colorized image to download', 'info');
      return;
    }

    const item: DownloadItem = {
      base64Data: currentColorizedImage,
      fileName: `colorized_${currentImage.split(/[\\/]/).pop() || 'manga'}.png`,
      originalPath: currentImage,
    };

    setSingleItem(item);
    setMultipleItems(undefined);

    if (useDefaultFolder) {
      setDownloadState({
        status: 'saving', message: t('colorizer.downloadDialog.saving') || 'Saving...',
        savedFiles: [], progress: { current: 0, total: 1 },
      });
      setDialogOpen(true);
      saveOne(item).then(savedPath => {
        if (savedPath) {
          setDownloadState({
            status: 'success',
            message: t('colorizer.downloadDialog.savedTo', { path: savedPath }) || `Saved to ${savedPath}`,
            savedFiles: [savedPath], progress: { current: 1, total: 1 },
          });
        } else {
          setDownloadState(prev => ({ ...prev, status: 'cancelled', message: t('colorizer.downloadDialog.cancelled') || 'Download cancelled' }));
        }
      }).catch(err => {
        const msg = err instanceof Error ? err.message : 'Download failed';
        setDownloadState(prev => ({ ...prev, status: 'error', message: msg }));
      });
    } else {
      setDownloadState(IDLE_STATE);
      setDialogOpen(true);
    }
  }, [currentColorizedImage, currentImage, useDefaultFolder, saveOne, showToast, t]);

  const handleDownloadAll = useCallback(() => {
    const colorizedImages = droppedImages.filter(img => colorizedCache[img.path]);
    if (colorizedImages.length === 0) {
      showToast('No colorized images to download', 'info');
      return;
    }

    const items: DownloadItem[] = colorizedImages.map(img => ({
      base64Data: colorizedCache[img.path],
      fileName: `colorized_${img.name}`,
      originalPath: img.path,
    }));

    setMultipleItems(items);
    setSingleItem(undefined);

    if (useDefaultFolder) {
      const total = items.length;
      setDownloadState({
        status: 'saving', message: t('colorizer.downloadDialog.saving') || 'Saving...',
        savedFiles: [], progress: { current: 0, total },
      });
      setDialogOpen(true);
      saveMultiple(items).then(savedPaths => {
        if (!savedPaths || savedPaths.length === 0) {
          setDownloadState(prev => ({ ...prev, status: 'cancelled', message: t('colorizer.downloadDialog.cancelled') || 'Download cancelled' }));
          return;
        }
        const savedCount = savedPaths.length;
        setDownloadState({
          status: 'success',
          message: savedCount < total
            ? t('colorizer.downloadDialog.savedSome', { count: savedCount, total }) || `Saved ${savedCount}/${total} images`
            : t('colorizer.downloadDialog.savedAllTo', { count: savedCount }) || `${savedCount} images saved successfully`,
          savedFiles: savedPaths,
          progress: { current: savedCount, total },
        });
      }).catch(err => {
        const msg = err instanceof Error ? err.message : 'Download failed';
        setDownloadState(prev => ({ ...prev, status: 'error', message: msg }));
      });
    } else {
      setDownloadState(IDLE_STATE);
      setDialogOpen(true);
    }
  }, [droppedImages, colorizedCache, useDefaultFolder, saveMultiple, showToast, t]);

  return {
    currentColorizedImage,
    dialogOpen,
    downloadState,
    singleItem,
    multipleItems,
    handleDownload,
    handleDownloadAll,
    executeDownload,
    closeDialog,
  };
}
