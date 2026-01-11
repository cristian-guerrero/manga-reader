import React from 'react';

interface ToggleProps {
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
    className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
    checked,
    onChange,
    disabled = false,
    className = '',
}) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (!disabled) {
                    onChange(!checked);
                }
            }}
            className={`relative w-12 h-6 rounded-full transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-accent ${disabled ? 'opacity-50 cursor-default' : 'cursor-pointer'
                } ${className}`}
            style={{
                backgroundColor: checked
                    ? 'var(--color-accent)'
                    : 'var(--color-surface-tertiary)',
            }}
        >
            <div
                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300"
                style={{ left: checked ? '1.5rem' : '0.25rem' }}
            />
        </button>
    );
};
