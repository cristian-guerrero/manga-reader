/**
/**
 * AdvancedSection - Advanced settings section
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionHeader } from '@shared/components';
import { Toggle } from '@shared/components';
import { SettingRow } from './SettingRow';
import * as AppBackend from '../../../../wailsjs/go/main/App';
import type { SettingsState } from '@stores/settingsStore';

interface AdvancedSectionProps {
  settings: Pick<SettingsState,
    'showImageInfo' | 'setShowImageInfo' |
    'enableHistory' | 'setEnableHistory' |
    'minImageSize' | 'setMinImageSize' |
    'processDroppedFolders' | 'setProcessDroppedFolders' |
    'generateThumbnails' | 'setGenerateThumbnails'
  >;
}

export function AdvancedSection({ settings }: AdvancedSectionProps) {
  const { t } = useTranslation();
  const [avifStatus, setAvifStatus] = useState<string>('');

  useEffect(() => {
    AppBackend.GetAVIFStatus().then((s: string) => setAvifStatus(s));
  }, []);

  return (
    <section className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
      <SectionHeader title={t('settings.advanced', 'Advanced')} />

      <SettingRow label={t('settings.avifStatus', 'AVIF Decoding')}>
        <span
          className="text-sm font-medium"
          style={{
            color: avifStatus === 'native'
              ? 'var(--color-success, #22c55e)'
              : 'var(--color-text-secondary)',
          }}
        >
          {avifStatus === 'native'
            ? t('settings.avifNative', 'Native (Fast)')
            : avifStatus === 'wasm'
              ? t('settings.avifWasm', 'WASM (Normal)')
              : t('common.loading', 'Loading...')}
        </span>
      </SettingRow>

      <SettingRow label={t('settings.showImageInfo', 'Show Image Info')}>
        <Toggle
          checked={settings.showImageInfo}
          onChange={settings.setShowImageInfo}
        />
      </SettingRow>

      <SettingRow label={t('settings.enableHistory')}>
        <Toggle
          checked={settings.enableHistory}
          onChange={settings.setEnableHistory}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.minImageSize')}
        description={t('settings.minImageSizeDesc')}
      >
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="500"
            step="10"
            value={settings.minImageSize}
            onChange={(e) => settings.setMinImageSize(Number(e.target.value))}
            className="flex-1 max-w-32"
          />
          <span
            className="text-sm font-medium w-16 text-right"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {settings.minImageSize > 0 ? `${settings.minImageSize} KB` : t('common.off', 'Off')}
          </span>
        </div>
      </SettingRow>

      <SettingRow label={t('settings.processDroppedFolders')}>
        <Toggle
          checked={settings.processDroppedFolders}
          onChange={settings.setProcessDroppedFolders}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.generateThumbnails')}
        description={t('settings.generateThumbnailsDesc')}
      >
        <Toggle
          checked={settings.generateThumbnails}
          onChange={settings.setGenerateThumbnails}
        />
      </SettingRow>
    </section>
  );
}
