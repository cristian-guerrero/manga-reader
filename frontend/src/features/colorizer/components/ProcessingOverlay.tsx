import { useTranslation } from 'react-i18next';
import type { colorizer } from '../../../../wailsjs/go/models';

interface ProcessingOverlayProps {
  isColorizing: boolean;
  isColorizingAll: boolean;
  status: colorizer.InstallProgress;
  colorizeAllProgress: { current: number; total: number };
  currentProcessingImage: string | null;
  currentImage: string | null;
  onCancel: () => void;
}

export function ProcessingOverlay({
  isColorizing,
  isColorizingAll,
  status,
  colorizeAllProgress,
  currentProcessingImage,
  currentImage,
  onCancel,
}: ProcessingOverlayProps) {
  const { t } = useTranslation();

  if (!isColorizing && !isColorizingAll) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/95 rounded-lg z-20">
      <div className="text-center px-8 min-w-[300px]">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />

        <div className="text-white font-bold text-xl mb-2">
          {isColorizingAll
            ? t('colorizer.processingAll') || 'Processing All Images'
            : t('colorizer.colorizing') || 'Colorizing Image'}
        </div>

        {(status.message || currentProcessingImage || currentImage) && (
          <div className="text-gray-300 text-base mb-4">
            {status.message || currentProcessingImage || currentImage?.split('/').pop() || 'Please wait...'}
          </div>
        )}

        {isColorizingAll && (
          <div className="mt-4">
            <div className="text-white font-semibold text-lg mb-2">
              {colorizeAllProgress.current} / {colorizeAllProgress.total}
            </div>
            <div className="w-64 h-3 bg-gray-700 rounded-full mx-auto overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{
                  width: `${colorizeAllProgress.total > 0 ? (colorizeAllProgress.current / colorizeAllProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
            <button
              onClick={onCancel}
              className="mt-4 px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: 'var(--color-danger)', color: 'white' }}
            >
              {t('common.cancel') || 'Cancel'}
            </button>
          </div>
        )}

        <div className="mt-6 text-gray-500 text-sm">
          {isColorizingAll
            ? t('colorizer.dontClose') || "Don't close this window"
            : t('colorizer.pleaseWait') || 'Please wait while we prepare your content'}
        </div>
      </div>
    </div>
  );
}
