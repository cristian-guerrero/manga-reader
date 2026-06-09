import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LibraryManagerAPI, LibraryInfo } from '../../services/api/libraryManagerAPI';
import { HelpDialog } from '@shared/components';
import { LibraryList } from './components/LibraryList';
import { CreateLibraryDialog } from './components/CreateLibraryDialog';

export function LibraryManagerPage() {
    const { t } = useTranslation();
    const [libraries, setLibraries] = useState<LibraryInfo[]>([]);
    const [activeID, setActiveID] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const loadLibraries = useCallback(async () => {
        setLoading(true);
        const libs = await LibraryManagerAPI.getLibraries();
        setLibraries(libs);

        const activeLibID = await LibraryManagerAPI.getActiveLibraryID();
        if (activeLibID) {
            setActiveID(activeLibID);
        } else {
            const defaultLib = await LibraryManagerAPI.getDefaultLibrary();
            setActiveID(defaultLib?.id || (libs[0]?.id ?? ''));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadLibraries();
    }, [loadLibraries]);

    const handleCreate = async (name: string) => {
        const lib = await LibraryManagerAPI.createLibrary(name);
        if (lib) {
            await loadLibraries();
        }
        setShowCreate(false);
    };

    const handleDelete = async (id: string) => {
        if (id === activeID) {
            const defaultLib = await LibraryManagerAPI.getDefaultLibrary();
            if (defaultLib && defaultLib.id !== id) {
                await LibraryManagerAPI.switchLibrary(defaultLib.id);
            }
        }
        await LibraryManagerAPI.deleteLibrary(id);
        await loadLibraries();
    };

    const handleActivate = async (id: string) => {
        await LibraryManagerAPI.switchLibrary(id);
        setActiveID(id);
    };

    const handleOpen = async () => {
        const filePath = await LibraryManagerAPI.selectLibraryFile();
        if (filePath) {
            const lib = await LibraryManagerAPI.openLibraryFile(filePath);
            if (lib) {
                await loadLibraries();
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('common.loading')}
                </p>
            </div>
        );
    }

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gradient">
                    {t('libraryManager.title')}
                </h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsHelpOpen(true)}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--color-text-secondary)' }}
                        title={t('libraryManager.help.title')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </button>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                            backgroundColor: 'var(--color-accent)',
                            color: 'white'
                        }}
                    >
                        {t('libraryManager.create')}
                    </button>
                    <button
                        onClick={handleOpen}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                            backgroundColor: 'var(--color-surface-tertiary)',
                            color: 'var(--color-text-primary)'
                        }}
                    >
                        {t('libraryManager.open')}
                    </button>
                </div>
            </div>

            {libraries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('libraryManager.noLibraries')}
                    </p>
                </div>
            ) : (
                <LibraryList
                    libraries={libraries}
                    activeID={activeID}
                    onActivate={handleActivate}
                    onDelete={handleDelete}
                />
            )}

            {showCreate && (
                <CreateLibraryDialog
                    onConfirm={handleCreate}
                    onCancel={() => setShowCreate(false)}
                />
            )}

            <HelpDialog
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
                title={t('libraryManager.help.title')}
            >
                <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--color-accent)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            {t('libraryManager.help.overview')}
                        </h4>
                        <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {t('libraryManager.help.overviewDesc')}
                        </p>
                    </div>

                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--color-accent)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M5 12h14"></path>
                            </svg>
                            {t('libraryManager.help.create')}
                        </h4>
                        <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {t('libraryManager.help.createDesc')}
                        </p>
                    </div>

                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--color-accent)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                            </svg>
                            {t('libraryManager.help.open')}
                        </h4>
                        <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {t('libraryManager.help.openDesc')}
                        </p>
                    </div>

                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--color-accent)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            {t('libraryManager.help.activate')}
                        </h4>
                        <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {t('libraryManager.help.activateDesc')}
                        </p>
                    </div>

                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--color-accent)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            {t('libraryManager.help.delete')}
                        </h4>
                        <p className="text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>
                            {t('libraryManager.help.deleteDesc')}
                        </p>
                        <div className="flex items-start gap-2 p-2 rounded" style={{ backgroundColor: 'var(--color-surface-primary)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent)' }}>
                                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                <path d="M2 17l10 5 10-5"></path>
                                <path d="M2 12l10 5 10-5"></path>
                            </svg>
                            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                {t('libraryManager.help.perLibrary')}
                            </p>
                        </div>
                    </div>

                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--color-accent)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                <path d="M2 17l10 5 10-5"></path>
                                <path d="M2 12l10 5 10-5"></path>
                            </svg>
                            {t('libraryManager.help.tips')}
                        </h4>
                        <div className="space-y-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            <p className="flex items-start gap-2">
                                <span className="mt-1">•</span>
                                {t('libraryManager.help.tipDefault')}
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="mt-1">•</span>
                                {t('libraryManager.help.tipBackup')}
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="mt-1">•</span>
                                {t('libraryManager.help.tipImport')}
                            </p>
                        </div>
                    </div>
                </div>
            </HelpDialog>
        </div>
    );
}
