/**
 * WelcomeView - Welcome screen when there's no history
 */

import { useTranslation } from 'react-i18next';
import { Button } from '@shared/components';
import { FolderPlusIcon, BookOpenIcon, ArrowRightIcon } from './HomeIcons';

interface WelcomeViewProps {
    onSelectFolder: () => void;
    onViewHistory: () => void;
}

export function WelcomeView({ onSelectFolder, onViewHistory }: WelcomeViewProps) {
    const { t } = useTranslation();

    return (
        <div
            className="flex flex-col items-center text-center max-w-2xl animate-scale-in"
        >
            {/* Animated Logo */}
            <div
                className="relative mb-8"
            >
                {/* Glow effect */}
                <div
                    className="absolute inset-0 rounded-full blur-3xl animate-pulse-slow"
                    style={{
                        backgroundColor: 'var(--color-accent-glow)',
                        animationDuration: '3s'
                    }}
                />

                {/* Icon container */}
                <div
                    className="relative flex items-center justify-center w-24 h-24 rounded-2xl"
                    style={{
                        background: 'var(--gradient-accent)',
                        boxShadow: 'var(--shadow-glow)',
                        animation: 'rotateLogo 4s ease-in-out infinite'
                    }}
                >
                    <div style={{ color: 'white' }}>
                        <BookOpenIcon />
                    </div>
                </div>
            </div>

            {/* Title */}
            <h1
                className="text-4xl font-bold mb-3 text-gradient animate-slide-in-right"
            >
                {t('home.welcome')}
            </h1>

            {/* Subtitle */}
            <p
                className="text-lg mb-8 animate-slide-in-right"
                style={{ color: 'var(--color-text-secondary)', animationDelay: '0.1s' }}
            >
                {t('home.subtitle')}
            </p>

            {/* CTA Button */}
            <Button
                onClick={onSelectFolder}
                variant="primary"
                size="lg"
                className="group gap-3 px-8 py-4 rounded-xl text-lg animate-slide-in-right"
                style={{
                    background: 'var(--gradient-accent)',
                    boxShadow: 'var(--shadow-md)',
                    animationDelay: '0.2s'
                }}
            >
                <FolderPlusIcon />
                <span>{t('home.selectFolder')}</span>
                <div
                    className="transition-transform group-hover:translate-x-1"
                >
                    <ArrowRightIcon />
                </div>
            </Button>

            {/* Link to history */}
            <div
                className="mt-16 w-full max-w-4xl flex justify-center animate-fade-in"
                style={{ animationDelay: '0.4s' }}
            >
                <button
                    onClick={onViewHistory}
                    className="text-sm font-medium px-6 py-2 rounded-full transition-all border border-white/5 bg-surface-secondary text-text-secondary hover:text-white hover:bg-surface-tertiary hover:scale-105 active:scale-95"
                >
                    {t('common.history')} →
                </button>
            </div>
        </div>
    );
}
