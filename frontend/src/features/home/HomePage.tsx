/**
 * HomePage - Main home page refactored with hooks and components
 * Separated concerns: hooks handle logic, components handle UI
 */

import { useTranslation } from 'react-i18next';
import { useNavigation } from '@hooks';
import { useHomeHistory, useHomeActions } from './hooks';
import { FeaturedCard } from './components/FeaturedCard';
import { RecentHistoryGrid } from './components/RecentHistoryGrid';
import { WelcomeView } from './components/WelcomeView';

export function HomePage() {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { historyEntries } = useHomeHistory();
    const {
        handleContinue,
        handleAuxClick,
        handleRemoveHistory,
        handleSelectFolder,
    } = useHomeActions();

    const handleViewFullHistory = () => {
        navigate('history');
    };

    return (
        <div
            className="flex flex-col items-center min-h-full px-8 py-12 animate-fade-in"
        >
            {historyEntries.length > 0 ? (
                <div className="w-full max-w-6xl space-y-12">
                    {/* Featured Recent Item (The very last one read) */}
                    <FeaturedCard
                        entry={historyEntries[0]}
                        onContinue={handleContinue}
                        onAuxClick={handleAuxClick}
                        onRemove={handleRemoveHistory}
                    />

                    {/* Other Recent Items Grid */}
                    {historyEntries.length > 1 && (
                        <RecentHistoryGrid
                            entries={historyEntries.slice(1)}
                            onContinue={handleContinue}
                            onAuxClick={handleAuxClick}
                            onRemove={handleRemoveHistory}
                            onViewFullHistory={handleViewFullHistory}
                        />
                    )}
                </div>
            ) : (
                <WelcomeView
                    onSelectFolder={handleSelectFolder}
                    onViewHistory={handleViewFullHistory}
                />
            )}

            {/* Link to full history if displaying welcome screen or if we want to provide access */}
            {historyEntries.length > 0 && (
                <div
                    className="mt-16 w-full max-w-4xl flex justify-center animate-fade-in"
                    style={{ animationDelay: '0.4s' }}
                >
                    <button
                        onClick={handleViewFullHistory}
                        className="text-sm font-medium px-6 py-2 rounded-full transition-all border border-white/5 bg-surface-secondary text-text-secondary hover:text-white hover:bg-surface-tertiary hover:scale-105 active:scale-95"
                    >
                        {t('common.history')} →
                    </button>
                </div>
            )}

            {/* Decorative Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                {/* Top right gradient */}
                <div
                    className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20 animate-pulse-slow"
                    style={{ backgroundColor: 'var(--color-accent)', animationDuration: '4s' }}
                />
                {/* Bottom left gradient */}
                <div
                    className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-10 animate-pulse-slow"
                    style={{ backgroundColor: 'var(--color-accent)', animationDuration: '5s' }}
                />
            </div>
        </div>
    );
}

export default HomePage;
