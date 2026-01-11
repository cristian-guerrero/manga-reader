/**
 * LanguageSelector - Component for selecting language
 */

import { languages } from '@i18n';

interface LanguageSelectorProps {
    language: string;
    onLanguageChange: (lang: string) => void;
}

export function LanguageSelector({ language, onLanguageChange }: LanguageSelectorProps) {
    return (
        <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="input-field w-full sm:w-64"
            style={{
                backgroundColor: 'var(--color-surface-tertiary)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border)',
                padding: '0.5rem',
                borderRadius: '0.5rem'
            }}
        >
            {languages.map((lang: { code: string; nativeName: string }) => (
                <option key={lang.code} value={lang.code}>
                    {lang.nativeName}
                </option>
            ))}
        </select>
    );
}
