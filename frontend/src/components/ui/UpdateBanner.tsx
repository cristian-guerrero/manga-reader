import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdaterStore } from '../../stores/updaterStore';
import { useSettingsStore } from '../../stores/settingsStore';

export function UpdateBanner() {
  const { t } = useTranslation();
  const autoUpdate = useSettingsStore((s) => s.autoUpdate);
  const { currentVersion, updateInfo, updateState, isChecking, updatedRecently, dismissUpdated, checkForUpdate, downloadUpdate, isDownloading, init } =
    useUpdaterStore();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (autoUpdate) {
      checkForUpdate();
    }
  }, [autoUpdate, checkForUpdate]);

  if (updatedRecently) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-slide-in-right"
        style={{
          backgroundColor: 'var(--color-surface-elevated)',
          border: '1px solid var(--color-border)',
          borderLeft: '4px solid var(--color-success, #22c55e)',
        }}
      >
        <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {t('updater.updated', 'App updated successfully')}
        </span>
        <button
          onClick={dismissUpdated}
          className="ml-2 text-xs px-2 py-1 rounded"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {t('common.close', 'Close')}
        </button>
      </div>
    );
  }

  if (!updateInfo?.available) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-slide-in-right"
      style={{
        backgroundColor: 'var(--color-surface-elevated)',
        border: '1px solid var(--color-border)',
        borderLeft: '4px solid var(--color-accent)',
      }}
    >
      <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
        {t('updater.available', '{{version}} available', { version: updateInfo.version })}
      </span>
      {updateState.pending ? (
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {t('updater.downloaded', 'Ready to install')}
        </span>
      ) : (
        <button
          onClick={downloadUpdate}
          disabled={isDownloading}
          className="text-xs px-3 py-1 rounded font-medium transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-on-accent, #fff)',
          }}
        >
          {isDownloading ? t('common.loading', 'Downloading...') : t('updater.download', 'Download')}
        </button>
      )}
    </div>
  );
}
