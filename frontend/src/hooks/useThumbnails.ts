import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook para cargar thumbnails en paralelo por lotes
 * Útil cuando necesitas cargar múltiples thumbnails de una vez
 * 
 * @param batchSize - Tamaño del lote para cargar en paralelo (default: 10)
 * @returns Objeto con thumbnails cargados y función para cargar nuevos thumbnails
 */
export function useThumbnails(batchSize: number = 10) {
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
    const thumbnailsRef = useRef<Record<string, string>>({});

    // Mantener ref sincronizado con el estado
    useEffect(() => {
        thumbnailsRef.current = thumbnails;
    }, [thumbnails]);

    /**
     * Carga thumbnails en paralelo por lotes
     * @param entries - Array de entradas que tienen coverImage o path para cargar thumbnail
     * @param getImagePath - Función que retorna la ruta de la imagen para cada entrada (puede ser async)
     * @param getKey - Función que retorna la clave única para cada entrada (default: entry.path o entry.id)
     * @param filterFn - Función opcional para filtrar entradas que necesitan thumbnail
     */
    const loadThumbnails = useCallback(async <T extends { path?: string; id?: string; coverImage?: string; thumbnailUrl?: string }>(
        entries: T[],
        getImagePath: (entry: T) => string | null | undefined | Promise<string | null | undefined>,
        getKey: (entry: T) => string = (entry) => entry.path || entry.id || '',
        filterFn?: (entry: T) => boolean
    ) => {
        // Initial population from entries that already have thumbnailUrl
        const existingThumbs: Record<string, string> = {};
        entries.forEach(entry => {
            const key = getKey(entry);
            if (entry.thumbnailUrl && !thumbnailsRef.current[key]) {
                existingThumbs[key] = entry.thumbnailUrl;
                thumbnailsRef.current[key] = entry.thumbnailUrl;
            }
        });

        if (Object.keys(existingThumbs).length > 0) {
            setThumbnails(prev => ({ ...prev, ...existingThumbs }));
        }

        // Filter entries that still need thumbnail
        const needsThumbnail = filterFn
            ? entries.filter(filterFn)
            : entries.filter(entry => {
                const imagePath = getImagePath(entry);
                if (imagePath instanceof Promise) return true;
                const key = getKey(entry);
                return imagePath && !thumbnailsRef.current[key];
            });

        if (needsThumbnail.length === 0) return;

        // Cargar thumbnails en paralelo por lotes
        for (let i = 0; i < needsThumbnail.length; i += batchSize) {
            const batch = needsThumbnail.slice(i, i + batchSize);
            const thumbnailPromises = batch.map(async (entry) => {
                try {
                    let imagePath = getImagePath(entry);
                    // Si es una Promise, esperar a que se resuelva
                    if (imagePath instanceof Promise) {
                        imagePath = await imagePath;
                    }
                    if (!imagePath) return null;

                    // @ts-ignore
                    const thumb = await window.go?.main?.App?.GetThumbnail(imagePath);
                    return { key: getKey(entry), thumb };
                } catch (error) {
                    console.error('Failed to load thumbnail:', error);
                    return null;
                }
            });

            const results = await Promise.all(thumbnailPromises);
            const newThumbnails: Record<string, string> = {};
            results.forEach(result => {
                if (result?.thumb) {
                    newThumbnails[result.key] = result.thumb;
                }
            });
            // Usar función de actualización para evitar dependencia de thumbnails
            setThumbnails((prev) => {
                // Verificar que no exista ya antes de agregar
                const updated = { ...prev };
                Object.keys(newThumbnails).forEach(key => {
                    if (!updated[key]) {
                        updated[key] = newThumbnails[key];
                    }
                });
                return updated;
            });
        }
    }, [batchSize]);

    /**
     * Carga un thumbnail individual
     * @param key - Clave única para el thumbnail
     * @param imagePath - Ruta de la imagen para generar el thumbnail
     */
    const loadThumbnail = useCallback(async (key: string, imagePath: string) => {
        // Verificar si ya existe usando ref
        if (thumbnailsRef.current[key]) return;

        try {
            // @ts-ignore
            const thumb = await window.go?.main?.App?.GetThumbnail(imagePath);
            if (thumb) {
                setThumbnails((prev) => {
                    // Solo agregar si no existe ya
                    if (prev[key]) return prev;
                    return { ...prev, [key]: thumb };
                });
            }
        } catch (error) {
            console.error('Failed to load thumbnail:', error);
        }
    }, []);

    /**
     * Obtiene el thumbnail para una clave, o null si no existe
     */
    const getThumbnail = useCallback((key: string): string | null => {
        return thumbnails[key] || null;
    }, [thumbnails]);

    /**
     * Limpia todos los thumbnails
     */
    const clearThumbnails = useCallback(() => {
        setThumbnails({});
    }, []);

    /**
     * Inicializa thumbnails desde datos existentes (ej: cuando vienen del backend)
     */
    const initializeThumbnails = useCallback((initial: Record<string, string>) => {
        setThumbnails((prev) => ({ ...prev, ...initial }));
    }, []);

    return {
        thumbnails,
        loadThumbnails,
        loadThumbnail,
        getThumbnail,
        clearThumbnails,
        initializeThumbnails,
    };
}
