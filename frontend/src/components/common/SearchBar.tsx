/**
 * SearchBar - Reusable search input component
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface SearchBarProps {
    placeholder?: string;
    onSearch: (query: string) => void;
    className?: string;
    debounceMs?: number;
}

export function SearchBar({ 
    placeholder, 
    onSearch, 
    className = '', 
    debounceMs = 300 
}: SearchBarProps) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const debounceTimerRef = React.useRef<number | null>(null);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);

        // Clear previous timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set new timer for debounced search
        debounceTimerRef.current = window.setTimeout(() => {
            onSearch(value);
        }, debounceMs);
    }, [onSearch, debounceMs]);

    const handleClear = useCallback(() => {
        setQuery('');
        onSearch('');
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
    }, [onSearch]);

    return (
        <div className={`relative ${className}`}>
            {/* Search Icon */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    style={{ color: 'var(--color-text-secondary)' }}
                >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                </svg>
            </div>

            {/* Input */}
            <input
                type="text"
                value={query}
                onChange={handleInputChange}
                placeholder={placeholder || t('common.search')}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                    '--tw-ring-color': 'var(--color-accent)',
                } as React.CSSProperties}
            />

            {/* Clear Button */}
            {query && (
                <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
                    style={{ color: 'var(--color-text-secondary)' }}
                    aria-label={t('common.clear') || 'Clear'}
                >
                    <svg 
                        width="18" 
                        height="18" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                    >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            )}
        </div>
    );
}

export default SearchBar;

