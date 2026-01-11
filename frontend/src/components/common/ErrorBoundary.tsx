/**
 * Error Boundary - Catches React errors and displays a fallback UI
 * Prevents the entire app from crashing when a component throws an error
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Must be a class component (React doesn't support hooks in error boundaries yet)
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console
        console.error('[ErrorBoundary] Caught an error:', error, errorInfo);

        // Update state with error info
        this.setState({
            error,
            errorInfo,
        });

        // Call optional error handler
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
        }

        return this.props.children;
    }
}

/**
 * Default Error Fallback Component
 */
function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
    // Note: Can't use useTranslation here because it's not inside a provider
    // In a real app, you'd want to pass translations as props or use a different approach
    
    return (
        <div
            className="flex flex-col items-center justify-center min-h-screen p-8"
            style={{
                backgroundColor: 'var(--color-surface-primary)',
                color: 'var(--color-text-primary)',
            }}
        >
            <div className="max-w-2xl w-full text-center">
                {/* Error Icon */}
                <div
                    className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                    style={{
                        backgroundColor: 'var(--color-error)',
                        opacity: 0.1,
                    }}
                >
                    <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--color-error)"
                        strokeWidth="2"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>

                {/* Error Title */}
                <h1
                    className="text-2xl font-bold mb-4"
                    style={{ color: 'var(--color-text-primary)' }}
                >
                    Something went wrong
                </h1>

                {/* Error Message */}
                {error && (
                    <p
                        className="text-sm mb-6 p-4 rounded-lg"
                        style={{
                            backgroundColor: 'var(--color-surface-secondary)',
                            color: 'var(--color-text-secondary)',
                            fontFamily: 'monospace',
                        }}
                    >
                        {error.message || 'An unexpected error occurred'}
                    </p>
                )}

                {/* Actions */}
                <div className="flex gap-4 justify-center">
                    <Button
                        onClick={onReset}
                        variant="primary"
                    >
                        Try Again
                    </Button>
                    <Button
                        onClick={() => window.location.reload()}
                        variant="secondary"
                    >
                        Reload Page
                    </Button>
                </div>

                {/* Additional Info */}
                {(import.meta.env.DEV || import.meta.env.MODE === 'development') && error && (
                    <details className="mt-8 text-left">
                        <summary
                            className="cursor-pointer mb-2"
                            style={{ color: 'var(--color-text-secondary)' }}
                        >
                            Error Details (Development Only)
                        </summary>
                        <pre
                            className="text-xs p-4 rounded-lg overflow-auto max-h-64"
                            style={{
                                backgroundColor: 'var(--color-surface-secondary)',
                                color: 'var(--color-text-secondary)',
                            }}
                        >
                            {error.stack}
                        </pre>
                    </details>
                )}
            </div>
        </div>
    );
}

export default ErrorBoundary;
