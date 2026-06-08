/**
 * Explorer Types - Type definitions for explorer feature
 */

export interface BaseFolder {
    path: string;
    name: string;
    addedAt: string;
    isVisible: boolean;
    hasImages?: boolean;
    thumbnailUrl?: string;
}

export type ViewMode = 'grid' | 'list';

export interface ExplorerEntry {
    path: string;
    name: string;
    isDirectory: boolean;
    hasImages: boolean;
    imageCount: number;
    subdirectoryCount: number;
    coverImage: string;
    thumbnailUrl?: string;
    size: number;
    lastModified: number;
}

export interface RecentFolderEntry {
    folderPath: string;
    folderName: string;
    visitedAt: string;
    hasImages: boolean;
    thumbnailUrl?: string;
}

export const RECENTLY_VIEWED_SENTINEL = '__recently_viewed__';
