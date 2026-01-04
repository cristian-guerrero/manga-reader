/**
 * Main entry point for Manga Visor
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Disable pinch-to-zoom and ctrl+scroll zoom global handlers
if (typeof window !== 'undefined') {
    // Prevent Ctrl + Wheel zoom
    document.addEventListener('wheel', function (e) {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });

    // Prevent Pinch-to-zoom
    document.addEventListener('touchmove', function (e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // Prevent gesture events (Safari/iOS mostly, but good measure)
    document.addEventListener('gesturestart', function (e) {
        e.preventDefault();
    });

    // Prevent keyboard zoom shortcuts (Ctrl + / Ctrl -)
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=')) {
            e.preventDefault();
        }
    });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
