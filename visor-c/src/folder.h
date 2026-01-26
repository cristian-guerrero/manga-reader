// folder.h - Folder navigation and scanning
#ifndef FOLDER_H
#define FOLDER_H

#include "../include/types.h"

// Check if filename has a supported image extension
bool IsSupportedImage(const char* filename);

// Check if a folder contains any supported images
bool FolderHasImages(const char* folderPath);

// Get folder basename from path
void GetFolderName(const char* path, char* name, int maxLen);

// Scan root folder and subfolders for folders with images
void ScanFoldersWithImages(AppState* state, const char* rootPath);

// Navigate to next/previous folder
void NavigateFolder(AppState* state, int direction);

#endif // FOLDER_H
