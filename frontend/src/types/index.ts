/**
 * Type Definitions - Manga Visor
 */

// ============================================================================
// Image & Folder Types
// ============================================================================

export interface ImageInfo {
    /** Full path to the image file */
    path: string;
    /** Shortened URL for the thumbnail */
    thumbnailUrl?: string;
    /** Shortened URL for the full image */
    imageUrl?: string;
    /** Filename only */
    name: string;
    /** File extension (lowercase, without dot) */
    extension: string;
    /** File size in bytes */
    size: number;
    /** Index in the current folder */
    index: number;
}

export interface FolderInfo {
    /** Full path to the folder */
    path: string;
    /** Folder name only */
    name: string;
    /** Number of images in the folder */
    imageCount: number;
    /** First image path for thumbnail */
    coverImage?: string;
    /** Shortened URL for the cover thumbnail */
    thumbnailUrl?: string;
    /** Last modified timestamp */
    lastModified: string;
}

// ============================================================================
// History Types
// ============================================================================

export interface HistoryEntry {
    /** Unique ID (hash of folder path) */
    id: string;
    /** Full path to the folder */
    folderPath: string;
    /** Folder name for display */
    folderName: string;
    /** Last viewed image filename */
    lastImage: string;
    /** Last viewed image index */
    lastImageIndex: number;
    /** Scroll position (0-1 for percentage) */
    scrollPosition: number;
    /** Total number of images in folder */
    totalImages: number;
    /** Last read timestamp (ISO string) */
    lastRead: string;
}

// ============================================================================
// Settings Types
// ============================================================================

export type ViewerMode = 'vertical' | 'lateral';
export type LateralMode = 'single' | 'double';
export type ReadingDirection = 'ltr' | 'rtl';

export interface Settings {
    /** Language code (en, es, etc.) */
    language: string;
    /** Theme ID */
    theme: string;
    /** Default viewer mode */
    viewerMode: ViewerMode;
    /** Width percentage for vertical viewer (10-100) */
    verticalWidth: number;
    /** Lateral viewer mode (single/double page) */
    lateralMode: LateralMode;
    /** Reading direction for lateral mode */
    readingDirection: ReadingDirection;
    /** Panic button key */
    panicKey: string;
    /** Last opened folder path */
    lastFolder: string;
    /** Sidebar collapsed state */
    sidebarCollapsed: boolean;
    /** Show image info overlay */
    showImageInfo: boolean;
    /** Preload adjacent images */
    preloadImages: boolean;
    /** Number of images to preload */
    /** Number of images to preload */
    preloadCount: number;
    /** Enable/Disable history tracking */
    /** Enable/Disable history tracking */
    enableHistory: boolean;
    /** Minimum image size in KB */
    minImageSize: number;
    /** Process dropped folders (add to library and save history) */
    processDroppedFolders: boolean;
    /** Last visited page (for startup restore) */
    lastPage: string;
}



export const DEFAULT_SETTINGS: Settings = {
    language: 'en',
    theme: 'dark',
    viewerMode: 'vertical',
    verticalWidth: 80,
    lateralMode: 'single',
    readingDirection: 'ltr',
    panicKey: 'Escape',
    lastFolder: '',
    sidebarCollapsed: false,
    showImageInfo: false,
    preloadImages: true,

    preloadCount: 3,

    enableHistory: true,
    minImageSize: 0,
    processDroppedFolders: true,
    lastPage: 'home',
};



// ============================================================================
// Image Order Types
// ============================================================================

export interface ImageOrder {
    /** Folder path */
    folderPath: string;
    /** Custom order (array of filenames) */
    customOrder: string[];
    /** Original order for reset */
    originalOrder: string[];
    /** When the order was modified */
    modifiedAt: string;
}

// ============================================================================
// Series Types
// ============================================================================

export interface ChapterInfo {
    path: string;
    name: string;
    coverImage?: string;
    imageCount: number;
    thumbnailUrl?: string;
}

export interface SeriesEntry {
    id: string;
    path: string;
    name: string;
    coverImage: string;
    thumbnailUrl?: string;
    addedAt: string;
    chapters: ChapterInfo[];
    isTemporary?: boolean;
}

// ============================================================================
// Navigation Types
// ============================================================================

export type PageType =
    | 'home'
    | 'viewer'
    | 'history'
    | 'folders'
    | 'series'
    | 'series-details'
    | 'thumbnails'
    | 'settings';

export interface NavigationState {
    currentPage: PageType;
    previousPage: PageType | null;
    params: Record<string, string>;
}

// ============================================================================
// UI Types
// ============================================================================

export interface ToastMessage {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message?: string;
    duration?: number;
}

export interface ContextMenuItem {
    id: string;
    label: string;
    icon?: string;
    shortcut?: string;
    disabled?: boolean;
    danger?: boolean;
    onClick: () => void;
}

// ============================================================================
// Viewer State Types
// ============================================================================

export interface ViewerState {
    /** Current folder being viewed */
    currentFolder: FolderInfo | null;
    /** All images in current folder */
    images: ImageInfo[];
    /** Currently viewed image index */
    currentIndex: number;
    /** Current viewer mode */
    mode: ViewerMode;
    /** Is loading images */
    isLoading: boolean;
    /** Current zoom level (1 = 100%) */
    zoomLevel: number;
    /** Scroll position (for vertical mode) */
    scrollPosition: number;
}

// ============================================================================
// Window Control Types (for Wails)
// ============================================================================

export interface WindowControls {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
}
