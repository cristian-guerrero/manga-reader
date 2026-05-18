import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MediaTile } from '@shared/components';

import type { ExplorerEntry } from '../types';

interface SortableEntryTileProps {
    entry: ExplorerEntry;
    thumbnail?: string;
    onClick?: () => void;
    onAuxClick?: (e: React.MouseEvent) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    onVisible?: () => void;
    footerLeft?: React.ReactNode;
    footerRight?: React.ReactNode;
    fallbackIcon?: React.ReactNode;
}

export function SortableEntryTile({
    entry,
    thumbnail,
    onClick,
    onAuxClick,
    onContextMenu,
    onVisible,
    footerLeft,
    footerRight,
    fallbackIcon,
}: SortableEntryTileProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: entry.path });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style}>
                <MediaTile
                    id={entry.path}
                    name={entry.name}
                    thumbnail={thumbnail}
                    onClick={onClick}
                    onAuxClick={onAuxClick}
                    onContextMenu={onContextMenu}
                    onVisible={onVisible}
                    footerLeft={footerLeft}
                    footerRight={footerRight}
                    fallbackIcon={fallbackIcon}
                    isDragging={isDragging}
                    dragHandleProps={{ ...attributes, ...listeners }}
                />
        </div>
    );
}
