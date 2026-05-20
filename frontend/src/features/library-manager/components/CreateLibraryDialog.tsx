import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CreateLibraryDialogProps {
    onConfirm: (name: string) => void;
    onCancel: () => void;
}

export function CreateLibraryDialog({ onConfirm, onCancel }: CreateLibraryDialogProps) {
    const { t } = useTranslation();
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onConfirm(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={onCancel}
        >
            <div className="rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
                style={{
                    backgroundColor: 'var(--color-surface-primary)',
                    border: '1px solid var(--color-border)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                    {t('libraryManager.createDialog.title')}
                </h2>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                {t('libraryManager.createDialog.nameLabel')}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
                                style={{
                                    backgroundColor: 'var(--color-surface-secondary)',
                                    color: 'var(--color-text-primary)',
                                    border: '1px solid var(--color-border)'
                                }}
                                placeholder="comics"
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                                backgroundColor: 'var(--color-surface-tertiary)',
                                color: 'var(--color-text-primary)'
                            }}
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                                backgroundColor: 'var(--color-accent)',
                                color: 'white'
                            }}
                        >
                            {t('common.create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
