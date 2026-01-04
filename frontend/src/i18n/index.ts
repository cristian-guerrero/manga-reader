/**
 * i18n Configuration - Manga Visor
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';

// Supported languages
export const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
] as const;

export type LanguageCode = (typeof languages)[number]['code'];

// Initialize i18next
i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            es: { translation: es },
        },
        lng: 'en', // Default language
        fallbackLng: 'en',

        interpolation: {
            escapeValue: false, // React already escapes values
        },

        // React options
        react: {
            useSuspense: true,
        },
    });

/**
 * Change the current language
 */
export function changeLanguage(code: LanguageCode): void {
    i18n.changeLanguage(code);
}

/**
 * Get current language code
 */
export function getCurrentLanguage(): string {
    return i18n.language;
}

/**
 * Get language name by code
 */
export function getLanguageName(code: string): string {
    const lang = languages.find((l) => l.code === code);
    return lang?.nativeName || code;
}

export default i18n;
