import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@shared/components';
import { useNavigation } from '@hooks';
import { ColorizerAPI } from '@services/api/colorizerAPI';
import { OnFileDrop, OnFileDropOff } from '../../../../wailsjs/runtime';

export interface ImageFile {
  path: string;
  name: string;
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff'];

function isImageFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase();
  return !!ext && IMAGE_EXTENSIONS.includes(`.${ext}`);
}

function extractFileName(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

export function useColorizerImages() {
  const { showToast } = useToast();
  const { navigate, params, setParams } = useNavigation();

  const [droppedImages, setDroppedImages] = useState<ImageFile[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentImagePreview, setCurrentImagePreview] = useState<string | null>(null);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  const loadPreview = useCallback(async (path: string | null) => {
    if (!path) {
      setCurrentImagePreview(null);
      return;
    }
    try {
      const base64 = await ColorizerAPI.loadImageAsBase64(path);
      setCurrentImagePreview(base64);
    } catch {
      setCurrentImagePreview(null);
    }
  }, []);

  useEffect(() => {
    loadPreview(currentImage);
  }, [currentImage, loadPreview]);

  const selectImage = useCallback((path: string) => {
    setCurrentImage(path);
  }, []);

  // Register drag and drop
  useEffect(() => {
    OnFileDrop(async (_x, _y, paths) => {
      if (!paths || paths.length === 0) return;

      try {
        setIsLoadingImages(true);
        const newImages: ImageFile[] = [];

        for (const p of paths) {
          const resolved = await ColorizerAPI.resolveFolder(p);
          try {
            const entries = await ColorizerAPI.exploreFolder(resolved, '', 'asc');
            for (const entry of entries) {
              if (!entry.isDirectory && entry.hasImages) {
                newImages.push({
                  path: entry.coverImage || entry.path,
                  name: entry.name,
                });
              }
            }
          } catch {
            if (isImageFile(p)) {
              newImages.push({ path: p, name: extractFileName(p) });
            }
          }
        }

        if (newImages.length > 0) {
          setDroppedImages((prev) => [...prev, ...newImages]);
          setCurrentImage((prev) => prev || newImages[0].path);
          showToast(`Added ${newImages.length} image(s)`, 'success');
        } else {
          showToast('No images found in dropped items', 'info');
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to process files';
        showToast(msg, 'error');
      } finally {
        setIsLoadingImages(false);
      }
    }, false);

    return () => {
      OnFileDropOff();
    };
  }, [showToast]);

  // Load images from navigation params (e.g., from Explorer context menu)
  useEffect(() => {
    const folderPath = params?.folderPath;
    if (!folderPath || droppedImages.length > 0) return;

    const load = async () => {
      try {
        setIsLoadingImages(true);
        const entries = await ColorizerAPI.exploreFolder(folderPath, '', 'asc');
        const newImages: ImageFile[] = [];
        for (const entry of entries) {
          if (!entry.isDirectory && entry.hasImages) {
            newImages.push({
              path: entry.coverImage || entry.path,
              name: entry.name,
            });
          }
        }
        if (newImages.length > 0) {
          setDroppedImages(newImages);
          setCurrentImage(newImages[0].path);
          showToast(`Loaded ${newImages.length} images from folder`, 'success');
        }
      } catch (e) {
        console.error('Failed to load folder images:', e);
        showToast('Failed to load folder images', 'error');
      } finally {
        setIsLoadingImages(false);
      }
    };

    load();
    setParams({});
  }, [params?.folderPath]);

  const selectFolder = useCallback(async () => {
    try {
      const path = await ColorizerAPI.selectFolder();
      if (path) {
        setIsLoadingImages(true);
        try {
          const entries = await ColorizerAPI.exploreFolder(path, '', 'asc');
          const newImages: ImageFile[] = [];
          for (const entry of entries) {
            if (!entry.isDirectory && entry.hasImages) {
              newImages.push({
                path: entry.coverImage || entry.path,
                name: entry.name,
              });
            }
          }
          if (newImages.length > 0) {
            setDroppedImages((prev) => [...prev, ...newImages]);
            setCurrentImage((prev) => prev || newImages[0].path);
            showToast(`Loaded ${newImages.length} images`, 'success');
          }
        } finally {
          setIsLoadingImages(false);
        }
      }
    } catch {
      // User cancelled
    }
  }, [showToast]);

  const clearImages = useCallback(() => {
    setDroppedImages([]);
    setCurrentImage(null);
    setCurrentImagePreview(null);
    showToast('Image list cleared', 'info');
  }, [showToast]);

  return {
    droppedImages,
    setDroppedImages,
    currentImage,
    selectImage,
    currentImagePreview,
    isLoadingImages,
    selectFolder,
    clearImages,
  };
}
