/**
 * Toast - Notification toast component
 */

import { useEffect, useState, createContext, useContext, useCallback } from 'react';

// Icons
const SuccessIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

const ErrorIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
);

const InfoIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
);

const CloseIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

interface ToastContainerProps {
    toasts: Toast[];
    onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
}

interface ToastItemProps {
    toast: Toast;
    onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
    useEffect(() => {
        if (toast.duration) {
            const timer = setTimeout(() => onRemove(toast.id), toast.duration);
            return () => clearTimeout(timer);
        }
    }, [toast, onRemove]);

    const getIcon = () => {
        switch (toast.type) {
            case 'success':
                return <SuccessIcon />;
            case 'error':
                return <ErrorIcon />;
            default:
                return <InfoIcon />;
        }
    };

    const getColors = () => {
        switch (toast.type) {
            case 'success':
                return {
                    bg: 'rgba(34, 197, 94, 0.1)',
                    border: 'rgba(34, 197, 94, 0.3)',
                    icon: '#22c55e',
                };
            case 'error':
                return {
                    bg: 'rgba(239, 68, 68, 0.1)',
                    border: 'rgba(239, 68, 68, 0.3)',
                    icon: '#ef4444',
                };
            default:
                return {
                    bg: 'var(--color-surface-elevated)',
                    border: 'var(--color-border)',
                    icon: 'var(--color-accent)',
                };
        }
    };

    const colors = getColors();

    return (
        <div
            className="flex items-center gap-3 px-4 py-3 rounded-lg min-w-64 max-w-md animate-slide-in-right"
            style={{
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`,
                backdropFilter: 'blur(10px)',
            }}
        >
            <div style={{ color: colors.icon }}>{getIcon()}</div>
            <p
                className="flex-1 text-sm"
                style={{ color: 'var(--color-text-primary)' }}
            >
                {toast.message}
            </p>
            <button
                onClick={() => onRemove(toast.id)}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-transform hover:scale-110 active:scale-90"
                style={{ color: 'var(--color-text-muted)' }}
            >
                <CloseIcon />
            </button>
        </div>
    );
}

export default ToastProvider;
