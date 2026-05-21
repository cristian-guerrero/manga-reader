import { useTranslation } from 'react-i18next';
import { useTabStore } from '@stores';

interface MobileHeaderProps {
    title?: string;
}

export function MobileHeader({ title }: MobileHeaderProps) {
    const { t } = useTranslation();
    const activeTabId = useTabStore((state) => state.activeTabId);
    const activeTab = useTabStore((state) => state.tabs.find((tab) => tab.id === activeTabId));

    const displayTitle = title || activeTab?.title || '';

    return (
        <header
            className="flex items-center h-12 px-4 border-b flex-shrink-0"
            style={{
                backgroundColor: 'var(--color-surface-primary)',
                borderColor: 'var(--color-border)',
            }}
        >
            <h1 className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                {displayTitle}
            </h1>
        </header>
    );
}
