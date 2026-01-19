// Manga/Image Viewer - Proof of Concept
// Using Raylib for rendering, libvips for image loading (compiled separately)
// Supports: PNG, JPG, BMP, TGA, GIF, QOI, PSD, HDR, AVIF, WebP, HEIC, JXL, TIFF, etc.

#include "raylib.h"
#include "loader.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <dirent.h>
#include <strings.h>

#ifdef _WIN32
    #define PATH_SEPARATOR '\\'
#else
    #define PATH_SEPARATOR '/'
#endif

// Configuration
#define MAX_IMAGES 1000
#define SCROLL_SPEED 300.0f
// #define SCROLL_SMOOTHING 12.0f  // Higher = faster interpolation
#define SCROLL_SMOOTHING 5.0f  // Higher = faster interpolation
#define WINDOW_WIDTH 1200
#define WINDOW_HEIGHT 800
#define AUTO_SCROLL_MIN 10.0f
#define AUTO_SCROLL_MAX 500.0f
#define AUTO_SCROLL_DEFAULT 100.0f

// Image entry structure
typedef struct {
    char path[512];
    Texture2D texture;
    bool loaded;
    int displayY;      // Y position in the scroll view
    int displayHeight; // Scaled height for display
} ImageEntry;

// Application state
typedef struct {
    ImageEntry images[MAX_IMAGES];
    int imageCount;
    float scrollY;
    float targetScrollY;  // Target for smooth scrolling
    float maxScrollY;
    bool isDragging;
    bool isDraggingScrollbar;
    bool isDraggingSlider;
    Vector2 lastMousePos;
    char currentFolder[512];
    // Auto-scroll
    bool isAutoScrolling;
    float autoScrollSpeed;
} AppState;

// Supported image extensions
const char* supportedExtensions[] = {
    ".png", ".jpg", ".jpeg", ".bmp", ".tga", ".gif", 
    ".qoi", ".psd", ".hdr", ".avif", ".webp", ".heic",
    ".heif", ".jxl", ".tiff", ".tif", NULL
};

// Check if file has supported extension
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

// Load image with vips fallback for unsupported formats
Image LoadImageUniversal(const char* fileName) {
    Image img = { 0 };
    
    if (NeedsVipsLoader(fileName)) {
        // Use vips for formats not supported by raylib
        ImageData data = LoadImageVips(fileName);
        if (data.data != NULL) {
            img.data = data.data;
            img.width = data.width;
            img.height = data.height;
            img.mipmaps = data.mipmaps;
            img.format = data.format;
        }
        return img;
    }
    
    // Try raylib first
    img = LoadImage(fileName);
    if (img.data == NULL) {
        // Fallback to vips
        ImageData data = LoadImageVips(fileName);
        if (data.data != NULL) {
            img.data = data.data;
            img.width = data.width;
            img.height = data.height;
            img.mipmaps = data.mipmaps;
            img.format = data.format;
        }
    }
    return img;
}

// Compare function for sorting filenames
int CompareFilenames(const void* a, const void* b) {
    return strcmp(((ImageEntry*)a)->path, ((ImageEntry*)b)->path);
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
    state->maxScrollY = 0;
    state->currentFolder[0] = '\0';
}

// Load images from a folder
void LoadFolderImages(AppState* state, const char* folderPath) {
    ClearImages(state);
    strncpy(state->currentFolder, folderPath, sizeof(state->currentFolder) - 1);
    
    printf("Loading images from: %s\n", folderPath);
    
    DIR* dir = opendir(folderPath);
    if (!dir) {
        printf("Error: Could not open directory: %s\n", folderPath);
        return;
    }
    
    struct dirent* entry;
    while ((entry = readdir(dir)) != NULL && state->imageCount < MAX_IMAGES) {
        if (entry->d_name[0] == '.') continue;
        
        if (IsSupportedImage(entry->d_name)) {
            snprintf(state->images[state->imageCount].path, 
                     sizeof(state->images[state->imageCount].path),
                     "%s%c%s", folderPath, PATH_SEPARATOR, entry->d_name);
            state->images[state->imageCount].loaded = false;
            state->imageCount++;
        }
    }
    closedir(dir);
    
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
        DrawText(loadingText, 
                 WINDOW_WIDTH/2 - MeasureText(loadingText, 24)/2, 
                 WINDOW_HEIGHT/2 - 60, 
                 24, 
                 (Color){ 150, 150, 160, 255 });
        
        // Progress bar background
        int barWidth = 400;
        int barHeight = 20;
        int barX = WINDOW_WIDTH/2 - barWidth/2;
        int barY = WINDOW_HEIGHT/2 - 10;
        DrawRectangle(barX, barY, barWidth, barHeight, (Color){ 50, 50, 55, 255 });
        
        // Progress bar fill
        float progress = (float)(i + 1) / (float)state->imageCount;
        DrawRectangle(barX + 2, barY + 2, (int)((barWidth - 4) * progress), barHeight - 4, (Color){ 100, 180, 100, 255 });
        
        // Progress text
        char progressText[64];
        snprintf(progressText, sizeof(progressText), "%d / %d", i + 1, state->imageCount);
        DrawText(progressText, 
                 WINDOW_WIDTH/2 - MeasureText(progressText, 20)/2, 
                 WINDOW_HEIGHT/2 + 30, 
                 20, 
                 (Color){ 120, 120, 130, 255 });
        
        // Current file name (truncated)
        const char* fileName = strrchr(state->images[i].path, PATH_SEPARATOR);
        if (fileName) fileName++; else fileName = state->images[i].path;
        char truncName[50];
        strncpy(truncName, fileName, sizeof(truncName) - 1);
        truncName[sizeof(truncName) - 1] = '\0';
        DrawText(truncName, 
                 WINDOW_WIDTH/2 - MeasureText(truncName, 14)/2, 
                 WINDOW_HEIGHT/2 + 60, 
                 14, 
                 (Color){ 80, 80, 90, 255 });
        
        EndDrawing();
        
        // Load the image
        Image img = LoadImageUniversal(state->images[i].path);
        
        if (img.data != NULL) {
            // Scale image to fit window width while maintaining aspect ratio
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
    
    // Calculate max scroll
    state->maxScrollY = currentY - WINDOW_HEIGHT + 100;
    if (state->maxScrollY < 0) state->maxScrollY = 0;
    
    printf("All images loaded. Total scroll height: %.0f\n", state->maxScrollY);
}

// Draw the image viewer
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
        
        DrawText(hint1, 
                 WINDOW_WIDTH/2 - MeasureText(hint1, fontSize)/2, 
                 WINDOW_HEIGHT/2 - 60, 
                 fontSize, 
                 (Color){ 150, 150, 160, 255 });
        DrawText(hint2, 
                 WINDOW_WIDTH/2 - MeasureText(hint2, fontSize)/2, 
                 WINDOW_HEIGHT/2 - 10, 
                 fontSize, 
                 (Color){ 100, 100, 110, 255 });
        DrawText(hint3, 
                 WINDOW_WIDTH/2 - MeasureText(hint3, 16)/2, 
                 WINDOW_HEIGHT/2 + 40, 
                 16, 
                 (Color){ 80, 80, 90, 255 });
    } else {
        // Draw images with scroll offset
        for (int i = 0; i < state->imageCount; i++) {
            if (!state->images[i].loaded) continue;
            
            int displayY = state->images[i].displayY - (int)state->scrollY;
            
            // Only draw if visible
            if (displayY + state->images[i].displayHeight > 0 && displayY < WINDOW_HEIGHT) {
                DrawTexture(state->images[i].texture, 20, displayY, WHITE);
            }
        }
        
        // Draw scrollbar
        if (state->maxScrollY > 0) {
            float scrollBarHeight = (float)WINDOW_HEIGHT / (state->maxScrollY + WINDOW_HEIGHT) * WINDOW_HEIGHT;
            // Minimum scrollbar height of 40 pixels
            if (scrollBarHeight < 40) scrollBarHeight = 40;
            
            float scrollBarY = (state->scrollY / state->maxScrollY) * (WINDOW_HEIGHT - scrollBarHeight);
            
            // Scrollbar track (wider)
            DrawRectangle(WINDOW_WIDTH - 14, 0, 14, WINDOW_HEIGHT, (Color){ 40, 40, 45, 255 });
            // Scrollbar thumb (rounded corners simulated with filled rect)
            DrawRectangle(WINDOW_WIDTH - 12, (int)scrollBarY + 2, 10, (int)scrollBarHeight - 4, (Color){ 100, 100, 120, 255 });
        }
        
        // Draw folder info with current page
        int currentPage = 1;
        for (int i = 0; i < state->imageCount; i++) {
            if (state->images[i].loaded && state->images[i].displayY <= (int)state->scrollY + 50) {
                currentPage = i + 1;
            }
        }
        
        char info[150];
        snprintf(info, sizeof(info), "Página %d / %d", currentPage, state->imageCount);
        DrawText(info, 10, WINDOW_HEIGHT - 25, 16, (Color){ 140, 140, 150, 255 });
        
        // Auto-scroll control panel (bottom right)
        int panelX = WINDOW_WIDTH - 250;
        int panelY = WINDOW_HEIGHT - 45;
        
        // Panel background
        DrawRectangle(panelX - 10, panelY - 5, 240, 40, (Color){ 40, 40, 45, 200 });
        
        // Play/Pause button
        Rectangle btnRect = { panelX, panelY, 30, 30 };
        Color btnColor = state->isAutoScrolling ? (Color){ 80, 160, 80, 255 } : (Color){ 80, 80, 90, 255 };
        DrawRectangleRec(btnRect, btnColor);
        
        if (state->isAutoScrolling) {
            // Draw pause icon (two bars)
            DrawRectangle(panelX + 8, panelY + 6, 4, 18, WHITE);
            DrawRectangle(panelX + 18, panelY + 6, 4, 18, WHITE);
        } else {
            // Draw play icon (triangle)
            Vector2 v1 = { panelX + 10, panelY + 6 };
            Vector2 v2 = { panelX + 10, panelY + 24 };
            Vector2 v3 = { panelX + 24, panelY + 15 };
            DrawTriangle(v1, v2, v3, WHITE);
        }
        
        // Speed label
        DrawText("Speed:", panelX + 40, panelY + 8, 14, (Color){ 120, 120, 130, 255 });
        
        // Speed slider
        Rectangle sliderTrack = { panelX + 95, panelY + 10, 100, 10 };
        DrawRectangleRec(sliderTrack, (Color){ 60, 60, 65, 255 });
        
        float sliderProgress = (state->autoScrollSpeed - AUTO_SCROLL_MIN) / (AUTO_SCROLL_MAX - AUTO_SCROLL_MIN);
        int sliderThumbX = sliderTrack.x + (int)(sliderProgress * sliderTrack.width) - 5;
        Rectangle sliderThumb = { sliderThumbX, panelY + 5, 10, 20 };
        DrawRectangleRec(sliderThumb, (Color){ 140, 140, 160, 255 });
        
        // Speed value
        char speedText[20];
        snprintf(speedText, sizeof(speedText), "%.0f", state->autoScrollSpeed);
        DrawText(speedText, panelX + 200, panelY + 8, 14, (Color){ 140, 140, 150, 255 });
    }
    
    EndDrawing();
}

// Handle input
void HandleInput(AppState* state) {
    float deltaTime = GetFrameTime();
    
    // Auto-scroll
    if (state->isAutoScrolling && state->maxScrollY > 0) {
        state->targetScrollY += state->autoScrollSpeed * deltaTime;
        if (state->targetScrollY > state->maxScrollY) {
            state->targetScrollY = state->maxScrollY;
            state->isAutoScrolling = false;  // Stop at end
        }
    }
    
    // Smooth scroll interpolation (lerp toward target)
    float diff = state->targetScrollY - state->scrollY;
    if (fabs(diff) > 0.5f) {
        state->scrollY += diff * SCROLL_SMOOTHING * deltaTime;
    } else {
        state->scrollY = state->targetScrollY;
    }
    
    // Mouse wheel scrolling (modifies target)
    float wheel = GetMouseWheelMove();
    if (wheel != 0) {
        state->targetScrollY -= wheel * SCROLL_SPEED;
        if (state->targetScrollY < 0) state->targetScrollY = 0;
        if (state->targetScrollY > state->maxScrollY) state->targetScrollY = state->maxScrollY;
    }
    
    Vector2 mousePos = GetMousePosition();
    bool isOverScrollbar = (mousePos.x >= WINDOW_WIDTH - 14) && (state->maxScrollY > 0);
    
    // Auto-scroll control panel bounds
    int panelX = WINDOW_WIDTH - 250;
    int panelY = WINDOW_HEIGHT - 45;
    Rectangle btnRect = { panelX, panelY, 30, 30 };
    Rectangle sliderTrack = { panelX + 95, panelY + 5, 100, 20 };
    
    // Check if mouse is over control panel
    bool isOverButton = CheckCollisionPointRec(mousePos, btnRect);
    bool isOverSlider = CheckCollisionPointRec(mousePos, sliderTrack);
    
    // Space key toggles auto-scroll
    if (IsKeyPressed(KEY_SPACE) && state->imageCount > 0) {
        state->isAutoScrolling = !state->isAutoScrolling;
    }
    
    // Mouse button pressed
    if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
        if (isOverButton && state->imageCount > 0) {
            state->isAutoScrolling = !state->isAutoScrolling;
        } else if (isOverSlider) {
            state->isDraggingSlider = true;
        } else if (isOverScrollbar) {
            state->isDraggingScrollbar = true;
            state->isDragging = false;
        } else if (!isOverButton && !isOverSlider) {
            state->isDragging = true;
            state->isDraggingScrollbar = false;
        }
        state->lastMousePos = mousePos;
    }
    
    // Mouse button released
    if (IsMouseButtonReleased(MOUSE_BUTTON_LEFT)) {
        state->isDragging = false;
        state->isDraggingScrollbar = false;
        state->isDraggingSlider = false;
    }
    
    // Slider dragging
    if (state->isDraggingSlider) {
        float sliderX = mousePos.x - sliderTrack.x;
        float progress = sliderX / sliderTrack.width;
        if (progress < 0) progress = 0;
        if (progress > 1) progress = 1;
        state->autoScrollSpeed = AUTO_SCROLL_MIN + progress * (AUTO_SCROLL_MAX - AUTO_SCROLL_MIN);
    }
    
    // Scrollbar dragging (direct, no smoothing)
    if (state->isDraggingScrollbar && state->maxScrollY > 0) {
        float scrollBarHeight = (float)WINDOW_HEIGHT / (state->maxScrollY + WINDOW_HEIGHT) * WINDOW_HEIGHT;
        if (scrollBarHeight < 40) scrollBarHeight = 40;
        
        float scrollableHeight = WINDOW_HEIGHT - scrollBarHeight;
        float ratio = state->maxScrollY / scrollableHeight;
        
        float deltaY = mousePos.y - state->lastMousePos.y;
        state->scrollY += deltaY * ratio;
        state->targetScrollY = state->scrollY;
        
        if (state->scrollY < 0) { state->scrollY = 0; state->targetScrollY = 0; }
        if (state->scrollY > state->maxScrollY) { state->scrollY = state->maxScrollY; state->targetScrollY = state->maxScrollY; }
        
        state->lastMousePos = mousePos;
    }
    
    // Image drag scrolling (direct, no smoothing for responsiveness)
    if (state->isDragging && state->imageCount > 0 && !state->isDraggingScrollbar) {
        float deltaY = state->lastMousePos.y - mousePos.y;
        state->scrollY += deltaY;
        state->targetScrollY = state->scrollY;
        
        if (state->scrollY < 0) { state->scrollY = 0; state->targetScrollY = 0; }
        if (state->scrollY > state->maxScrollY) { state->scrollY = state->maxScrollY; state->targetScrollY = state->maxScrollY; }
        
        state->lastMousePos = mousePos;
    }
    
    // Keyboard navigation (modifies target for smooth scroll)
    if (IsKeyDown(KEY_DOWN) || IsKeyDown(KEY_J)) {
        state->targetScrollY += SCROLL_SPEED * deltaTime * 3;
        if (state->targetScrollY > state->maxScrollY) state->targetScrollY = state->maxScrollY;
    }
    if (IsKeyDown(KEY_UP) || IsKeyDown(KEY_K)) {
        state->targetScrollY -= SCROLL_SPEED * deltaTime * 3;
        if (state->targetScrollY < 0) state->targetScrollY = 0;
    }
    if (IsKeyPressed(KEY_HOME)) {
        state->targetScrollY = 0;
    }
    if (IsKeyPressed(KEY_END)) {
        state->targetScrollY = state->maxScrollY;
    }
    if (IsKeyPressed(KEY_PAGE_DOWN)) {
        state->targetScrollY += WINDOW_HEIGHT * 0.8f;
        if (state->targetScrollY > state->maxScrollY) state->targetScrollY = state->maxScrollY;
    }
    if (IsKeyPressed(KEY_PAGE_UP)) {
        state->targetScrollY -= WINDOW_HEIGHT * 0.8f;
        if (state->targetScrollY < 0) state->targetScrollY = 0;
    }
}

// Handle drag and drop
void HandleDragDrop(AppState* state) {
    if (IsFileDropped()) {
        FilePathList droppedFiles = LoadDroppedFiles();
        
        if (droppedFiles.count > 0) {
            // Check if first dropped item is a directory
            const char* path = droppedFiles.paths[0];
            
            // Try to open as directory
            DIR* dir = opendir(path);
            if (dir) {
                closedir(dir);
                LoadFolderImages(state, path);
            } else {
                printf("Not a directory: %s\n", path);
                // If it's a file, try opening its parent directory
                char parentPath[512];
                strncpy(parentPath, path, sizeof(parentPath) - 1);
                char* lastSep = strrchr(parentPath, PATH_SEPARATOR);
                if (lastSep) {
                    *lastSep = '\0';
                    LoadFolderImages(state, parentPath);
                }
            }
        }
        
        UnloadDroppedFiles(droppedFiles);
    }
}

int main(int argc, char *argv[]) {
    // Initialize VIPS (image loader)
    if (!InitImageLoader(argv[0])) {
        return 1;
    }
    
    // Initialize Raylib
    SetConfigFlags(FLAG_WINDOW_RESIZABLE);
    InitWindow(WINDOW_WIDTH, WINDOW_HEIGHT, "Manga Viewer - PoC (C + Raylib + VIPS)");
    SetTargetFPS(60);
    
    AppState state = {0};
    state.autoScrollSpeed = AUTO_SCROLL_DEFAULT;
    
    printf("=== Manga Viewer PoC ===\n");
    printf("Image loading via libvips\n");
    printf("Supports: PNG, JPG, AVIF, WebP, HEIC, JXL, TIFF...\n");
    printf("Controls:\n");
    printf("  - Drag & Drop folder to load images\n");
    printf("  - Mouse wheel or drag to scroll\n");
    printf("  - Arrow keys / J/K to scroll\n");
    printf("  - Page Up/Down for fast scroll\n");
    printf("  - Home/End to go to start/end\n");
    printf("  - Space to toggle auto-scroll\n");
    printf("========================\n");
    
    // Main loop
    while (!WindowShouldClose()) {
        HandleDragDrop(&state);
        HandleInput(&state);
        DrawViewer(&state);
    }
    
    // Cleanup
    ClearImages(&state);
    CloseWindow();
    ShutdownImageLoader();
    
    return 0;
}
