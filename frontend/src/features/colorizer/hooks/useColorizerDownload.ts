import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@shared/components';
import { ColorizerAPI } from '@services/api/colorizerAPI';

export function useColorizerDownload(
  droppedImages: { path: string; name: string }[],
  currentImage: string | null,
  colorizedCache: Record<string, string>,
  useDefaultFolder: boolean,
) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const currentColorizedImage = currentImage ? colorizedCache[currentImage] : null;

  const downloadItem = useCallback(async (
    base64Data: string,
    fileName: string,
    originalPath: string,
  ): Promise<string | null> => {
    if (useDefaultFolder) {
      return ColorizerAPI.saveColorizedImageAuto(base64Data, fileName, originalPath);
    }
    return ColorizerAPI.saveColorizedImage(base64Data, fileName);
  }, [useDefaultFolder]);

  const handleDownload = useCallback(async () => {
    if (!currentColorizedImage) {
      showToast('No colorized image to download', 'info');
      return;
    }
    if (!currentImage) return;

    const suggestedName = `colorized_${currentImage.split(/[\\/]/).pop() || 'manga'}.png`;

    try {
      const savedPath = await downloadItem(currentColorizedImage, suggestedName, currentImage);
      if (savedPath) {
        showToast(
          t('colorizer.downloadDialog.savedTo', { path: savedPath }) || `Saved to ${savedPath}`,
          'success',
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      showToast(msg, 'error');
    }
  }, [currentColorizedImage, currentImage, downloadItem, showToast, t]);

  const handleDownloadAll = useCallback(async () => {
    const colorizedImages = droppedImages.filter((img) => colorizedCache[img.path]);
    if (colorizedImages.length === 0) {
      showToast('No colorized images to download', 'info');
      return;
    }

    const items = colorizedImages.map((img) => ({
      base64Data: colorizedCache[img.path],
      fileName: `colorized_${img.name}`,
    }));

    try {
      if (useDefaultFolder) {
        const sourcePaths = colorizedImages.map((img) => img.path);
        const savedPaths = await ColorizerAPI.saveMultipleColorizedImagesAuto(items, sourcePaths);
        if (savedPaths && savedPaths.length > 0) {
          showToast(
            t('colorizer.downloadDialog.savedAllTo', { count: savedPaths.length }) ||
            `${savedPaths.length} images saved to colorized folder`,
            'success',
          );
        }
      } else {
        const savedPaths = await ColorizerAPI.saveMultipleColorizedImages(items);
        if (savedPaths && savedPaths.length > 0) {
          showToast(
            t('colorizer.downloadDialog.savedAllTo', { count: savedPaths.length }) ||
            `${savedPaths.length} images saved successfully`,
            'success',
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      showToast(msg, 'error');
    }
  }, [droppedImages, colorizedCache, useDefaultFolder, showToast, t]);

  return {
    currentColorizedImage,
    handleDownload,
    handleDownloadAll,
  };
}
