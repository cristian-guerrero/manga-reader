import { useTranslation } from 'react-i18next';
import { Tooltip } from './Tooltip';

// Icons
const SortAscIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M6 12h12M9 18h6" />
    </svg>
);

const SortDescIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 18h18M6 12h12M9 6h6" />
    </svg>
);

export interface SortOption {
    value: string;
    label: string;
}

interface SortControlsProps {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    onSortByChange: (value: string) => void;
    onSortOrderChange: () => void;
    options: SortOption[];
    show?: boolean;
}

export function SortControls({
    sortBy,
    sortOrder,
    onSortByChange,
    onSortOrderChange,
    options,
    show = true,
}: SortControlsProps) {
    const { t } = useTranslation();

    if (!show) return null;

    return (
        <div className="flex items-center bg-surface-tertiary rounded-lg p-1 border border-white/5">
            <select
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value)}
                className="bg-transparent text-sm border-none focus:ring-0 cursor-pointer pl-2 pr-8 text-text-secondary hover:text-text-primary"
                style={{ outline: 'none' }}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <Tooltip content={sortOrder === 'asc' ? t('common.ascending') : t('common.descending')} placement="bottom">
                <button
                    onClick={onSortOrderChange}
                    className="p-1.5 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                >
                    {sortOrder === 'asc' ? <SortAscIcon /> : <SortDescIcon />}
                </button>
            </Tooltip>
        </div>
    );
}

export default SortControls;

