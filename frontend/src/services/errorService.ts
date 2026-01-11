/**
 * Error Service - Centralized error handling
 * Provides consistent error handling and user feedback across the application
 */

export enum ErrorType {
    NETWORK = 'network',
    VALIDATION = 'validation',
    PERMISSION = 'permission',
    NOT_FOUND = 'not_found',
    UNKNOWN = 'unknown'
}

export interface ErrorContext {
    component?: string;
    action?: string;
    details?: Record<string, any>;
}

class ErrorService {
    /**
     * Extract user-friendly error message from error
     */
    private getErrorMessage(error: unknown, context?: ErrorContext): string {
        if (error instanceof Error) {
            // Check for common error patterns
            const message = error.message.toLowerCase();
            
            if (message.includes('timeout') || message.includes('network')) {
                return 'Network error. Please check your connection.';
            }
            
            if (message.includes('permission') || message.includes('access denied')) {
                return 'Permission denied. Please check file/folder permissions.';
            }
            
            if (message.includes('not found') || message.includes('does not exist')) {
                return 'Resource not found.';
            }
            
            // Return original message if it's user-friendly
            if (error.message.length < 100) {
                return error.message;
            }
        }
        
        // Fallback messages based on context
        if (context?.action) {
            return `Failed to ${context.action}. Please try again.`;
        }
        
        return 'An unexpected error occurred. Please try again.';
    }

    /**
     * Log error to console with context
     */
    private logError(error: unknown, context?: ErrorContext): void {
        const contextStr = context 
            ? `[${context.component || 'Unknown'}${context.action ? `::${context.action}` : ''}]`
            : '[ErrorService]';
        
        console.error(`${contextStr}`, error);
        
        if (context?.details) {
            console.error('Error details:', context.details);
        }
    }

    /**
     * Handle error with optional user notification
     */
    handle(
        error: unknown,
        context?: ErrorContext,
        options: {
            showToast?: boolean;
            toastMessage?: string;
            logError?: boolean;
        } = {}
    ): void {
        const {
            showToast = true,
            toastMessage,
            logError = true
        } = options;

        // Log error
        if (logError) {
            this.logError(error, context);
        }

        // Show toast notification
        if (showToast) {
            const message = toastMessage || this.getErrorMessage(error, context);
            // Note: This requires toast to be available in context
            // Components should use useToast hook directly for now
            // Future: Could use a global toast store
            console.warn('[ErrorService] Toast notification requires useToast hook in component');
        }
    }

    /**
     * Handle error and return user-friendly message
     */
    handleAndGetMessage(
        error: unknown,
        context?: ErrorContext
    ): string {
        this.handle(error, context, { showToast: false });
        return this.getErrorMessage(error, context);
    }

    /**
     * Check if error is of specific type
     */
    getErrorType(error: unknown): ErrorType {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            
            if (message.includes('timeout') || message.includes('network')) {
                return ErrorType.NETWORK;
            }
            
            if (message.includes('permission') || message.includes('access')) {
                return ErrorType.PERMISSION;
            }
            
            if (message.includes('not found')) {
                return ErrorType.NOT_FOUND;
            }
        }
        
        return ErrorType.UNKNOWN;
    }
}

export const errorService = new ErrorService();
