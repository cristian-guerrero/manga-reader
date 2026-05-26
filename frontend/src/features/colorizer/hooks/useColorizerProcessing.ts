import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@shared/components';
import { useNavigation } from '@hooks';
import { ColorizerAPI } from '@services/api/colorizerAPI';
import type { ImageFile } from './useColorizerImages';
import type { ColorizeSettings } from '../types';

export function useColorizerProcessing(
  serverRunning: boolean,
  settings: ColorizeSettings,
  droppedImages: ImageFile[],
  currentImage: string | null,
  onCacheUpdate: (updater: (prev: Record<string, string>) => Record<string, string>) => void,
) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { setIsProcessing } = useNavigation();

  const [isColorizing, setIsColorizing] = useState(false);
  const [isColorizingAll, setIsColorizingAll] = useState(false);
  const [colorizeAllProgress, setColorizeAllProgress] = useState({ current: 0, total: 0 });
  const [currentProcessingImage, setCurrentProcessingImage] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const colorizeOne = useCallback(async (path: string, fileName: string): Promise<string | null> => {
    const result = await ColorizerAPI.colorizeImage(
      path, settings.colorize, settings.upscale, settings.denoise,
      settings.denoiseSigma, settings.upscaleFactor,
    );
    if (result?.success && result.output_base64) {
      return result.output_base64.startsWith('data:')
        ? result.output_base64
        : `data:image/png;base64,${result.output_base64}`;
    }
    return null;
  }, [settings]);

  const handleColorize = useCallback(async () => {
    if (!currentImage) {
      showToast('No image selected', 'info');
      return;
    }
    if (!serverRunning) {
      showToast(t('colorizer.notRunning'), 'info');
      return;
    }

    try {
      setIsColorizing(true);
      const fileName = currentImage.split(/[\\/]/).pop() || 'current image';
      setCurrentProcessingImage(fileName);

      const imgSrc = await colorizeOne(currentImage, fileName);

      if (imgSrc) {
        onCacheUpdate((prev) => ({ ...prev, [currentImage]: imgSrc }));
        showToast('Colorization complete!', 'success');
      } else {
        showToast('Colorization failed', 'error');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Colorization failed';
      showToast(msg, 'error');
    } finally {
      setIsColorizing(false);
      setIsProcessing(false);
      setCurrentProcessingImage(null);
    }
  }, [currentImage, serverRunning, colorizeOne, showToast, t, onCacheUpdate, setIsProcessing]);

  const handleColorizeAll = useCallback(async () => {
    if (droppedImages.length === 0) {
      showToast('No images to colorize', 'info');
      return;
    }
    if (!serverRunning) {
      showToast(t('colorizer.notRunning'), 'info');
      return;
    }

    cancelRef.current = false;
    let wasCancelled = false;

    try {
      setIsColorizingAll(true);
      setColorizeAllProgress({ current: 0, total: droppedImages.length });

      const newCache: Record<string, string> = {};
      let successCount = 0;

      for (let i = 0; i < droppedImages.length; i++) {
        if (cancelRef.current) {
          wasCancelled = true;
          break;
        }

        const img = droppedImages[i];
        setColorizeAllProgress({ current: i + 1, total: droppedImages.length });
        setCurrentProcessingImage(img.name);

        try {
          const imgSrc = await colorizeOne(img.path, img.name);
          if (imgSrc) {
            newCache[img.path] = imgSrc;
            successCount++;
          }
        } catch (e) {
          console.error(`Failed to colorize ${img.name}:`, e);
        }
      }

      onCacheUpdate((prev) => ({ ...prev, ...newCache }));

      if (wasCancelled) {
        showToast(`Cancelled after ${colorizeAllProgress.current} image(s)`, 'info');
      } else {
        showToast(`Colorized ${successCount}/${droppedImages.length} image(s)`, 'success');
      }

      try {
        await ColorizerAPI.restartServer();
        showToast('Server restarted due to memory cleanup', 'info');
      } catch {
        console.warn('Failed to restart server after colorize all');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Colorization failed';
      showToast(msg, 'error');
    } finally {
      setIsColorizingAll(false);
      setIsProcessing(false);
      setColorizeAllProgress({ current: 0, total: 0 });
      setCurrentProcessingImage(null);
    }
  }, [droppedImages, serverRunning, colorizeOne, showToast, t, onCacheUpdate, setIsProcessing]);

  const handleCancelColorize = useCallback(() => {
    cancelRef.current = true;
  }, []);

  return {
    isColorizing,
    isColorizingAll,
    colorizeAllProgress,
    currentProcessingImage,
    handleColorize,
    handleColorizeAll,
    handleCancelColorize,
  };
}
