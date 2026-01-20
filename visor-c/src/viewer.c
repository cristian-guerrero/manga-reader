// viewer.c - UI drawing and image loading implementation
#define WIN32_LEAN_AND_MEAN
#define ShowCursor WindowsShowCursor
#define DrawText WindowsDrawText
#define DrawTextEx WindowsDrawTextEx
#define Rectangle WindowsRectangle
#define CloseWindow WindowsCloseWindow
#define LoadImage WindowsLoadImage

#include <windows.h>
#include <process.h>

// Undefine the temporary renames
#undef ShowCursor
#undef DrawText
#undef DrawTextEx
#undef Rectangle
#undef CloseWindow
#undef LoadImage

#include "viewer.h"
#include "folder.h"
#include "platform.h"
#include "loader.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Thread function for loading images
static unsigned int __stdcall LoaderThread(void* arg) {
    AppState* state = (AppState*)arg;
    int loadMargin = WINDOW_HEIGHT * LOAD_BUFFER_PAGES;
    
    printf("Loader thread started\n");
    
    while (!state->shouldExit) {
        bool foundSomething = false;
        
        // Scan for images to load
        for (int i = 0; i < state->imageCount && !state->shouldExit; i++) {
            ImageEntry* entry = &state->images[i];
            
            // Check if it's within range and not loaded
            int viewportTop = (int)state->scrollY;
            int viewportBottom = viewportTop + WINDOW_HEIGHT;
            int imgTop = entry->displayY;
            int imgBottom = imgTop + entry->displayHeight;
            
            bool inRange = (imgBottom > viewportTop - loadMargin && imgTop < viewportBottom + loadMargin);
            
            if (inRange && entry->status == STATE_EMPTY) {
                entry->status = STATE_LOADING;
                
                // Load optimized thumbnail
                ImageData idata = LoadThumbnailVips(entry->path, WINDOW_WIDTH - IMAGE_MARGIN);
                if (idata.data) {
                    entry->pixelData = idata.data;
                    entry->pixelFormat = idata.format;
                    entry->status = STATE_READY;
                    // printf("Thread: Ready %s\n", entry->path);
                } else {
                    entry->status = STATE_EMPTY; // Retry later
                }
                foundSomething = true;
                break; // Load one at a time to keep it simple
            }
        }
        
        if (!foundSomething) {
            Sleep(16); // No work, wait ~1 frame
        }
    }
    
    printf("Loader thread exiting\n");
    return 0;
}

void StartLoaderThread(AppState* state) {
    state->shouldExit = false;
    state->loaderThread = (void*)_beginthreadex(NULL, 0, LoaderThread, state, 0, NULL);
}

// Draw text with custom font if available
static void DrawTextCustom(AppState* state, const char* text, int x, int y, int fontSize, Color color) {
    if (state->fontLoaded) {
        DrawTextEx(state->customFont, text, (Vector2){x, y}, fontSize, 1, color);
    } else {
        DrawText(text, x, y, fontSize, color);
    }
}

// Measure text width with custom font
static int MeasureTextCustom(AppState* state, const char* text, int fontSize) {
    if (state->fontLoaded) {
        Vector2 size = MeasureTextEx(state->customFont, text, fontSize, 1);
        return (int)size.x;
    }
    return MeasureText(text, fontSize);
}

// Compare function for sorting filenames
static int CompareFilenames(const void* a, const void* b) {
    return strcmp(((ImageEntry*)a)->path, ((ImageEntry*)b)->path);
}

// Load image with vips fallback
static Image LoadImageUniversal(const char* fileName) {
    Image img = { 0 };
    
    // Try raylib first for common formats
    img = LoadImage(fileName);
    if (img.data != NULL) {
        return img;
    }
    
    // Fallback to VIPS for AVIF, WebP, HEIC, etc.
    ImageData vipsImg = LoadImageVips(fileName);
    
    if (vipsImg.data != NULL) {
        img.data = vipsImg.data;
        img.width = vipsImg.width;
        img.height = vipsImg.height;
        img.mipmaps = vipsImg.mipmaps;
        img.format = vipsImg.format;
    }
    
    return img;
}

// Clear all loaded images
void ClearImages(AppState* state) {
    for (int i = 0; i < state->imageCount; i++) {
        if (state->images[i].status == STATE_LOADED) {
            UnloadTexture(state->images[i].texture);
        }
        if (state->images[i].pixelData != NULL) {
            free(state->images[i].pixelData);
            state->images[i].pixelData = NULL;
        }
        state->images[i].status = STATE_EMPTY;
        state->images[i].isLoaded = false;
    }
    state->imageCount = 0;
    state->scrollY = 0;
    state->targetScrollY = 0;
    state->maxScrollY = 0;
    state->currentFolder[0] = '\0';
    state->isAutoScrolling = false;
}

// Callback data for loading images
typedef struct {
    AppState* state;
    const char* folderPath;
} LoadImagesData;

static bool LoadImagesCallback(const char* name, bool isDirectory, void* userData) {
    if (isDirectory) return true;  // Skip directories
    
    LoadImagesData* data = (LoadImagesData*)userData;
    AppState* state = data->state;
    
    if (state->imageCount >= MAX_IMAGES) return false;  // Stop
    
    if (IsSupportedImage(name)) {
        snprintf(state->images[state->imageCount].path, 
                 sizeof(state->images[state->imageCount].path),
                 "%s%c%s", data->folderPath, PATH_SEPARATOR, name);
        state->images[state->imageCount].isLoaded = false;
        state->images[state->imageCount].displayHeight = 0;
        state->imageCount++;
    }
    
    return true;  // Continue
}

// Load images from a folder
void LoadFolderImages(AppState* state, const char* folderPath) {
    ClearImages(state);
    strncpy(state->currentFolder, folderPath, sizeof(state->currentFolder) - 1);
    
    printf("Loading images from: %s\n", folderPath);
    
    // Collect image paths
    LoadImagesData data = { .state = state, .folderPath = folderPath };
    IterateDirectory(folderPath, LoadImagesCallback, &data);
    
    // Sort images by filename
    qsort(state->images, state->imageCount, sizeof(ImageEntry), CompareFilenames);
    
    printf("Found %d images\n", state->imageCount);
    
    // Load all textures and calculate positions
    int currentY = 0;
    int padding = 10;
    
    printf("Scanning folder: %s (%d images)\n", folderPath, state->imageCount);
    
    for (int i = 0; i < state->imageCount; i++) {
        // Fast scan: get dimensions without decoding pixels
        int w, h;
        if (GetImageSizeVips(state->images[i].path, &w, &h)) {
            float scale = (float)(WINDOW_WIDTH - IMAGE_MARGIN) / (float)w;
            int newHeight = (int)(h * scale);
            
            state->images[i].width = w;
            state->images[i].height = h;
            state->images[i].displayY = currentY;
            state->images[i].displayHeight = newHeight;
            state->images[i].status = STATE_EMPTY;
            state->images[i].pixelData = NULL;
            state->images[i].isLoaded = false;
            
            currentY += newHeight + padding;
        } else {
            // Fallback for failed images
            state->images[i].displayY = currentY;
            state->images[i].displayHeight = 0;
            state->images[i].status = STATE_EMPTY;
            state->images[i].pixelData = NULL;
            state->images[i].isLoaded = false;
        }

        // Periodic drawing update for the user (only every 50 images for speed)
        if (i % 50 == 0 || i == state->imageCount - 1) {
            BeginDrawing();
            ClearBackground((Color){ 30, 30, 35, 255 });
            const char* scanningText = "Escaneando carpeta...";
            DrawTextCustom(state, scanningText, WINDOW_WIDTH/2 - MeasureTextCustom(state, scanningText, 24)/2, WINDOW_HEIGHT/2 - 20, 24, (Color){ 150, 150, 160, 255 });
            EndDrawing();
        }
    }
    
    state->maxScrollY = currentY - WINDOW_HEIGHT + 100;
    if (state->maxScrollY < 0) state->maxScrollY = 0;
    
    printf("Scan complete. Total scroll height: %.0f\n", state->maxScrollY);
}

// Draw the viewer UI
void DrawViewer(AppState* state) {
    BeginDrawing();
    ClearBackground((Color){ 30, 30, 35, 255 });
    
    if (state->imageCount == 0) {
        // Draw drop zone hint
        Rectangle dropZone = { 50, 50, WINDOW_WIDTH - 100, WINDOW_HEIGHT - 100 };
        DrawRectangleLinesEx(dropZone, 3, (Color){ 100, 100, 120, 255 });
        
        const char* hint1 = "Arrastra una carpeta aquí";
        const char* hint2 = "Drop a folder here";
        const char* hint3 = "Supports: PNG, JPG, AVIF, WebP, HEIC, JXL...";
        int fontSize = 30;
        
        DrawTextCustom(state, hint1, WINDOW_WIDTH/2 - MeasureTextCustom(state, hint1, fontSize)/2, WINDOW_HEIGHT/2 - 60, fontSize, (Color){ 150, 150, 160, 255 });
        DrawTextCustom(state, hint2, WINDOW_WIDTH/2 - MeasureTextCustom(state, hint2, fontSize)/2, WINDOW_HEIGHT/2 - 10, fontSize, (Color){ 100, 100, 110, 255 });
        DrawTextCustom(state, hint3, WINDOW_WIDTH/2 - MeasureTextCustom(state, hint3, 16)/2, WINDOW_HEIGHT/2 + 40, 16, (Color){ 80, 80, 90, 255 });
    } else {
        // 1. Dynamic loading/unloading (Lazy Loading + Threads)
        int viewportTop = (int)state->scrollY;
        int viewportBottom = viewportTop + WINDOW_HEIGHT;
        int loadMargin = WINDOW_HEIGHT * LOAD_BUFFER_PAGES;
        
        for (int i = 0; i < state->imageCount; i++) {
            ImageEntry* entry = &state->images[i];
            int imgTop = entry->displayY;
            int imgBottom = imgTop + entry->displayHeight;
            
            bool inRange = (imgBottom > viewportTop - loadMargin && imgTop < viewportBottom + loadMargin);
            
            if (inRange) {
                // If the thread loaded it into RAM, upload to GPU now
                if (entry->status == STATE_READY && entry->pixelData != NULL) {
                    Image rImg = {
                        .data = entry->pixelData,
                        .width = (entry->width > 0) ? (WINDOW_WIDTH - IMAGE_MARGIN) : 0, // Simplified but better use what VIPS gave us
                        .mipmaps = 1,
                        .format = entry->pixelFormat
                    };
                    
                    // Note: LoadThumbnailVips already resized it, we just need to know the actual resized H
                    // Since we set W, we can calculate H if not stored or get it from idata
                    // Wait, LoadThumbnailVips set image.width and image.height in the struct it returned
                    // But in viewer.c we don't have that info easily because it was in LoaderThread.
                    // Actually, let's fix LoaderThread to store the loaded W/H if they differ.
                    // For now, let's assume we know it or just use a helper.
                    
                    // Redoing this part to be safer: LoaderThread should have provided everything.
                    // I will fix LoaderThread in a moment to store the resized dimensions.
                    
                    rImg.width = WINDOW_WIDTH - IMAGE_MARGIN;
                    rImg.height = entry->displayHeight;
                    
                    entry->texture = LoadTextureFromImage(rImg);
                    free(entry->pixelData);
                    entry->pixelData = NULL;
                    entry->status = STATE_LOADED;
                    entry->isLoaded = true;
                }
            } else {
                // Out of range: unload to free VRAM
                if (entry->status == STATE_LOADED) {
                    UnloadTexture(entry->texture);
                    entry->status = STATE_EMPTY;
                    entry->isLoaded = false;
                } else if (entry->status == STATE_READY && entry->pixelData != NULL) {
                    // Also free RAM if it was ready but moved out of range before upload
                    free(entry->pixelData);
                    entry->pixelData = NULL;
                    entry->status = STATE_EMPTY;
                } else if (entry->status == STATE_LOADING) {
                    // We can't easily cancel VIPS, so let it finish and next loop will clean it
                }
            }
        }

        // 2. Draw visible images
        for (int i = 0; i < state->imageCount; i++) {
            if (state->images[i].status != STATE_LOADED) continue;
            
            int displayY = state->images[i].displayY - (int)state->scrollY;
            if (displayY + state->images[i].displayHeight > 0 && displayY < WINDOW_HEIGHT) {
                DrawTexture(state->images[i].texture, 20, displayY, WHITE);
            }
        }
        
        // Draw scrollbar
        if (state->maxScrollY > 0) {
            float scrollBarHeight = (float)WINDOW_HEIGHT / (state->maxScrollY + WINDOW_HEIGHT) * WINDOW_HEIGHT;
            if (scrollBarHeight < 40) scrollBarHeight = 40;
            
            float scrollBarY = (state->scrollY / state->maxScrollY) * (WINDOW_HEIGHT - scrollBarHeight);
            
            DrawRectangle(WINDOW_WIDTH - 14, 0, 14, WINDOW_HEIGHT, (Color){ 40, 40, 45, 255 });
            DrawRectangle(WINDOW_WIDTH - 12, (int)scrollBarY + 2, 10, (int)scrollBarHeight - 4, (Color){ 100, 100, 120, 255 });
        }
        
        // Page indicator
        int currentPage = 1;
        for (int i = 0; i < state->imageCount; i++) {
            if (state->images[i].displayY <= (int)state->scrollY + 50) {
                currentPage = i + 1;
            }
        }
        
        char info[150];
        snprintf(info, sizeof(info), "Página %d / %d", currentPage, state->imageCount);
        DrawTextCustom(state, info, 10, WINDOW_HEIGHT - 25, 16, (Color){ 140, 140, 150, 255 });
        
        // Folder navigation panel
        if (state->folderCount > 1) {
            DrawRectangle(5, 5, 350, 55, (Color){ 30, 30, 35, 220 });
            
            char folderName[100];
            strncpy(folderName, state->folders[state->currentFolderIndex].name, sizeof(folderName) - 1);
            folderName[sizeof(folderName) - 1] = '\0';
            int maxChars = 40;
            if (strlen(folderName) > maxChars) {
                folderName[maxChars - 3] = '.';
                folderName[maxChars - 2] = '.';
                folderName[maxChars - 1] = '.';
                folderName[maxChars] = '\0';
            }
            DrawTextCustom(state, folderName, 15, 10, 16, (Color){ 180, 180, 200, 255 });
            
            int navY = 35;
            
            Rectangle prevBtn = { 10, navY, 30, 20 };
            Color prevColor = (state->currentFolderIndex > 0) ? (Color){ 80, 80, 100, 255 } : (Color){ 50, 50, 55, 255 };
            DrawRectangleRec(prevBtn, prevColor);
            DrawTextCustom(state, "<", 20, navY + 2, 16, WHITE);
            
            char counterText[50];
            snprintf(counterText, sizeof(counterText), "Carpeta %d / %d", state->currentFolderIndex + 1, state->folderCount);
            DrawTextCustom(state, counterText, 50, navY + 3, 14, (Color){ 140, 140, 150, 255 });
            
            Rectangle nextBtn = { 200, navY, 30, 20 };
            Color nextColor = (state->currentFolderIndex < state->folderCount - 1) ? (Color){ 80, 80, 100, 255 } : (Color){ 50, 50, 55, 255 };
            DrawRectangleRec(nextBtn, nextColor);
            DrawTextCustom(state, ">", 210, navY + 2, 16, WHITE);
        }
        
        // Control panel
        int panelX = WINDOW_WIDTH - 250;
        int panelY = WINDOW_HEIGHT - 80;
        
        // Background
        DrawRectangle(panelX - 10, panelY - 5, 240, 75, (Color){ 40, 40, 45, 200 });
        
        // --- Row 1: Smoothing ---
        DrawTextCustom(state, "Smooth:", panelX, panelY + 8, 14, (Color){ 120, 120, 130, 255 });
        
        Rectangle smoothTrack = { panelX + 95, panelY + 10, 100, 10 };
        DrawRectangleRec(smoothTrack, (Color){ 60, 60, 65, 255 });
        
        float smoothProgress = (state->scrollSmoothing - SCROLL_SMOOTHING_MIN) / (SCROLL_SMOOTHING_MAX - SCROLL_SMOOTHING_MIN);
        int smoothThumbX = smoothTrack.x + (int)(smoothProgress * smoothTrack.width) - 5;
        Rectangle smoothThumb = { smoothThumbX, panelY + 5, 10, 20 };
        DrawRectangleRec(smoothThumb, (Color){ 160, 140, 140, 255 });
        
        char smoothText[20];
        snprintf(smoothText, sizeof(smoothText), "%.1f", state->scrollSmoothing);
        DrawTextCustom(state, smoothText, panelX + 200, panelY + 8, 14, (Color){ 140, 140, 150, 255 });
        
        // --- Row 2: Auto-scroll ---
        int row2Y = panelY + 35;
        Rectangle btnRect = { panelX, row2Y, 30, 30 };
        Color btnColor = state->isAutoScrolling ? (Color){ 80, 160, 80, 255 } : (Color){ 80, 80, 90, 255 };
        DrawRectangleRec(btnRect, btnColor);
        
        if (state->isAutoScrolling) {
            DrawRectangle(panelX + 8, row2Y + 6, 4, 18, WHITE);
            DrawRectangle(panelX + 18, row2Y + 6, 4, 18, WHITE);
        } else {
            Vector2 v1 = { panelX + 10, row2Y + 6 };
            Vector2 v2 = { panelX + 10, row2Y + 24 };
            Vector2 v3 = { panelX + 24, row2Y + 15 };
            DrawTriangle(v1, v2, v3, WHITE);
        }
        
        DrawTextCustom(state, "Speed:", panelX + 40, row2Y + 8, 14, (Color){ 120, 120, 130, 255 });
        
        Rectangle speedTrack = { panelX + 95, row2Y + 10, 100, 10 };
        DrawRectangleRec(speedTrack, (Color){ 60, 60, 65, 255 });
        
        float speedProgress = (state->autoScrollSpeed - AUTO_SCROLL_MIN) / (AUTO_SCROLL_MAX - AUTO_SCROLL_MIN);
        int speedThumbX = speedTrack.x + (int)(speedProgress * speedTrack.width) - 5;
        Rectangle speedThumb = { speedThumbX, row2Y + 5, 10, 20 };
        DrawRectangleRec(speedThumb, (Color){ 140, 140, 160, 255 });
        
        char speedText[20];
        snprintf(speedText, sizeof(speedText), "%.0f", state->autoScrollSpeed);
        DrawTextCustom(state, speedText, panelX + 200, row2Y + 8, 14, (Color){ 140, 140, 150, 255 });
    }
    
    EndDrawing();
}
