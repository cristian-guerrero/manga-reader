/**
 * SettingRow - Reusable component for settings rows
 */

import React from 'react';

interface SettingRowProps {
    label: string;
    description?: string;
    children: React.ReactNode;
}

export function SettingRow({ label, description, children }: SettingRowProps) {
    return (
        <div className="flex items-center justify-between py-4">
            <div>
                <span
                    className="font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                >
                    {label}
                </span>
                {description && (
                    <p
                        className="text-sm mt-1"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        {description}
                    </p>
                )}
            </div>
            <div>{children}</div>
        </div>
    );
}
