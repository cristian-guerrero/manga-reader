/**
 * Thumbnails Feature Types
 */

export interface ImageData {
    path: string;
    name: string;
    index: number;
    modTime?: number;
    thumbnailUrl?: string;
}
