import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionHeader, Toggle, Tooltip } from '@shared/components';
import { SettingRow } from './SettingRow';
import * as AppBackend from '../../../../wailsjs/go/main/App';

export function NetworkServerSection() {
    const { t } = useTranslation();
    const [isRunning, setIsRunning] = useState(false);
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        refreshStatus();
    }, []);

    const refreshStatus = useCallback(async () => {
        try {
            const running = await AppBackend.GetLocalNetworkServerStatus();
            setIsRunning(running);
            if (running) {
                const addr = await AppBackend.GetLocalNetworkAddress();
                setAddress(addr);
            } else {
                setAddress('');
            }
        } catch {
            setIsRunning(false);
            setAddress('');
        }
    }, []);

    const handleToggle = useCallback(async (checked: boolean) => {
        setIsRunning(checked);
        setLoading(true);
        try {
            await AppBackend.ToggleLocalNetworkServer(checked);
            await refreshStatus();
        } catch (err) {
            console.error('[NetworkServer] Toggle failed:', err);
            await refreshStatus();
        } finally {
            setLoading(false);
        }
    }, [refreshStatus]);

    const handleCopy = useCallback(async () => {
        if (!address) return;
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = address;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [address]);

    return (
        <section className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <SectionHeader title={t('networkServer.title', 'Network Server')} />
            <SettingRow
                label={t('networkServer.enable', 'Enable Network Server')}
                description={t('networkServer.enableDesc', 'Serve the app on your local network so other devices can access it via browser.')}
            >
                <Toggle
                    checked={isRunning}
                    onChange={handleToggle}
                    disabled={loading}
                />
            </SettingRow>
            {isRunning && address && (
                <div className="mt-2 px-4 py-2 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
                    <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('networkServer.address', 'Access from other devices')}:
                    </p>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-mono" style={{ color: 'var(--color-accent)' }}>
                            {address}
                        </p>
                    <Tooltip content={copied ? 'Copied!' : 'Copy URL'} placement="top">
                        <button
                            onClick={handleCopy}
                            className="p-1.5 rounded-md transition-all duration-200 hover:scale-110 active:scale-95 flex-shrink-0"
                            style={{
                                background: copied ? 'var(--color-success)' : 'var(--color-surface-tertiary)',
                                color: copied ? '#fff' : 'var(--color-text-secondary)',
                            }}
                        >
                            {copied ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                            )}
                        </button>
                    </Tooltip>
                    </div>
                </div>
            )}
        </section>
    );
}
