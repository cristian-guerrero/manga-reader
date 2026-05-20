import * as AppBackend from '../../../wailsjs/go/main/App';
import { BaseAPI } from './baseAPI';

export interface LibraryInfo {
    id: string;
    name: string;
    filename: string;
    isDefault: boolean;
}

export class LibraryManagerAPI extends BaseAPI {
    static async getLibraries(): Promise<LibraryInfo[]> {
        return this.callOrEmpty(
            async () => {
                const result = await AppBackend.GetLibraries();
                return (result as LibraryInfo[]) || [];
            },
            { component: 'LibraryManagerAPI', action: 'getLibraries' }
        );
    }

    static async getLibraryByID(id: string): Promise<LibraryInfo | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.GetLibraryByID(id);
                return (result as LibraryInfo) || null;
            },
            { component: 'LibraryManagerAPI', action: 'getLibraryByID', details: { id } }
        );
    }

    static async getActiveLibraryID(): Promise<string | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.GetActiveLibraryID();
                return result || null;
            },
            { component: 'LibraryManagerAPI', action: 'getActiveLibraryID' }
        );
    }

    static async getDefaultLibrary(): Promise<LibraryInfo | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.GetDefaultLibrary();
                return (result as LibraryInfo) || null;
            },
            { component: 'LibraryManagerAPI', action: 'getDefaultLibrary' }
        );
    }

    static async createLibrary(name: string): Promise<LibraryInfo | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.CreateLibrary(name);
                return (result as LibraryInfo) || null;
            },
            { component: 'LibraryManagerAPI', action: 'createLibrary', details: { name } }
        );
    }

    static async deleteLibrary(id: string): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.DeleteLibrary(id);
            },
            { component: 'LibraryManagerAPI', action: 'deleteLibrary', details: { id } }
        );
    }

    static async openLibraryFile(filePath: string): Promise<LibraryInfo | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.OpenLibraryFile(filePath);
                return (result as LibraryInfo) || null;
            },
            { component: 'LibraryManagerAPI', action: 'openLibraryFile', details: { filePath } }
        );
    }

    static async switchLibrary(id: string): Promise<void> {
        return this.callVoid(
            async () => {
                await AppBackend.SwitchLibrary(id);
            },
            { component: 'LibraryManagerAPI', action: 'switchLibrary', details: { id } }
        );
    }

    static async selectLibraryFile(): Promise<string | null> {
        return this.callOrNull(
            async () => {
                const result = await AppBackend.SelectLibraryFile();
                return result || null;
            },
            { component: 'LibraryManagerAPI', action: 'selectLibraryFile' }
        );
    }
}
