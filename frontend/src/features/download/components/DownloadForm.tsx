/**
 * DownloadForm - Form component for starting downloads
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@stores';
import { Button, Toggle } from '@shared/components';

interface DownloadFormProps {
    onStartDownload: (url: string) => void;
    isLoading: boolean;
    onSelectPath: () => void;
    downloadPath: string;
}

export function DownloadForm({ onStartDownload, isLoading, onSelectPath, downloadPath }: DownloadFormProps) {
    const { t } = useTranslation();
    const settings = useSettingsStore();
    const { updateSettings } = settings;
    const [url, setUrl] = useState('');

    return (
        <section className="card p-6 mb-8 flex flex-col gap-4">
            <div className="flex gap-4">
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={t('download.urlPlaceholder')}
                    className="input flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && onStartDownload(url)}
                />
                <Button
                    onClick={() => onStartDownload(url)}
                    disabled={isLoading || !url}
                    variant="primary"
                    className="px-8"
                    isLoading={isLoading}
                >
                    {t('download.startDownload')}
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Toggle
                        checked={settings.clipboardAutoMonitor}
                        onChange={(val) => updateSettings({ clipboardAutoMonitor: val })}
                    />
                    <span 
                        className="text-sm cursor-pointer" 
                        onClick={() => updateSettings({ clipboardAutoMonitor: !settings.clipboardAutoMonitor })} 
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {t('download.autoMonitor')}
                    </span>
                </div>

                <div className="h-4 w-px bg-gray-700 mx-2" />

                <div className="flex items-center gap-2">
                    <Toggle
                        checked={settings.autoResumeDownloads || false}
                        onChange={(val) => updateSettings({ autoResumeDownloads: val })}
                    />
                    <span 
                        className="text-sm cursor-pointer" 
                        onClick={() => updateSettings({ autoResumeDownloads: !(settings.autoResumeDownloads || false) })} 
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {t('download.autoResume') || 'Auto-resume downloads'}
                    </span>
                </div>

                <div className="h-4 w-px bg-gray-700 mx-2" />

                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    <span className="text-sm shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('folders.title')}:
                    </span>
                    <span className="text-sm truncate font-mono" style={{ color: 'var(--color-text-primary)' }}>
                        {downloadPath}
                    </span>
                    <button
                        onClick={onSelectPath}
                        className="text-sm font-medium hover:underline ml-auto shrink-0"
                        style={{ color: 'var(--color-accent)' }}
                    >
                        {t('common.edit')}
                    </button>
                </div>
            </div>
        </section>
    );
}
