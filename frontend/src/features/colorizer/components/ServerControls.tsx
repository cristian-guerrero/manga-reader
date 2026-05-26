import { useTranslation } from 'react-i18next';
import { Toggle } from '@shared/components';
import type { colorizer } from '../../../../wailsjs/go/models';

interface ServerControlsProps {
  isServerRunning: boolean;
  isStarting: boolean;
  status: colorizer.InstallProgress;
  useDefaultFolder: boolean;
  onStart: () => void;
  onStop: () => void;
  onToggleDefaultFolder: () => void;
}

export function ServerControls({
  isServerRunning,
  isStarting,
  status,
  useDefaultFolder,
  onStart,
  onStop,
  onToggleDefaultFolder,
}: ServerControlsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      {isServerRunning ? (
        <button
          onClick={onStop}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ backgroundColor: 'var(--color-danger)', color: 'white' }}
        >
          {t('colorizer.stop')}
        </button>
      ) : (
        <button
          onClick={onStart}
          disabled={isStarting}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--color-success)',
            color: 'white',
            opacity: isStarting ? 0.6 : 1,
          }}
        >
          {isStarting ? t('colorizer.status.starting_server') : t('colorizer.start')}
        </button>
      )}

      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
        style={{
          backgroundColor: isServerRunning ? 'rgba(34, 197, 94, 0.1)' : 'var(--color-surface-tertiary)',
          color: isServerRunning ? 'rgb(34, 197, 94)' : 'var(--color-text-secondary)',
        }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: isServerRunning ? 'rgb(34, 197, 94)' : 'var(--color-text-muted)',
          }}
        />
        {t(`colorizer.status.${status.status}`)}
      </div>

      <div
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={onToggleDefaultFolder}
        title={
          useDefaultFolder
            ? t('colorizer.defaultFolderOnDesc') || 'Saving to _colorized folder next to originals'
            : t('colorizer.defaultFolderOffDesc') || 'Will ask where to save'
        }
      >
        <Toggle checked={useDefaultFolder} onChange={onToggleDefaultFolder} />
        <span
          className="text-sm font-medium whitespace-nowrap"
          style={{
            color: useDefaultFolder ? 'var(--color-accent)' : 'var(--color-text-muted)',
          }}
        >
          {useDefaultFolder
            ? t('colorizer.defaultFolderOn') || 'Auto'
            : t('colorizer.defaultFolderOff') || 'Manual'}
        </span>
      </div>
    </div>
  );
}
