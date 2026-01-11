/**
 * useErrorHandler - Hook for consistent error handling with toast notifications
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/common/Toast';
import { errorService, ErrorContext } from '../services/errorService';

/**
 * Hook that provides error handling with toast notifications
 */
export function useErrorHandler() {
    const { t } = useTranslation();
    const { showToast } = useToast();

    const handleError = useCallback((
        error: unknown,
        context?: ErrorContext,
        options: {
            toastType?: 'error' | 'info' | 'success';
            customMessage?: string;
            logError?: boolean;
        } = {}
    ) => {
        const {
            toastType = 'error',
            customMessage,
            logError = true
        } = options;

        // Log error
        if (logError) {
            errorService.handle(error, context, { showToast: false });
        }

        // Show toast
        const message = customMessage || errorService.handleAndGetMessage(error, context);
        showToast(message, toastType);
    }, [showToast, t]);

    return { handleError };
}
