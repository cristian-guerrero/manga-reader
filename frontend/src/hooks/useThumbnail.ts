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
    const isMountedRef = useRef(true);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

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

        // Limpiar observer y timer anteriores si existen
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        const observer = new IntersectionObserver(
            ([obsEntry]) => {
                if (obsEntry.isIntersecting && !loadingRef.current && !thumbnail && isMountedRef.current) {
                    // Verificar cache de nuevo antes de cargar
                    if (cache && cacheKey) {
                        const cached = cache.get(cacheKey);
                        if (cached) {
                            if (isMountedRef.current) {
                                setThumbnail(cached);
                            }
                            observer.disconnect();
                            observerRef.current = null;
                            return;
                        }
                    }

                    // Verificar nuevamente si está montado antes de iniciar carga
                    if (!isMountedRef.current) {
                        return;
                    }

                    loadingRef.current = true;
                    setIsLoading(true);

                    // Cargar thumbnail asíncronamente
                    timerRef.current = setTimeout(async () => {
                        // Verificar si el componente aún está montado antes de continuar
                        if (!isMountedRef.current) {
                            loadingRef.current = false;
                            return;
                        }

                        try {
                            // Si imagePath es una función, ejecutarla para obtener la ruta
                            let actualImagePath: string | null | undefined;
                            if (typeof imagePath === 'function') {
                                actualImagePath = await imagePath();
                            } else {
                                actualImagePath = imagePath;
                            }

                            // Verificar de nuevo si está montado después de async operation
                            if (!isMountedRef.current) {
                                loadingRef.current = false;
                                return;
                            }

                            if (!actualImagePath) {
                                if (isMountedRef.current) {
                                    setIsLoading(false);
                                }
                                loadingRef.current = false;
                                return;
                            }

                            // @ts-ignore
                            const thumb = await window.go?.main?.App?.GetThumbnail(actualImagePath);
                            
                            // Verificar una vez más antes de actualizar estado
                            if (!isMountedRef.current) {
                                loadingRef.current = false;
                                return;
                            }

                            if (thumb && isMountedRef.current) {
                                // Guardar en cache si está disponible
                                if (cache && cacheKey) {
                                    cache.set(cacheKey, thumb);
                                }
                                setThumbnail(thumb);
                            }
                        } catch (error) {
                            // Solo loggear error si el componente está montado
                            if (isMountedRef.current) {
                                console.error('Failed to load thumbnail:', error);
                            }
                        } finally {
                            if (isMountedRef.current) {
                                setIsLoading(false);
                            }
                            loadingRef.current = false;
                            timerRef.current = null;
                        }
                    }, 100); // Pequeño delay para no bloquear el navegador

                    observer.disconnect();
                    observerRef.current = null;
                }
            },
            { rootMargin }
        );

        observerRef.current = observer;
        observer.observe(ref.current);
        
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
            // Limpiar timer si existe
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            if (loadingRef.current) {
                loadingRef.current = false;
            }
        };
    }, [imagePath, thumbnail, enabled, rootMargin, cache, cacheKey]);

    // Cleanup cuando el componente se desmonta
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            // Limpiar observer si existe
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
            // Limpiar timer si existe
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            loadingRef.current = false;
        };
    }, []);

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
