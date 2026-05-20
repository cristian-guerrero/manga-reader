import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LibraryManagerAPI, LibraryInfo } from '../../services/api/libraryManagerAPI';
import { LibraryList } from './components/LibraryList';
import { CreateLibraryDialog } from './components/CreateLibraryDialog';

export function LibraryManagerPage() {
    const { t } = useTranslation();
    const [libraries, setLibraries] = useState<LibraryInfo[]>([]);
    const [activeID, setActiveID] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

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
                <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {t('libraryManager.title')}
                </h1>
                <div className="flex gap-2">
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
        </div>
    );
}
