// viewer.h - UI drawing and image loading
#ifndef VIEWER_H
#define VIEWER_H

#include "../include/types.h"

// Load images from a folder into the viewer
void LoadFolderImages(AppState* state, const char* folderPath);

// Clear all loaded images
void ClearImages(AppState* state);

// Draw the viewer UI
void DrawViewer(AppState* state);

// Start the background loader thread
void StartLoaderThread(AppState* state);

#endif // VIEWER_H
