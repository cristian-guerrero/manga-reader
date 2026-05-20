import { useTranslation } from 'react-i18next';
import { SectionHeader } from '@shared/components';
import { Toggle } from '@shared/components';
import { SettingRow } from './SettingRow';
import { useSettingsStore } from '@stores/settingsStore';
import { useUpdaterStore } from '@stores/updaterStore';

export function UpdateSection() {
  const { t } = useTranslation();
  const { autoUpdate, setAutoUpdate, updateChannel, setUpdateChannel } = useSettingsStore();
  const { currentVersion, updateState, isChecking, checkForUpdate, updateInfo } = useUpdaterStore();

  return (
    <section className="animate-slide-up" style={{ animationDelay: '0.45s' }}>
      <SectionHeader title={t('updater.title', 'Updates')} />

      <SettingRow label={t('updater.currentVersion', 'Current Version')}>
        <span className="text-sm font-mono" style={{ color: 'var(--color-text-secondary)' }}>
          {currentVersion}
        </span>
      </SettingRow>

      <SettingRow
        label={t('updater.autoUpdate', 'Auto Update')}
        description={t('updater.autoUpdateDesc', 'Automatically check and download updates in the background')}
      >
        <Toggle checked={autoUpdate} onChange={setAutoUpdate} />
      </SettingRow>

      {autoUpdate && (
        <>
          <SettingRow label={t('updater.channel', 'Update Channel')}>
            <select
              value={updateChannel}
              onChange={(e) => setUpdateChannel(e.target.value)}
              className="px-3 py-1.5 rounded text-sm"
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <option value="stable">{t('updater.stable', 'Stable')}</option>
              <option value="dev">{t('updater.dev', 'Dev (Latest)')}</option>
            </select>
          </SettingRow>

          <SettingRow label={t('updater.status', 'Status')}>
            <div className="flex items-center gap-2">
              {updateState.pending ? (
                <span className="text-xs" style={{ color: 'var(--color-success, #22c55e)' }}>
                  {t('updater.downloaded', 'Update ready — will install on next restart')}
                </span>
              ) : updateInfo?.available ? (
                <span className="text-xs" style={{ color: 'var(--color-accent)' }}>
                  {t('updater.available', '{{version}} available', { version: updateInfo.version })}
                </span>
              ) : (
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {t('updater.upToDate', 'Up to date')}
                </span>
              )}
              <button
                onClick={checkForUpdate}
                disabled={isChecking}
                className="text-xs px-2 py-1 rounded"
                style={{
                  color: 'var(--color-accent)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {isChecking ? t('common.loading', 'Checking...') : t('updater.check', 'Check')}
              </button>
            </div>
          </SettingRow>
        </>
      )}
    </section>
  );
}
