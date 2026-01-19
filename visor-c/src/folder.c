// folder.c - Folder navigation and scanning implementation
#include "folder.h"
#include "platform.h"
#include "viewer.h"
#include <stdio.h>
#include <string.h>
#include <strings.h>

// Supported image extensions
const char* supportedExtensions[] = {
    ".png", ".jpg", ".jpeg", ".bmp", ".tga", ".gif", 
    ".qoi", ".psd", ".hdr", ".avif", ".webp", ".heic",
    ".heif", ".jxl", ".tiff", ".tif", NULL
};

// Check if filename has a supported image extension
bool IsSupportedImage(const char* filename) {
    const char* ext = strrchr(filename, '.');
    if (!ext) return false;
    
    for (int i = 0; supportedExtensions[i] != NULL; i++) {
        if (strcasecmp(ext, supportedExtensions[i]) == 0) {
            return true;
        }
    }
    return false;
}

// Callback data for FolderHasImages
typedef struct {
    bool hasImages;
} HasImagesData;

static bool HasImagesCallback(const char* name, bool isDirectory, void* userData) {
    if (isDirectory) return true;  // Continue
    
    HasImagesData* data = (HasImagesData*)userData;
    if (IsSupportedImage(name)) {
        data->hasImages = true;
        return false;  // Stop iteration
    }
    return true;  // Continue
}

// Check if a folder contains any supported images
bool FolderHasImages(const char* folderPath) {
    HasImagesData data = { .hasImages = false };
    IterateDirectory(folderPath, HasImagesCallback, &data);
    return data.hasImages;
}

// Get folder basename from path
void GetFolderName(const char* path, char* name, int maxLen) {
    const char* lastSep = strrchr(path, PATH_SEPARATOR);
    if (lastSep) {
        strncpy(name, lastSep + 1, maxLen - 1);
    } else {
        strncpy(name, path, maxLen - 1);
    }
    name[maxLen - 1] = '\0';
}

// Callback data for ScanFoldersWithImages
typedef struct {
    AppState* state;
    const char* rootPath;
} ScanFoldersData;

static bool ScanFoldersCallback(const char* name, bool isDirectory, void* userData) {
    if (!isDirectory) return true;  // Skip files
    
    ScanFoldersData* data = (ScanFoldersData*)userData;
    AppState* state = data->state;
    
    if (state->folderCount >= MAX_FOLDERS) return false;  // Stop
    
    char subPath[600];
    snprintf(subPath, sizeof(subPath), "%s%c%s", data->rootPath, PATH_SEPARATOR, name);
    
    if (FolderHasImages(subPath)) {
        strncpy(state->folders[state->folderCount].path, subPath, 
                sizeof(state->folders[0].path) - 1);
        strncpy(state->folders[state->folderCount].name, name, 
                sizeof(state->folders[0].name) - 1);
        state->folderCount++;
    }
    
    return true;  // Continue
}

// Scan root folder and subfolders for folders with images
void ScanFoldersWithImages(AppState* state, const char* rootPath) {
    state->folderCount = 0;
    state->currentFolderIndex = 0;
    
    // Check if root folder has images
    if (FolderHasImages(rootPath)) {
        strncpy(state->folders[state->folderCount].path, rootPath, 
                sizeof(state->folders[0].path) - 1);
        GetFolderName(rootPath, state->folders[state->folderCount].name, 
                      sizeof(state->folders[0].name));
        state->folderCount++;
    }
    
    // Scan subfolders (first level only)
    ScanFoldersData data = { .state = state, .rootPath = rootPath };
    IterateDirectory(rootPath, ScanFoldersCallback, &data);
    
    printf("Found %d folders with images\n", state->folderCount);
}

// Navigate to next/previous folder
void NavigateFolder(AppState* state, int direction) {
    if (state->folderCount <= 1) return;
    
    int newIndex = state->currentFolderIndex + direction;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= state->folderCount) newIndex = state->folderCount - 1;
    
    if (newIndex != state->currentFolderIndex) {
        state->currentFolderIndex = newIndex;
        LoadFolderImages(state, state->folders[newIndex].path);
    }
}
