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

export interface ExplorerEntry {
    path: string;
    name: string;
    isDirectory: boolean;
    hasImages: boolean;
    imageCount: number;
    coverImage: string;
    thumbnailUrl?: string;
    size: number;
    lastModified: number;
}
