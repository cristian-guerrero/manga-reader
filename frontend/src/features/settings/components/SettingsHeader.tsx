/**
 * SettingsHeader - Header component for settings page
 */

import { useTranslation } from "react-i18next";
import { Tooltip } from "@shared/components";

interface SettingsHeaderProps {
  onHelpClick: () => void;
}

export function SettingsHeader({ onHelpClick }: SettingsHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold text-gradient">
        {t("settings.title", "Settings")}
      </h1>
      <Tooltip content={t("settings.help.title")} placement="bottom">
        <button
          onClick={onHelpClick}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          style={{ color: "var(--color-text-secondary)" }}
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
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </button>
      </Tooltip>
    </div>
  );
}
