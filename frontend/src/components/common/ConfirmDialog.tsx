import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    icon?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    isDestructive = false,
    icon
}) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    const accentColor = isDestructive ? 'red' : 'orange';
    const accentHex = isDestructive ? '#ef4444' : '#f97316';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div
                className="card w-full max-w-md p-6 shadow-2xl animate-scale-in"
                onClick={(e) => e.stopPropagation()}
                style={{ backgroundColor: 'var(--color-surface-elevated)' }}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3
                        className={`text-xl font-bold flex items-center gap-2 text-${accentColor}-500`}
                        style={{ color: accentHex }} // Explicit style fallback
                    >
                        {icon}
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <p className="mb-6 leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                    {message}
                </p>

                <div className="flex justify-end gap-3">
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        className="border border-white/10 hover:bg-white/5"
                    >
                        {cancelText || t('common.cancel') || 'Cancel'}
                    </Button>
                    <Button
                        onClick={onConfirm}
                        variant={isDestructive ? 'danger' : 'primary'}
                        className={!isDestructive ? `bg-${accentColor}-500 hover:bg-${accentColor}-600` : ''}
                        style={!isDestructive ? { backgroundColor: accentHex } : undefined}
                    >
                        {confirmText || t('common.confirm') || 'Confirm'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
