/**
 * SettingsDialogs - Confirmation dialogs for settings actions
 */

import { useTranslation } from 'react-i18next';
import { ConfirmDialog, HelpDialog } from '@shared/components';
import { Palette } from 'lucide-react';

interface SettingsDialogsProps {
    isResetOpen: boolean;
    onResetClose: () => void;
    onResetConfirm: () => void;
    isClearCacheOpen: boolean;
    onClearCacheClose: () => void;
    onClearCacheConfirm: () => void;
    isHelpOpen: boolean;
    onHelpClose: () => void;
}

export function SettingsDialogs({
    isResetOpen,
    onResetClose,
    onResetConfirm,
    isClearCacheOpen,
    onClearCacheClose,
    onClearCacheConfirm,
    isHelpOpen,
    onHelpClose,
}: SettingsDialogsProps) {
    const { t } = useTranslation();

    return (
        <>
            {/* Reset Settings Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isResetOpen}
                onClose={onResetClose}
                onConfirm={onResetConfirm}
                title={t('settings.resetSettings')}
                message={t('settings.confirmReset')}
                isDestructive={false}
                confirmText={t('common.confirm') || 'Confirm'}
                cancelText={t('common.cancel') || 'Cancel'}
                icon={
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 3v5h5"></path>
                    </svg>
                }
            />

            {/* Clear Cache Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isClearCacheOpen}
                onClose={onClearCacheClose}
                onConfirm={onClearCacheConfirm}
                title={t('settings.clearAllCache')}
                message={t('settings.confirmClearCache')}
                isDestructive={true}
                confirmText={t('common.confirm') || 'Confirm'}
                cancelText={t('common.cancel') || 'Cancel'}
                icon={
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                }
            />

            {/* Help Dialog */}
            <HelpDialog
                isOpen={isHelpOpen}
                onClose={onHelpClose}
                title={t('settings.help.title')}
            >
                <div>
                    <h4 className="font-semibold text-sm uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--color-accent)' }}>
                        <Palette className="w-4 h-4" />
                        {t('settings.help.appearance', 'Appearance')}
                    </h4>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('settings.help.appearanceDesc', 'Customize the look and feel of the application. Change themes and accent colors.')}
                    </p>
                </div>
            </HelpDialog>
        </>
    );
}
