/**
 * Custom Error Types
 * Provides typed error classes for better error handling
 */

export class AppError extends Error {
    constructor(
        message: string,
        public code?: string,
        public context?: Record<string, any>
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class NetworkError extends AppError {
    constructor(message: string = 'Network error occurred', context?: Record<string, any>) {
        super(message, 'NETWORK_ERROR', context);
        this.name = 'NetworkError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 'VALIDATION_ERROR', context);
        this.name = 'ValidationError';
    }
}

export class PermissionError extends AppError {
    constructor(message: string = 'Permission denied', context?: Record<string, any>) {
        super(message, 'PERMISSION_ERROR', context);
        this.name = 'PermissionError';
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found', context?: Record<string, any>) {
        super(message, 'NOT_FOUND_ERROR', context);
        this.name = 'NotFoundError';
    }
}
