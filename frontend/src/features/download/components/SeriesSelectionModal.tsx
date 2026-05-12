/**
 * SeriesSelectionModal - Modal for selecting chapters to download from a series
 * Extracted from DownloadPage for better separation of concerns
 */

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button, Tooltip } from "@shared/components";
import { downloader } from "../../../../wailsjs/go/models";

interface SeriesSelectionModalProps {
  seriesInfo: downloader.SiteInfo;
  selectedChapters: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  onDownload: () => void;
  onClose: () => void;
}

// Language flag helper
const getLanguageFlag = (langCode: string) => {
  const map: { [key: string]: string } = {
    en: "🇬🇧",
    es: "🇪🇸",
    "es-la": "🇲🇽",
    ja: "🇯🇵",
    ko: "🇰🇷",
    zh: "🇨🇳",
    fr: "🇫🇷",
    it: "🇮🇹",
    de: "🇩🇪",
    pt: "🇵🇹",
    "pt-br": "🇧🇷",
    ru: "🇷🇺",
    tr: "🇹🇷",
    id: "🇮🇩",
    vi: "🇻🇳",
    pl: "🇵🇱",
    uk: "🇺🇦",
  };
  return map[langCode] || langCode || "🌐";
};

export function SeriesSelectionModal({
  seriesInfo,
  selectedChapters,
  onSelectionChange,
  onDownload,
  onClose,
}: SeriesSelectionModalProps) {
  const { t } = useTranslation();
  const [filterLanguage, setFilterLanguage] = useState<string>("all");

  const availableLanguages = useMemo(() => {
    if (!seriesInfo || !seriesInfo.Chapters) return [];
    const langs = new Set(
      seriesInfo.Chapters.map((c: any) => c.Language).filter(Boolean),
    );
    return Array.from(langs) as string[];
  }, [seriesInfo]);

  const displayedChapters = useMemo(() => {
    if (!seriesInfo || !seriesInfo.Chapters) return [];
    if (filterLanguage === "all") return seriesInfo.Chapters;
    return seriesInfo.Chapters.filter(
      (c: any) => c.Language === filterLanguage,
    );
  }, [seriesInfo, filterLanguage]);

  const toggleChapter = (id: string) => {
    const newSet = new Set(selectedChapters);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelectionChange(newSet);
  };

  const toggleAllChapters = () => {
    if (!seriesInfo || !seriesInfo.Chapters) return;

    const allDisplayedSelected =
      displayedChapters.length > 0 &&
      displayedChapters.every((c: any) => selectedChapters.has(c.ID));
    const newSelected = new Set(selectedChapters);

    displayedChapters.forEach((c: any) => {
      if (allDisplayedSelected) {
        newSelected.delete(c.ID);
      } else {
        newSelected.add(c.ID);
      }
    });

    onSelectionChange(newSelected);
  };

  const isAllDisplayedSelected =
    displayedChapters.length > 0 &&
    displayedChapters.every((c: any) => selectedChapters.has(c.ID));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-8">
      <div
        className="card w-full max-w-2xl max-h-full flex flex-col p-0 overflow-hidden shadow-2xl"
        style={{ backgroundColor: "var(--color-surface-elevated)" }}
      >
        <div
          className="p-4 border-b flex justify-between items-center"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-surface-secondary)",
          }}
        >
          <h3
            className="text-xl font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {seriesInfo.SeriesName}
          </h3>
          <button
            onClick={onClose}
            style={{ color: "var(--color-text-secondary)" }}
            className="hover:text-white transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          className="p-4 flex gap-4 items-center justify-between border-b"
          style={{
            backgroundColor: "var(--color-surface-secondary)",
            borderColor: "var(--color-border)",
          }}
        >
          {/* Language Filter */}
          <div className="flex items-center gap-2">
            <span
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Language:
            </span>
            <select
              className="text-sm rounded border px-2 py-1 outline-none"
              style={{
                backgroundColor: "var(--color-surface-tertiary)",
                color: "var(--color-text-primary)",
                borderColor: "var(--color-border)",
              }}
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
            >
              <option value="all">All Languages 🌐</option>
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {getLanguageFlag(lang as string)} {lang}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {displayedChapters.length} chapters
            </div>
            <button
              onClick={toggleAllChapters}
              className="text-sm font-medium hover:underline"
              style={{ color: "var(--color-accent)" }}
            >
              {isAllDisplayedSelected ? "Deselect All" : "Select All"}
            </button>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 space-y-2"
          style={{ backgroundColor: "var(--color-surface-primary)" }}
        >
          {displayedChapters.map((chapter: any) => (
            <label
              key={chapter.ID}
              className="flex items-center gap-3 p-2 rounded cursor-pointer transition-colors group hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={selectedChapters.has(chapter.ID)}
                onChange={() => toggleChapter(chapter.ID)}
                className="w-5 h-5 rounded border bg-transparent"
                style={{
                  borderColor: "var(--color-text-secondary)",
                  accentColor: "var(--color-accent)",
                }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Tooltip content={chapter.Language}>
                    <span className="text-xl">
                      {getLanguageFlag(chapter.Language)}
                    </span>
                  </Tooltip>
                  <div
                    className="font-medium transition-colors"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {chapter.Name}
                  </div>
                </div>
                <div
                  className="text-xs flex gap-2"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  <span>
                    {chapter.Date
                      ? new Date(chapter.Date).toLocaleDateString()
                      : ""}
                  </span>
                  {chapter.ScanGroup && (
                    <>
                      <span>•</span>
                      <span>{chapter.ScanGroup}</span>
                    </>
                  )}
                </div>
              </div>
              <a
                href={chapter.URL}
                target="_blank"
                rel="noreferrer"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                style={{ color: "var(--color-text-secondary)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </label>
          ))}
        </div>

        <div
          className="p-4 flex justify-end gap-3"
          style={{ backgroundColor: "var(--color-surface-secondary)" }}
        >
          <Button
            onClick={onClose}
            variant="ghost"
            className="px-4 hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={onDownload}
            variant="primary"
            className="px-6"
            disabled={selectedChapters.size === 0}
          >
            Download Selected ({selectedChapters.size})
          </Button>
        </div>
      </div>
    </div>
  );
}
