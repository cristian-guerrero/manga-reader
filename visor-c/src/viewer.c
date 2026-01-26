// viewer.c - UI drawing and image loading implementation
#ifdef _WIN32
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
#else
    #include <pthread.h>
    #include <unistd.h>
#endif

#include "viewer.h"
#include "folder.h"
#include "platform.h"
#include "loader.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Cross-platform sleep function
static void SleepMs(int milliseconds) {
#ifdef _WIN32
    Sleep(milliseconds);
#else
    usleep(milliseconds * 1000);
#endif
}

// Thread function for loading images
#ifdef _WIN32
static unsigned int __stdcall LoaderThread(void* arg) {
#else
static void* LoaderThread(void* arg) {
#endif
    AppState* state = (AppState*)arg;
    
    printf("Loader thread started\n");
    
    while (!state->shouldExit) {
        // If paused, just wait
        if (state->loaderPaused) {
            SleepMs(10);
            continue;
        }
        
        bool foundSomething = false;
        
        // Use fixed buffer size (don't call GetScreenHeight from thread - not thread-safe)
        // Buffer of ~5 screens worth based on default window height
        int loadMargin = WINDOW_HEIGHT * LOAD_BUFFER_PAGES;
        
        // Scan for images to load (check pause frequently)
        for (int i = 0; i < state->imageCount && !state->shouldExit && !state->loaderPaused; i++) {
            ImageEntry* entry = &state->images[i];
            
            // Check if it's within range and not loaded
            int viewportTop = (int)state->scrollY;
            int viewportBottom = viewportTop + WINDOW_HEIGHT;  // Approximate
            int imgTop = entry->displayY;
            int imgBottom = imgTop + entry->displayHeight;
            
            bool inRange = (imgBottom > viewportTop - loadMargin && imgTop < viewportBottom + loadMargin);
            
            if (inRange && entry->status == STATE_EMPTY) {
                entry->status = STATE_LOADING;
                
                // Check pause again before heavy operation
                if (state->loaderPaused) {
                    entry->status = STATE_EMPTY;
                    break;
                }
                
                // Load optimized thumbnail
                ImageData idata = LoadThumbnailVips(entry->path, WINDOW_WIDTH - IMAGE_MARGIN);
                
                // Check if we should discard result (folder changed)
                if (state->loaderPaused) {
                    if (idata.data) free(idata.data);
                    entry->status = STATE_EMPTY;
                    break;
                }
                
                if (idata.data) {
                    entry->pixelData = idata.data;
                    entry->pixelFormat = idata.format;
                    entry->status = STATE_READY;
                } else {
                    entry->status = STATE_ERROR; // Don't retry
                    printf("Loader: Failed to load %s\n", entry->path);
                }
                foundSomething = true;
                break; // Load one at a time to keep it simple
            }
        }
        
        if (!foundSomething) {
            SleepMs(16); // No work, wait ~1 frame
        }
    }
    
    printf("Loader thread exiting\n");
    return 0;
}

void StartLoaderThread(AppState* state) {
    state->shouldExit = false;
#ifdef _WIN32
    state->loaderThread = (void*)_beginthreadex(NULL, 0, LoaderThread, state, 0, NULL);
#else
    pthread_t* thread = (pthread_t*)malloc(sizeof(pthread_t));
    pthread_create(thread, NULL, LoaderThread, state);
    state->loaderThread = (void*)thread;
#endif
}

void StopLoaderThread(AppState* state) {
    if (!state->loaderThread) return;
    
    state->shouldExit = true;
    
#ifdef _WIN32
    WaitForSingleObject((HANDLE)state->loaderThread, INFINITE);
    CloseHandle((HANDLE)state->loaderThread);
#else
    pthread_t* thread = (pthread_t*)state->loaderThread;
    pthread_join(*thread, NULL);
    free(thread);
#endif
    
    state->loaderThread = NULL;
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
    // Pause loader thread and wait for it to stop loading
    state->loaderPaused = true;
    SleepMs(50);  // Give thread time to finish current operation
    
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
            int screenWidth = GetScreenWidth();
            int screenHeight = GetScreenHeight();
            
            // Show progress with image count (simpler and UTF-8 safe)
            char scanningText[100];
            snprintf(scanningText, sizeof(scanningText), "Escaneando... %d imagenes", state->imageCount);
            
            BeginDrawing();
            ClearBackground((Color){ 30, 30, 35, 255 });
            DrawTextCustom(state, scanningText, screenWidth/2 - MeasureTextCustom(state, scanningText, 24)/2, screenHeight/2 - 20, 24, (Color){ 150, 150, 160, 255 });
            EndDrawing();
        }
    }
    
    state->maxScrollY = currentY - GetScreenHeight() + 100;
    if (state->maxScrollY < 0) state->maxScrollY = 0;
    
    // Resume loader thread
    state->loaderPaused = false;
    
    printf("Scan complete. Total scroll height: %.0f\n", state->maxScrollY);
}

// Draw the viewer UI
void DrawViewer(AppState* state) {
    BeginDrawing();
    ClearBackground((Color){ 30, 30, 35, 255 });
    
    // Get current window dimensions
    int screenWidth = GetScreenWidth();
    int screenHeight = GetScreenHeight();
    
    if (state->imageCount == 0) {
        // Draw drop zone hint - centered in current window
        Rectangle dropZone = { 50, 50, screenWidth - 100, screenHeight - 100 };
        DrawRectangleLinesEx(dropZone, 3, (Color){ 100, 100, 120, 255 });
        
        const char* hint1 = "こんにち世界";
        const char* hint2 = "Drop a folder here";
        const char* hint3 = "Supports: PNG, JPG, AVIF, WebP, HEIC, JXL...";
        int fontSize = 30;
        
        DrawTextCustom(state, hint1, screenWidth/2 - MeasureTextCustom(state, hint1, fontSize)/2, screenHeight/2 - 60, fontSize, (Color){ 150, 150, 160, 255 });
        DrawTextCustom(state, hint2, screenWidth/2 - MeasureTextCustom(state, hint2, fontSize)/2, screenHeight/2 - 10, fontSize, (Color){ 100, 100, 110, 255 });
        DrawTextCustom(state, hint3, screenWidth/2 - MeasureTextCustom(state, hint3, 16)/2, screenHeight/2 + 40, 16, (Color){ 80, 80, 90, 255 });
    } else {
        // 1. Dynamic loading/unloading (Lazy Loading + Threads)
        int viewportTop = (int)state->scrollY;
        int viewportBottom = viewportTop + screenHeight;
        int loadMargin = screenHeight * LOAD_BUFFER_PAGES;
        
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

        // 2. Draw visible images with dynamic sizing/centering
        int imageBaseWidth = WINDOW_WIDTH - IMAGE_MARGIN;  // Original loaded width
        int availableWidth = screenWidth - SCROLLBAR_WIDTH;  // Available space (minus scrollbar)
        float globalScale = (availableWidth < imageBaseWidth) 
            ? (float)(availableWidth - 20) / (float)imageBaseWidth 
            : 1.0f;
        
        // Calculate dynamic Y positions based on scale
        int dynamicY = 0;
        int padding = 10;
        
        for (int i = 0; i < state->imageCount; i++) {
            ImageEntry* entry = &state->images[i];
            
            // Calculate scaled height for this image
            int scaledHeight = (int)(entry->displayHeight * globalScale);
            
            // Check if visible (based on dynamic position)
            int displayY = dynamicY - (int)state->scrollY;
            
            if (displayY + scaledHeight > 0 && displayY < screenHeight) {
                if (entry->status == STATE_LOADED) {
                    Texture2D tex = entry->texture;
                    
                    if (globalScale >= 1.0f) {
                        // Window is wider or same: center the image at original size
                        int centerX = (availableWidth - tex.width) / 2;
                        DrawTexture(tex, centerX, displayY, WHITE);
                    } else {
                        // Window is narrower: scale down to fit
                        int scaledWidth = (int)(tex.width * globalScale);
                        int centerX = (availableWidth - scaledWidth) / 2;
                        
                        Rectangle source = { 0, 0, (float)tex.width, (float)tex.height };
                        Rectangle dest = { (float)centerX, (float)displayY, (float)scaledWidth, (float)scaledHeight };
                        DrawTexturePro(tex, source, dest, (Vector2){0, 0}, 0.0f, WHITE);
                    }
                }
            }
            
            // Advance Y position
            dynamicY += scaledHeight + (int)(padding * globalScale);
        }
        
        // Draw scrollbar
        if (state->maxScrollY > 0) {
            float scrollBarHeight = (float)screenHeight / (state->maxScrollY + screenHeight) * screenHeight;
            if (scrollBarHeight < 40) scrollBarHeight = 40;
            
            float scrollBarY = (state->scrollY / state->maxScrollY) * (screenHeight - scrollBarHeight);
            
            DrawRectangle(screenWidth - 14, 0, 14, screenHeight, (Color){ 40, 40, 45, 255 });
            DrawRectangle(screenWidth - 12, (int)scrollBarY + 2, 10, (int)scrollBarHeight - 4, (Color){ 100, 100, 120, 255 });
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

        // First-page button near page indicator (left bottom). Place button *before* the page text.
        int firstW = 28; int firstH = 28;
        int firstX = 10;
        int firstY = screenHeight - 28 - 10; // place slightly above bottom
        state->firstBtnRect = (Rectangle){ (float)firstX, (float)firstY, (float)firstW, (float)firstH };

        int infoX = firstX + firstW + 8;
        DrawTextCustom(state, info, infoX, screenHeight - 25, 16, (Color){ 140, 140, 150, 255 });
        // Draw first button (arrow up)
        Color firstBtnColor;
        if (state->imageCount <= 0) {
            firstBtnColor = (Color){ 40, 40, 45, 120 };
        } else if (state->isOverFirstBtn) {
            firstBtnColor = (Color){ 90, 90, 110, 230 };
        } else {
            firstBtnColor = (Color){ 60, 60, 70, 200 };
        }
        DrawRectangleRec(state->firstBtnRect, firstBtnColor);
        DrawRectangleLinesEx(state->firstBtnRect, 1, (Color){ 100, 100, 110, 150 });
        // Up arrow triangle
        Vector2 t1 = { state->firstBtnRect.x + state->firstBtnRect.width/2, state->firstBtnRect.y + 6 };
        Vector2 t2 = { state->firstBtnRect.x + 6, state->firstBtnRect.y + state->firstBtnRect.height - 8 };
        Vector2 t3 = { state->firstBtnRect.x + state->firstBtnRect.width - 6, state->firstBtnRect.y + state->firstBtnRect.height - 8 };
        DrawTriangle(t1, t2, t3, (state->imageCount > 0) ? WHITE : (Color){ 100, 100, 100, 255 });
        
        // Folder navigation panel (no background, text with shadow)
        // First button rectangle (defined here so it's available even when there's only one folder)
        Rectangle firstRect = { 80, 50, 30, 22 };
        if (state->folderCount > 1) {
            // Build a UTF-8 safe display name (truncate by codepoints, do not break multibyte chars)
            const char* srcName = state->folders[state->currentFolderIndex].name;
            int cpCount = 0;
            int *cps = LoadCodepoints(srcName, &cpCount);
            char displayBuf[128];
            char *displayName = NULL;
            int maxChars = 80; // number of codepoints to show

            if (cps && cpCount > 0) {
                if (cpCount > maxChars) {
                    // Truncate and append ellipsis
                    char *tmp = LoadUTF8(cps, maxChars - 3);
                    if (tmp) {
                        size_t len = strlen(tmp);
                        if (len + 3 < sizeof(displayBuf)) {
                            strcpy(displayBuf, tmp);
                            strcat(displayBuf, "...");
                            displayName = displayBuf;
                        } else {
                            strncpy(displayBuf, tmp, sizeof(displayBuf) - 4);
                            displayBuf[sizeof(displayBuf) - 4] = '\0';
                            strcat(displayBuf, "...");
                            displayName = displayBuf;
                        }
                        UnloadUTF8(tmp);
                    } else {
                        strncpy(displayBuf, srcName, sizeof(displayBuf) - 1);
                        displayBuf[sizeof(displayBuf) - 1] = '\0';
                        displayName = displayBuf;
                    }
                } else {
                    displayName = LoadUTF8(cps, cpCount);
                }
                UnloadCodepoints(cps);
            } else {
                // Fallback: plain copy (shouldn't happen for valid names)
                strncpy(displayBuf, srcName, sizeof(displayBuf) - 1);
                displayBuf[sizeof(displayBuf) - 1] = '\0';
                displayName = displayBuf;
            }

            // Draw folder name with tight shadow
            DrawTextCustom(state, displayName, 11, 11, 16, (Color){ 0, 0, 0, 200 });  // Shadow (1px offset)
            DrawTextCustom(state, displayName, 10, 10, 16, (Color){ 200, 200, 220, 255 });  // Text

            // Free if LoadUTF8 allocated it
            if (displayName != displayBuf) {
                UnloadUTF8(displayName);
            }
            
            // Draw folder counter with tight shadow
            char counterText[50];
            snprintf(counterText, sizeof(counterText), "Carpeta %d / %d", state->currentFolderIndex + 1, state->folderCount);
            DrawTextCustom(state, counterText, 11, 31, 14, (Color){ 0, 0, 0, 180 });  // Shadow
            DrawTextCustom(state, counterText, 10, 30, 14, (Color){ 160, 160, 170, 255 });  // Text
            
            // Navigation buttons (Rectangle + Arrow)
            Rectangle prevRect = { 10, 50, 30, 22 };
            Rectangle nextRect = { 45, 50, 30, 22 };
            
            // Draw Prev Button
            Color prevBtnColor = (state->currentFolderIndex > 0) ? (Color){ 60, 60, 70, 200 } : (Color){ 40, 40, 45, 120 };
            DrawRectangleRec(prevRect, prevBtnColor);
            DrawRectangleLinesEx(prevRect, 1, (Color){ 100, 100, 110, 150 });
            DrawTextCustom(state, "<", 20, 52, 16, (state->currentFolderIndex > 0) ? WHITE : (Color){ 100, 100, 100, 255 });
            
            // Draw Next Button
            Color nextBtnColor = (state->currentFolderIndex < state->folderCount - 1) ? (Color){ 60, 60, 70, 200 } : (Color){ 40, 40, 45, 120 };
            DrawRectangleRec(nextRect, nextBtnColor);
            DrawRectangleLinesEx(nextRect, 1, (Color){ 100, 100, 110, 150 });
            DrawTextCustom(state, ">", 55, 52, 16, (state->currentFolderIndex < state->folderCount - 1) ? WHITE : (Color){ 100, 100, 100, 255 });
        }

// (First page button moved to control panel)
            (void)0;

        // Control panel
        int panelX = screenWidth - 250;
        int panelY = screenHeight - 80;
        
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
