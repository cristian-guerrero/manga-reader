/**
 * SettingsDialogs - Confirmation dialogs for settings actions
 */

import { useTranslation } from 'react-i18next';
import { ConfirmDialog, HelpDialog } from '@shared/components';
import { 
    Palette, 
    Monitor, 
    Eye, 
    Keyboard, 
    Settings2, 
    Layers, 
    RefreshCw, 
    AlertTriangle,
    Lightbulb,
    Wifi
} from 'lucide-react';

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

interface HelpSectionProps {
    icon: React.ReactNode;
    titleKey: string;
    descKey: string;
    tipKey: string;
    titleDefault: string;
    descDefault: string;
    tipDefault: string;
}

function HelpSection({ icon, titleKey, descKey, tipKey, titleDefault, descDefault, tipDefault }: HelpSectionProps) {
    const { t } = useTranslation();
    return (
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--color-accent)' }}>
                {icon}
                {t(titleKey, titleDefault)}
            </h4>
            <p className="text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {t(descKey, descDefault)}
            </p>
            <div className="flex items-start gap-2 p-2 rounded" style={{ backgroundColor: 'var(--color-surface-primary)' }}>
                <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {t(tipKey, tipDefault)}
                </p>
            </div>
        </div>
    );
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
                <div className="space-y-4">
                    <HelpSection
                        icon={<Palette className="w-4 h-4" />}
                        titleKey="settings.help.appearance"
                        descKey="settings.help.appearanceDesc"
                        tipKey="settings.help.appearanceTip"
                        titleDefault="Appearance"
                        descDefault="Customize the visual theme, accent color, language, and toggle which sections appear in the sidebar menu."
                        tipDefault="Each theme supports custom accent colors. Use the color picker to personalize your experience."
                    />

                    <HelpSection
                        icon={<Wifi className="w-4 h-4" />}
                        titleKey="settings.help.networkServer"
                        descKey="settings.help.networkServerDesc"
                        tipKey="settings.help.networkServerTip"
                        titleDefault="Network Server"
                        descDefault="Enable this to access Manga Visor from any device on your local network via browser."
                        tipDefault="Once enabled, other devices can connect using the displayed IP address. The server mirrors the full app functionality."
                    />

                    <HelpSection
                        icon={<Eye className="w-4 h-4" />}
                        titleKey="settings.help.viewer"
                        descKey="settings.help.viewerDesc"
                        tipKey="settings.help.viewerTip"
                        titleDefault="Viewer"
                        descDefault="Set the default viewer mode (vertical scroll or lateral page-flip), adjust vertical image width, and choose reading direction (LTR/RTL)."
                        tipDefault="Vertical mode is ideal for webtoons, while lateral mode mimics traditional manga reading. You can override the default per-tab."
                    />

                    <HelpSection
                        icon={<Keyboard className="w-4 h-4" />}
                        titleKey="settings.help.keyboard"
                        descKey="settings.help.keyboardDesc"
                        tipKey="settings.help.keyboardTip"
                        titleDefault="Keyboard"
                        descDefault="Configure the panic key — a single key press that instantly returns you to the home screen."
                        tipDefault="Useful for quick privacy. The panic key works from any screen in the application."
                    />

                    <HelpSection
                        icon={<Settings2 className="w-4 h-4" />}
                        titleKey="settings.help.advanced"
                        descKey="settings.help.advancedDesc"
                        tipKey="settings.help.advancedTip"
                        titleDefault="Advanced"
                        descDefault="Control history tracking, image info overlay, thumbnail generation, minimum image size filter, and auto-add dropped folders."
                        tipDefault="Disabling history will stop tracking your reading progress. Adjusting minimum image size helps filter out cover art and logos."
                    />

                    <HelpSection
                        icon={<Layers className="w-4 h-4" />}
                        titleKey="settings.help.tabs"
                        descKey="settings.help.tabsDesc"
                        tipKey="settings.help.tabsTip"
                        titleDefault="Tabs"
                        descDefault="Enable memory saving to unmount inactive tabs, or restore your tab session on startup."
                        tipDefault="Memory saving reduces RAM usage but causes a brief reload when switching tabs. Disabling it gives instant tab switching."
                    />

                    <HelpSection
                        icon={<RefreshCw className="w-4 h-4" />}
                        titleKey="settings.help.updates"
                        descKey="settings.help.updatesDesc"
                        tipKey="settings.help.updatesTip"
                        titleDefault="Updates"
                        descDefault="Manage automatic updates. The app checks for new versions on startup when enabled."
                        tipDefault="Updates are downloaded in the background and applied on restart. You can also check manually at any time."
                    />

                    <HelpSection
                        icon={<AlertTriangle className="w-4 h-4" />}
                        titleKey="settings.help.dangerZone"
                        descKey="settings.help.dangerZoneDesc"
                        tipKey="settings.help.dangerZoneTip"
                        titleDefault="Danger Zone"
                        descDefault="Reset all settings to defaults or clear the entire application cache including history, downloads, and data."
                        tipDefault="Clearing cache is irreversible. Your settings will be preserved, but all reading history, downloads, and usage data will be permanently deleted."
                    />
                </div>
            </HelpDialog>
        </>
    );
}
