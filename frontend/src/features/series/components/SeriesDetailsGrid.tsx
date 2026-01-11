/**
 * SeriesDetailsGrid - Grid component for displaying chapters
 */

import { useTranslation } from 'react-i18next';
import { GridContainer, GridItem, MediaTile } from '@shared/components';
import { ImageIcon } from './SeriesDetailsIcons';
import type { ChapterInfo } from '@types';

interface SeriesDetailsGridProps {
    chapters: ChapterInfo[];
    thumbnails: Record<string, string>;
    onOpenChapter: (path: string) => void;
    onAuxClick: (e: React.MouseEvent, path: string, name: string) => void;
    searchQuery: string;
}

export function SeriesDetailsGrid({
    chapters,
    thumbnails,
    onOpenChapter,
    onAuxClick,
    searchQuery,
}: SeriesDetailsGridProps) {
    const { t } = useTranslation();

    if (chapters.length === 0 && searchQuery.trim()) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('common.noResults')}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {t('series.noChaptersFound') || `No chapters found matching "${searchQuery}"`}
                </p>
            </div>
        );
    }

    return (
        <GridContainer variant="chapters" gap="lg">
            {chapters.map((chapter: ChapterInfo) => (
                <GridItem key={chapter.path}>
                    <MediaTile
                        id={chapter.path}
                        name={chapter.name}
                        thumbnail={thumbnails[chapter.path]}
                        onClick={() => onOpenChapter(chapter.path)}
                        onAuxClick={(e) => onAuxClick(e, chapter.path, chapter.name)}
                        fallbackIcon={<ImageIcon />}
                        aspectRatio="aspect-[3/4]"
                        footerLeft={
                            <span className="text-xs text-white/50">
                                {chapter.imageCount} {t('series.pagesLabel')}
                            </span>
                        }
                        overlayContent={
                            <span className="bg-accent text-white px-4 py-2 rounded-full font-bold shadow-lg">
                                {t('series.readNow')}
                            </span>
                        }
                    />
                </GridItem>
            ))}
        </GridContainer>
    );
}
