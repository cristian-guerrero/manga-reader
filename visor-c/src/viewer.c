// viewer.c - UI drawing and image loading implementation
#include "viewer.h"
#include "folder.h"
#include "platform.h"
#include "loader.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

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
        if (state->images[i].loaded) {
            UnloadTexture(state->images[i].texture);
            state->images[i].loaded = false;
        }
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
        state->images[state->imageCount].loaded = false;
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
    
    for (int i = 0; i < state->imageCount; i++) {
        // Draw loading progress
        BeginDrawing();
        ClearBackground((Color){ 30, 30, 35, 255 });
        
        // Loading text
        const char* loadingText = "Cargando imágenes...";
        DrawTextCustom(state, loadingText, 
                 WINDOW_WIDTH/2 - MeasureTextCustom(state, loadingText, 24)/2, 
                 WINDOW_HEIGHT/2 - 80, 
                 24, 
                 (Color){ 150, 150, 160, 255 });
        
        // Folder name
        char folderName[100];
        GetFolderName(folderPath, folderName, sizeof(folderName));
        DrawTextCustom(state, folderName, 
                 WINDOW_WIDTH/2 - MeasureTextCustom(state, folderName, 18)/2, 
                 WINDOW_HEIGHT/2 - 50, 
                 18, 
                 (Color){ 100, 180, 220, 255 });
        
        // Progress bar
        int barWidth = 400;
        int barHeight = 20;
        int barX = WINDOW_WIDTH/2 - barWidth/2;
        int barY = WINDOW_HEIGHT/2 - 10;
        DrawRectangle(barX, barY, barWidth, barHeight, (Color){ 50, 50, 55, 255 });
        
        float progress = (float)(i + 1) / (float)state->imageCount;
        DrawRectangle(barX + 2, barY + 2, (int)((barWidth - 4) * progress), barHeight - 4, (Color){ 100, 180, 100, 255 });
        
        // Progress text
        char progressText[64];
        snprintf(progressText, sizeof(progressText), "%d / %d", i + 1, state->imageCount);
        DrawTextCustom(state, progressText, 
                 WINDOW_WIDTH/2 - MeasureTextCustom(state, progressText, 20)/2, 
                 WINDOW_HEIGHT/2 + 30, 
                 20, 
                 (Color){ 120, 120, 130, 255 });
        
        // Current file name
        const char* fileName = strrchr(state->images[i].path, PATH_SEPARATOR);
        if (fileName) fileName++; else fileName = state->images[i].path;
        char truncName[50];
        strncpy(truncName, fileName, sizeof(truncName) - 1);
        truncName[sizeof(truncName) - 1] = '\0';
        DrawTextCustom(state, truncName, 
                 WINDOW_WIDTH/2 - MeasureTextCustom(state, truncName, 14)/2, 
                 WINDOW_HEIGHT/2 + 60, 
                 14, 
                 (Color){ 80, 80, 90, 255 });
        
        EndDrawing();
        
        // Load the image
        Image img = LoadImageUniversal(state->images[i].path);
        
        if (img.data != NULL) {
            float scale = (float)(WINDOW_WIDTH - 40) / (float)img.width;
            int newHeight = (int)(img.height * scale);
            
            ImageResize(&img, WINDOW_WIDTH - 40, newHeight);
            
            state->images[i].texture = LoadTextureFromImage(img);
            state->images[i].loaded = true;
            state->images[i].displayY = currentY;
            state->images[i].displayHeight = newHeight;
            
            currentY += newHeight + padding;
            
            UnloadImage(img);
            printf("Loaded [%d/%d]: %s\n", i + 1, state->imageCount, state->images[i].path);
        } else {
            printf("Failed to load: %s\n", state->images[i].path);
        }
    }
    
    state->maxScrollY = currentY - WINDOW_HEIGHT + 100;
    if (state->maxScrollY < 0) state->maxScrollY = 0;
    
    printf("All images loaded. Total scroll height: %.0f\n", state->maxScrollY);
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
        // Draw images with scroll offset
        for (int i = 0; i < state->imageCount; i++) {
            if (!state->images[i].loaded) continue;
            
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
            if (state->images[i].loaded && state->images[i].displayY <= (int)state->scrollY + 50) {
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
