import { useTranslation } from "react-i18next";

type EmptyStateVariant = 'no-folders' | 'no-results';

interface ExplorerEmptyStateProps {
  variant: EmptyStateVariant;
}

export function ExplorerEmptyState({ variant }: ExplorerEmptyStateProps) {
  const { t } = useTranslation();

  if (variant === 'no-folders') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
        <svg
          className="w-24 h-24 mb-4 text-surface-tertiary"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <p className="text-lg">{t("explorer.noFoldersAdded")}</p>
        <p className="text-sm mt-1">{t("explorer.addFolderToStart")}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
      <svg
        className="w-16 h-16 mb-4 text-surface-tertiary"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <p className="text-lg">
        {t("explorer.noResultsFound") || "No results found"}
      </p>
      <p className="text-sm mt-1">
        {t("explorer.tryDifferentSearch") ||
          `Try a different search term`}
      </p>
    </div>
  );
}
