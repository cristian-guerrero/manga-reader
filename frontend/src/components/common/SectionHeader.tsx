import React from 'react';

interface SectionHeaderProps {
    title: string;
    className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, className = '' }) => {
    return (
        <h2
            className={`text-lg font-semibold mb-4 pb-2 border-b ${className}`}
            style={{
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border)',
            }}
        >
            {title}
        </h2>
    );
};
