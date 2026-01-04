/**
 * HomePage - Welcome screen with recent history and folder selection
 */

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../stores/navigationStore';

// Icons
const FolderPlusIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        <line x1="12" y1="11" x2="12" y2="17" />
        <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
);

const BookOpenIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

export function HomePage() {
    const { t } = useTranslation();
    const { navigate } = useNavigationStore();

    const handleSelectFolder = async () => {
        try {
            // TODO: Call Wails backend to select folder
            // const folder = await SelectFolder();
            // if (folder) {
            //   navigate('viewer', { folder });
            // }
            console.log('Select folder clicked');
            navigate('folders');
        } catch (error) {
            console.error('Failed to select folder:', error);
        }
    };

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: 'easeOut' },
        },
    };

    return (
        <motion.div
            className="flex flex-col items-center justify-center min-h-full px-8 py-12"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Hero Section */}
            <motion.div
                variants={itemVariants}
                className="flex flex-col items-center text-center max-w-2xl"
            >
                {/* Animated Logo */}
                <motion.div
                    className="relative mb-8"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: 'backOut' }}
                >
                    {/* Glow effect */}
                    <motion.div
                        className="absolute inset-0 rounded-full blur-3xl"
                        style={{ backgroundColor: 'var(--color-accent-glow)' }}
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 0.8, 0.5],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />

                    {/* Icon container */}
                    <div
                        className="relative flex items-center justify-center w-24 h-24 rounded-2xl"
                        style={{
                            background: 'var(--gradient-accent)',
                            boxShadow: 'var(--shadow-glow)',
                        }}
                    >
                        <motion.div
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ color: 'white' }}
                        >
                            <BookOpenIcon />
                        </motion.div>
                    </div>
                </motion.div>

                {/* Title */}
                <motion.h1
                    variants={itemVariants}
                    className="text-4xl font-bold mb-3 text-gradient"
                >
                    {t('home.welcome')}
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    variants={itemVariants}
                    className="text-lg mb-8"
                    style={{ color: 'var(--color-text-secondary)' }}
                >
                    {t('home.subtitle')}
                </motion.p>

                {/* CTA Button */}
                <motion.button
                    variants={itemVariants}
                    onClick={handleSelectFolder}
                    className="group flex items-center gap-3 px-8 py-4 rounded-xl text-white font-semibold text-lg
                     transition-all duration-300"
                    style={{
                        background: 'var(--gradient-accent)',
                        boxShadow: 'var(--shadow-md)',
                    }}
                    whileHover={{
                        scale: 1.02,
                        boxShadow: 'var(--shadow-glow)',
                    }}
                    whileTap={{ scale: 0.98 }}
                >
                    <FolderPlusIcon />
                    <span>{t('home.selectFolder')}</span>
                    <motion.div
                        className="transition-transform group-hover:translate-x-1"
                    >
                        <ArrowRightIcon />
                    </motion.div>
                </motion.button>
            </motion.div>

            {/* Recent History Section */}
            <motion.div
                variants={itemVariants}
                className="mt-16 w-full max-w-4xl"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2
                        className="text-xl font-semibold"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {t('home.recentlyRead')}
                    </h2>
                    <motion.button
                        onClick={() => navigate('history')}
                        className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                        style={{ color: 'var(--color-accent)' }}
                        whileHover={{
                            backgroundColor: 'var(--color-surface-tertiary)',
                        }}
                    >
                        {t('common.next')} →
                    </motion.button>
                </div>

                {/* Empty state or history cards */}
                <motion.div
                    className="flex flex-col items-center justify-center py-16 rounded-2xl"
                    style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        border: '1px solid var(--color-border)',
                    }}
                >
                    <motion.div
                        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                        style={{ backgroundColor: 'var(--color-surface-tertiary)' }}
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <BookOpenIcon />
                    </motion.div>
                    <p
                        className="text-lg font-medium mb-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {t('home.noHistory')}
                    </p>
                    <p
                        className="text-sm"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        {t('home.startReading')}
                    </p>
                </motion.div>
            </motion.div>

            {/* Decorative Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                {/* Top right gradient */}
                <div
                    className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                />
                {/* Bottom left gradient */}
                <div
                    className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-10"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                />
            </div>
        </motion.div>
    );
}

export default HomePage;
