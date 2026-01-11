/**
 * SeriesGrid - Grid component for displaying series
 */

import { useTranslation } from 'react-i18next';
import { GridContainer, GridItem, LibraryCard } from '@shared/components';
import { SeriesIcon, BookIcon, PlayIcon } from './SeriesIcons';
import type { SeriesEntry } from '@types';

interface SeriesGridProps {
    series: SeriesEntry[];
    thumbnails: Record<string, string>;
    onOpenSeries: (entry: SeriesEntry) => void;
    onAuxClick: (e: React.MouseEvent, entry: SeriesEntry) => void;
    onPlaySeries: (entry: SeriesEntry, e: React.MouseEvent) => void;
    onRemoveSeries: (entry: SeriesEntry, e: React.MouseEvent) => void;
}

export function SeriesGrid({
    series,
    thumbnails,
    onOpenSeries,
    onAuxClick,
    onPlaySeries,
    onRemoveSeries,
}: SeriesGridProps) {
    const { t } = useTranslation();

    return (
        <GridContainer>
            {series.map((item) => (
                <GridItem key={item.path}>
                    <LibraryCard
                        id={item.id}
                        name={item.name}
                        thumbnail={thumbnails[item.id]}
                        isTemporary={item.isTemporary}
                        count={item.chapters?.length || 0}
                        countLabel={t('series.chapters')}
                        countIcon={<BookIcon />}
                        onOpen={() => onOpenSeries(item)}
                        onAuxClick={(e) => onAuxClick(e, item)}
                        onRemove={(e) => onRemoveSeries(item, e)}
                        onPlay={(e) => onPlaySeries(item, e)}
                        overlayContent={
                            <>
                                <button
                                    onClick={(e) => onPlaySeries(item, e)}
                                    className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl backdrop-blur-md transition-all hover:scale-110 hover:bg-accent-hover active:scale-90 pointer-events-auto"
                                    style={{ backgroundColor: 'var(--color-accent)' }}
                                >
                                    <PlayIcon />
                                </button>
                                <div className="absolute bottom-4 text-white font-medium text-sm">
                                    {t('series.openSeries')}
                                </div>
                            </>
                        }
                        fallbackIcon={<SeriesIcon />}
                        archiveLabel={t('common.archive') || 'Archive'}
                        removeLabel={t('series.removeSeries')}
                        playLabel={t('series.openSeries')}
                        variant="split"
                    />
                </GridItem>
            ))}
        </GridContainer>
    );
}
