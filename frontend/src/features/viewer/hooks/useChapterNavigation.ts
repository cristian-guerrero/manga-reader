/**
 * useChapterNavigation - Hook for managing chapter navigation in series
 */

import { useState, useEffect } from 'react';
import { AppAPI } from '../../../services/api/appAPI';

interface ChapterNavigation {
    prevChapter?: { path: string; name: string };
    nextChapter?: { path: string; name: string };
    seriesName?: string;
    chapterIndex?: number;
    totalChapters?: number;
}

export function useChapterNavigation(folderPath: string | undefined, isActive: boolean) {
    const [chapterNav, setChapterNav] = useState<ChapterNavigation | null>(null);

    useEffect(() => {
        if (!folderPath || !isActive) {
            setChapterNav(null);
            return;
        }

        let cancelled = false;

        const loadChapterNav = async () => {
            try {
                const navInfo = await AppAPI.getChapterNavigation(folderPath);
                if (cancelled) return;

                if (navInfo) {
                    console.log('[useChapterNavigation] Chapter navigation found:', navInfo);
                    setChapterNav(navInfo);
                } else {
                    setChapterNav(null);
                }
            } catch (error) {
                console.error('[useChapterNavigation] Failed to load chapter navigation:', error);
                if (!cancelled) {
                    setChapterNav(null);
                }
            }
        };

        loadChapterNav();

        return () => {
            cancelled = true;
        };
    }, [folderPath, isActive]);

    return chapterNav;
}
