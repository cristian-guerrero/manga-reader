/**
 * Home Feature Types
 */

export interface HistoryEntry {
    id: string;
    folderPath: string;
    folderName: string;
    lastImage: string;
    lastImageIndex: number;
    scrollPosition: number;
    totalImages: number;
    lastRead: string;
}
