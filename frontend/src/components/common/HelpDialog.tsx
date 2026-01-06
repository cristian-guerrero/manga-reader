import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

interface HelpDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const HelpDialog: React.FC<HelpDialogProps> = ({ isOpen, onClose, title, children }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="card w-full max-w-lg p-6 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--color-surface-elevated)' }}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
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

                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                    {children}
                </div>

                <div className="mt-8 flex justify-end">
                    <Button
                        onClick={onClose}
                        variant="primary"
                        className="px-6"
                    >
                        {t('common.close')}
                    </Button>
                </div>
            </div>
        </div>
    );
};
