/**
 * Base API - Common error handling utilities for API services
 * Provides consistent error handling patterns across all API services
 */

import { errorService, type ErrorContext } from '../errorService';

export interface APICallOptions<T> {
    /** Component name for error context */
    component: string;
    /** Action name for error context */
    action: string;
    /** Additional details for error context */
    details?: Record<string, any>;
    /** Default value to return on error (if not provided, will throw) */
    defaultValue?: T;
    /** Whether to show toast notification (default: false for API calls) */
    showToast?: boolean;
    /** Custom error message for toast */
    toastMessage?: string;
}

/**
 * Base API class with common error handling utilities
 */
export abstract class BaseAPI {
    /**
     * Execute an API call with standardized error handling
     * 
     * @param fn - Async function to execute
     * @param options - Error handling options
     * @returns Result of the function or defaultValue if error occurs
     * @throws Error if defaultValue is not provided
     */
    protected static async call<T>(
        fn: () => Promise<T>,
        options: APICallOptions<T>
    ): Promise<T> {
        const {
            component,
            action,
            details,
            defaultValue,
            showToast = false,
            toastMessage
        } = options;

        try {
            return await fn();
        } catch (error) {
            const context: ErrorContext = {
                component,
                action,
                details
            };

            errorService.handle(error, context, {
                showToast,
                toastMessage
            });

            // If defaultValue is provided, return it instead of throwing
            if (defaultValue !== undefined) {
                return defaultValue;
            }

            // Otherwise, rethrow the error
            throw error;
        }
    }

    /**
     * Execute an API call that should return a value or null on error
     * Convenience method for methods that return T | null
     */
    protected static async callOrNull<T>(
        fn: () => Promise<T>,
        options: Omit<APICallOptions<T | null>, 'defaultValue'>
    ): Promise<T | null> {
        return this.call(fn, {
            ...options,
            defaultValue: null as T | null
        });
    }

    /**
     * Execute an API call that should return an empty array on error
     * Convenience method for methods that return T[]
     */
    protected static async callOrEmpty<T>(
        fn: () => Promise<T[]>,
        options: Omit<APICallOptions<T[]>, 'defaultValue'>
    ): Promise<T[]> {
        return this.call(fn, {
            ...options,
            defaultValue: [] as T[]
        });
    }

    /**
     * Execute an API call that should return false on error
     * Convenience method for methods that return boolean
     */
    protected static async callOrFalse(
        fn: () => Promise<boolean>,
        options: Omit<APICallOptions<boolean>, 'defaultValue'>
    ): Promise<boolean> {
        return this.call(fn, {
            ...options,
            defaultValue: false
        });
    }

    /**
     * Execute a void API call that throws on error
     * Convenience method for methods that return Promise<void>
     */
    protected static async callVoid(
        fn: () => Promise<void>,
        options: Omit<APICallOptions<void>, 'defaultValue'>
    ): Promise<void> {
        return this.call(fn, {
            ...options
            // No defaultValue, so it will throw on error
        });
    }
}
