import { useTranslation } from 'react-i18next';
import { Tooltip } from '@shared/components';
import type { ColorizeSettings } from '../types';

interface ActionBarProps {
  settings: ColorizeSettings;
  onSettingsChange: (key: keyof ColorizeSettings, value: boolean | number) => void;
  canColorize: boolean;
  hasColorizedImage: boolean;
  hasColorizedImagesToDownload: boolean;
  hasImages: boolean;
  isServerRunning: boolean;
  isColorizing: boolean;
  isColorizingAll: boolean;
  colorizeAllProgress: { current: number; total: number };
  onColorize: () => void;
  onColorizeAll: () => void;
  onDownload: () => void;
  onDownloadAll: () => void;
}

export function ActionBar({
  settings,
  onSettingsChange,
  canColorize,
  hasColorizedImage,
  hasColorizedImagesToDownload,
  hasImages,
  isServerRunning,
  isColorizing,
  isColorizingAll,
  onColorize,
  onColorizeAll,
  onDownload,
  onDownloadAll,
}: ActionBarProps) {
  const { t } = useTranslation();

  const isProcessing = isColorizing || isColorizingAll;

  return (
    <div
      className="flex items-center justify-between px-6 py-3 border-t flex-shrink-0"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface-secondary)',
      }}
    >
      <div className="flex items-center gap-4">
        <Tooltip content={t('colorizer.settings.colorize_desc')} placement="top">
          <label
            className="flex items-center gap-2 text-sm cursor-pointer"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <input
              type="checkbox"
              checked={settings.colorize}
              onChange={(e) => onSettingsChange('colorize', e.target.checked)}
              className="rounded"
              disabled={isProcessing}
            />
            {t('colorizer.settings.colorize')}
          </label>
        </Tooltip>
        <Tooltip content={t('colorizer.settings.upscale_desc')} placement="top">
          <label
            className="flex items-center gap-2 text-sm cursor-pointer"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <input
              type="checkbox"
              checked={settings.upscale}
              onChange={(e) => onSettingsChange('upscale', e.target.checked)}
              className="rounded"
              disabled={isProcessing}
            />
            {t('colorizer.settings.upscale')}
          </label>
        </Tooltip>
        <Tooltip content={t('colorizer.settings.denoise_desc')} placement="top">
          <label
            className="flex items-center gap-2 text-sm cursor-pointer"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <input
              type="checkbox"
              checked={settings.denoise}
              onChange={(e) => onSettingsChange('denoise', e.target.checked)}
              className="rounded"
              disabled={isProcessing}
            />
            {t('colorizer.settings.denoise')}
          </label>
        </Tooltip>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onColorize}
          disabled={!canColorize}
          className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: canColorize ? 'var(--color-accent)' : 'var(--color-surface-tertiary)',
            color: canColorize ? 'white' : 'var(--color-text-muted)',
            opacity: canColorize ? 1 : 0.5,
          }}
        >
          {isColorizing ? t('common.processing') : t('colorizer.colorize')}
        </button>
        <button
          onClick={onColorizeAll}
          disabled={!isServerRunning || !hasImages || isColorizingAll}
          className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: isServerRunning && hasImages ? 'var(--color-accent)' : 'var(--color-surface-tertiary)',
            color: isServerRunning && hasImages ? 'white' : 'var(--color-text-muted)',
            opacity: isServerRunning && hasImages ? 1 : 0.5,
          }}
        >
          {t('colorizer.colorizeAll')}
        </button>
        <button
          onClick={onDownload}
          disabled={!hasColorizedImage}
          className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: hasColorizedImage ? 'var(--color-success)' : 'var(--color-surface-tertiary)',
            color: hasColorizedImage ? 'white' : 'var(--color-text-muted)',
            opacity: hasColorizedImage ? 1 : 0.5,
          }}
        >
          {t('colorizer.download')}
        </button>
        <button
          onClick={onDownloadAll}
          disabled={!hasColorizedImagesToDownload}
          className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: hasColorizedImagesToDownload ? 'var(--color-success)' : 'var(--color-surface-tertiary)',
            color: hasColorizedImagesToDownload ? 'white' : 'var(--color-text-muted)',
            opacity: hasColorizedImagesToDownload ? 1 : 0.5,
          }}
        >
          {t('colorizer.downloadAll')}
        </button>
      </div>
    </div>
  );
}
