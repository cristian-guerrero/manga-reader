/**
 * Wails Runtime Type Declarations
 */

declare global {
    interface Window {
        runtime?: {
            // Window controls
            WindowMinimise: () => void;
            WindowMaximise: () => void;
            WindowUnmaximise: () => void;
            WindowIsMaximised: () => Promise<boolean>;
            WindowToggleMaximise: () => void;
            WindowSetSize: (width: number, height: number) => void;
            WindowGetSize: () => Promise<{ w: number; h: number }>;
            WindowSetPosition: (x: number, y: number) => void;
            WindowGetPosition: () => Promise<{ x: number; y: number }>;
            WindowHide: () => void;
            WindowShow: () => void;
            WindowCenter: () => void;
            WindowSetTitle: (title: string) => void;
            WindowFullscreen: () => void;
            WindowUnfullscreen: () => void;
            WindowIsFullscreen: () => Promise<boolean>;

            // Application
            Quit: () => void;

            // Environment
            Environment: () => Promise<{
                buildType: string;
                platform: string;
                arch: string;
            }>;

            // Events
            EventsOn: (eventName: string, callback: (...args: unknown[]) => void) => () => void;
            EventsOff: (eventName: string, ...additionalEventNames: string[]) => void;
            EventsOnce: (eventName: string, callback: (...args: unknown[]) => void) => () => void;
            EventsOnMultiple: (eventName: string, callback: (...args: unknown[]) => void, maxCallbacks: number) => () => void;
            EventsEmit: (eventName: string, ...optionalData: unknown[]) => void;

            // Dialogs
            OpenDirectoryDialog: (options: {
                canCreateDirectories?: boolean;
                defaultDirectory?: string;
                title?: string;
            }) => Promise<string>;
            OpenFileDialog: (options: {
                canCreateDirectories?: boolean;
                defaultDirectory?: string;
                defaultFilename?: string;
                filters?: Array<{ displayName: string; pattern: string }>;
                showHiddenFiles?: boolean;
                title?: string;
            }) => Promise<string>;
            SaveFileDialog: (options: {
                canCreateDirectories?: boolean;
                defaultDirectory?: string;
                defaultFilename?: string;
                filters?: Array<{ displayName: string; pattern: string }>;
                showHiddenFiles?: boolean;
                title?: string;
            }) => Promise<string>;
            MessageDialog: (options: {
                title?: string;
                message: string;
                type?: 'info' | 'warning' | 'error' | 'question';
                buttons?: string[];
                defaultButton?: string;
                cancelButton?: string;
            }) => Promise<string>;

            // Browser
            BrowserOpenURL: (url: string) => void;

            // Clipboard
            ClipboardGetText: () => Promise<string>;
            ClipboardSetText: (text: string) => Promise<boolean>;

            // Logging
            LogPrint: (message: string) => void;
            LogTrace: (message: string) => void;
            LogDebug: (message: string) => void;
            LogInfo: (message: string) => void;
            LogWarning: (message: string) => void;
            LogError: (message: string) => void;
            LogFatal: (message: string) => void;
        };
    }
}

export { };
