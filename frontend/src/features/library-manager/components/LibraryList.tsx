import { useTranslation } from 'react-i18next';
import { LibraryInfo } from '../../../services/api/libraryManagerAPI';

interface LibraryListProps {
    libraries: LibraryInfo[];
    activeID: string;
    onActivate: (id: string) => void;
    onDelete: (id: string) => void;
}

export function LibraryList({ libraries, activeID, onActivate, onDelete }: LibraryListProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-2">
            {libraries.map((lib) => {
                const isActive = lib.id === activeID;
                const isDefault = lib.isDefault;

                return (
                    <div
                        key={lib.id}
                        className="flex items-center justify-between p-4 rounded-lg transition-all"
                        style={{
                            backgroundColor: isActive
                                ? 'var(--color-accent)'
                                : 'var(--color-surface-secondary)',
                            color: isActive ? 'white' : 'var(--color-text-primary)',
                        }}
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                                style={{
                                    backgroundColor: isActive
                                        ? 'rgba(255,255,255,0.2)'
                                        : 'var(--color-surface-tertiary)'
                                }}
                            >
                                {isDefault ? '★' : '○'}
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium truncate text-sm">
                                    {lib.name}
                                </p>
                                <p className="text-xs truncate mt-0.5"
                                    style={{
                                        color: isActive
                                            ? 'rgba(255,255,255,0.7)'
                                            : 'var(--color-text-secondary)'
                                    }}
                                >
                                    {lib.filename}
                                    {isDefault && ` · ${t('libraryManager.default')}`}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            {!isActive && (
                                <button
                                    onClick={() => onActivate(lib.id)}
                                    className="px-3 py-1.5 rounded-md text-xs font-medium transition-all hover:scale-[1.05] active:scale-[0.95]"
                                    style={{
                                        backgroundColor: isActive
                                            ? 'rgba(255,255,255,0.2)'
                                            : 'var(--color-accent)',
                                        color: isActive ? 'white' : 'white'
                                    }}
                                >
                                    {t('libraryManager.activate')}
                                </button>
                            )}
                            {isActive && (
                                <span className="px-3 py-1.5 rounded-md text-xs font-medium"
                                    style={{
                                        backgroundColor: 'rgba(255,255,255,0.2)',
                                        color: 'white'
                                    }}
                                >
                                    {t('libraryManager.active')}
                                </span>
                            )}
                            {!isDefault && (
                                <button
                                    onClick={() => onDelete(lib.id)}
                                    className="px-3 py-1.5 rounded-md text-xs font-medium transition-all hover:scale-[1.05] active:scale-[0.95]"
                                    style={{
                                        backgroundColor: isActive
                                            ? 'rgba(255,255,255,0.2)'
                                            : 'var(--color-danger, #e74c3c)',
                                        color: 'white'
                                    }}
                                >
                                    {t('common.remove')}
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
