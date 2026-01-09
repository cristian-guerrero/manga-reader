import { useState, useEffect, useRef } from 'react';

/**
 * Hook para cargar un thumbnail individual de forma lazy (cuando se hace visible)
 * Útil para componentes que solo necesitan cargar un thumbnail cuando se renderizan
 * 
 * @param imagePath - Ruta de la imagen para generar el thumbnail, o función async que retorna la ruta
 * @param thumbnailUrl - URL del thumbnail si ya está disponible (del backend)
 * @param options - Opciones de configuración
 */
export function useThumbnail(
    imagePath: string | null | undefined | (() => Promise<string | null | undefined>),
    thumbnailUrl?: string | null,
    options: {
        rootMargin?: string;
        enabled?: boolean;
        cache?: Map<string, string>;
        cacheKey?: string;
    } = {}
) {
    const {
        rootMargin = '150px',
        enabled = true,
        cache,
        cacheKey,
    } = options;

    const [thumbnail, setThumbnail] = useState<string | null>(() => {
        // Si ya hay thumbnailUrl, usarlo directamente
        if (thumbnailUrl) return thumbnailUrl;
        
        // Si hay cache y cacheKey, verificar cache
        if (cache && cacheKey) {
            return cache.get(cacheKey) || null;
        }
        
        return null;
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);

    useEffect(() => {
        // Si ya tenemos thumbnail, no hacer nada
        if (thumbnail || !enabled || !imagePath) return;

        // Si hay cache y cacheKey, verificar cache primero
        if (cache && cacheKey) {
            const cached = cache.get(cacheKey);
            if (cached) {
                setThumbnail(cached);
                return;
            }
        }

        if (!ref.current || loadingRef.current) return;

        const observer = new IntersectionObserver(
            ([obsEntry]) => {
                if (obsEntry.isIntersecting && !loadingRef.current && !thumbnail) {
                    // Verificar cache de nuevo antes de cargar
                    if (cache && cacheKey) {
                        const cached = cache.get(cacheKey);
                        if (cached) {
                            setThumbnail(cached);
                            observer.disconnect();
                            return;
                        }
                    }

                    loadingRef.current = true;
                    setIsLoading(true);

                    // Cargar thumbnail asíncronamente
                    const loadTimer = setTimeout(async () => {
                        try {
                            // Si imagePath es una función, ejecutarla para obtener la ruta
                            let actualImagePath: string | null | undefined;
                            if (typeof imagePath === 'function') {
                                actualImagePath = await imagePath();
                            } else {
                                actualImagePath = imagePath;
                            }

                            if (!actualImagePath) {
                                setIsLoading(false);
                                loadingRef.current = false;
                                return;
                            }

                            // @ts-ignore
                            const thumb = await window.go?.main?.App?.GetThumbnail(actualImagePath);
                            if (thumb) {
                                // Guardar en cache si está disponible
                                if (cache && cacheKey) {
                                    cache.set(cacheKey, thumb);
                                }
                                setThumbnail(thumb);
                            }
                        } catch (error) {
                            console.error('Failed to load thumbnail:', error);
                        } finally {
                            setIsLoading(false);
                            loadingRef.current = false;
                        }
                    }, 100); // Pequeño delay para no bloquear el navegador

                    observer.disconnect();
                }
            },
            { rootMargin }
        );

        observer.observe(ref.current);
        return () => {
            observer.disconnect();
            if (loadingRef.current) {
                loadingRef.current = false;
            }
        };
    }, [imagePath, thumbnail, enabled, rootMargin, cache, cacheKey]);

    // Actualizar si thumbnailUrl cambia
    useEffect(() => {
        if (thumbnailUrl && thumbnailUrl !== thumbnail) {
            setThumbnail(thumbnailUrl);
        }
    }, [thumbnailUrl, thumbnail]);

    return {
        thumbnail,
        isLoading,
        ref,
    };
}
