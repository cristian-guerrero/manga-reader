import { useTranslation } from "react-i18next";
import { GridItem, GridContainer, Tooltip, MediaTile } from "@shared/components";
import type { ExplorerEntry } from "../types";

interface SearchResultsSectionProps {
  searchResults: ExplorerEntry[];
  searchQuery: string;
  isSearching: boolean;
  onResultClick: (entry: ExplorerEntry) => void;
}

export function SearchResultsSection({
  searchResults,
  searchQuery,
  isSearching,
  onResultClick,
}: SearchResultsSectionProps) {
  const { t } = useTranslation();

  if (searchQuery.trim() && isSearching) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
        <svg className="animate-spin w-8 h-8 mb-2" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm">{t('common.searching') || 'Searching...'}</p>
      </div>
    );
  }

  if (searchQuery.trim() && !isSearching && searchResults.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
        <svg className="w-16 h-16 mb-4 text-surface-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <p className="text-lg">{t("explorer.noResultsFound")}</p>
        <p className="text-sm mt-1">{t("explorer.tryDifferentSearch")}</p>
      </div>
    );
  }

  if (searchResults.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-text-secondary mb-1">
        {searchResults.length >= 200
          ? `Showing top 200 results for "${searchQuery}"`
          : `Found ${searchResults.length} results for "${searchQuery}"`
        }
      </p>
      <GridContainer>
        {searchResults.map((entry) => {
          const sepIdx = Math.max(entry.path.lastIndexOf('\\'), entry.path.lastIndexOf('/'));
          const parentPath = sepIdx >= 0 ? entry.path.substring(0, sepIdx) : '';
          return (
            <GridItem key={entry.path}>
              <MediaTile
                id={entry.path}
                name={entry.name}
                thumbnail={entry.thumbnailUrl}
                onClick={() => onResultClick(entry)}
                fallbackIcon={
                  <div className={`p-4 rounded-xl ${entry.isDirectory ? 'bg-amber/10 text-amber' : 'bg-accent/10 text-accent'}`}>
                    {entry.isDirectory ? (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    ) : (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    )}
                  </div>
                }
                footerLeft={
                  <Tooltip content={parentPath}>
                    <p className="text-xs text-white/50 truncate mt-1 font-mono">
                      {parentPath}
                    </p>
                  </Tooltip>
                }
              />
            </GridItem>
          );
        })}
      </GridContainer>
    </div>
  );
}
