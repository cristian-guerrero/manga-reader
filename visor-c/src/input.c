// input.c - Input handling implementation
#ifdef _WIN32
    #define WIN32_LEAN_AND_MEAN
    #define ShowCursor WindowsShowCursor
    #define DrawText WindowsDrawText
    #define DrawTextEx WindowsDrawTextEx
    #define Rectangle WindowsRectangle
    #define CloseWindow WindowsCloseWindow
    #define LoadImage WindowsLoadImage

    #include <windows.h>

    // Undefine the temporary renames
    #undef ShowCursor
    #undef DrawText
    #undef DrawTextEx
    #undef Rectangle
    #undef CloseWindow
    #undef LoadImage
#endif

#include "input.h"
#include "folder.h"
#include "viewer.h"
#include "platform.h"
#include <math.h>
#include <stdio.h>
#include <string.h>

// Handle all input
void HandleInput(AppState* state) {
    float deltaTime = GetFrameTime();
    
    // Auto-scroll
    if (state->isAutoScrolling && state->maxScrollY > 0) {
        state->targetScrollY += state->autoScrollSpeed * deltaTime;
        if (state->targetScrollY > state->maxScrollY) {
            state->targetScrollY = state->maxScrollY;
            state->isAutoScrolling = false;
        }
    }
    
    // Smooth scroll interpolation
    float diff = state->targetScrollY - state->scrollY;
    if (fabs(diff) > 0.5f) {
        state->scrollY += diff * state->scrollSmoothing * deltaTime;
    } else {
        state->scrollY = state->targetScrollY;
    }
    
    // Mouse wheel scrolling
    float wheel = GetMouseWheelMove();
    if (wheel != 0) {
        state->targetScrollY -= wheel * SCROLL_SPEED;
        if (state->targetScrollY < 0) state->targetScrollY = 0;
        if (state->targetScrollY > state->maxScrollY) state->targetScrollY = state->maxScrollY;
    }
    
    Vector2 mousePos = GetMousePosition();
    int screenWidth = GetScreenWidth();
    int screenHeight = GetScreenHeight();
    
    bool isOverScrollbar = (mousePos.x >= screenWidth - 14) && (state->maxScrollY > 0);
    
    // Control panel bounds (relative to current window size)
    int panelX = screenWidth - 250;
    int panelY = screenHeight - 80;
    Rectangle btnRect = { panelX, panelY + 35, 30, 30 };
    Rectangle sliderTrack = { panelX + 95, panelY + 40, 100, 20 };
    Rectangle smoothSliderTrack = { panelX + 95, panelY + 5, 100, 20 };
    
    // Folder navigation button bounds (Rectangle buttons)
    Rectangle prevBtn = { 10, 50, 30, 22 };
    Rectangle nextBtn = { 45, 50, 30, 22 };

    bool isOverButton = CheckCollisionPointRec(mousePos, btnRect);
    bool isOverSlider = CheckCollisionPointRec(mousePos, sliderTrack);
    bool isOverSmoothSlider = CheckCollisionPointRec(mousePos, smoothSliderTrack);
    bool isOverPrevBtn = (state->folderCount > 1) && CheckCollisionPointRec(mousePos, prevBtn);
    bool isOverNextBtn = (state->folderCount > 1) && CheckCollisionPointRec(mousePos, nextBtn);
    bool isOverFirstBtn = (state->imageCount > 0) && CheckCollisionPointRec(mousePos, state->firstBtnRect);
    state->isOverFirstBtn = isOverFirstBtn;
    
    // Space toggles auto-scroll
    if (IsKeyPressed(KEY_SPACE) && state->imageCount > 0) {
        state->isAutoScrolling = !state->isAutoScrolling;
    }
    
    // Left/Right for folder navigation
    if (IsKeyPressed(KEY_LEFT) && state->folderCount > 1) {
        NavigateFolder(state, -1);
    }
    if (IsKeyPressed(KEY_RIGHT) && state->folderCount > 1) {
        NavigateFolder(state, 1);
    }
    
    // Mouse button pressed
    if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
        if (isOverPrevBtn) {
            NavigateFolder(state, -1);
        } else if (isOverNextBtn) {
            NavigateFolder(state, 1);
        } else if (isOverFirstBtn) {
            // Go to first image (top)
            state->targetScrollY = 0;
            state->scrollY = 0;
            state->isAutoScrolling = false;
        } else if (isOverButton && state->imageCount > 0) {
            state->isAutoScrolling = !state->isAutoScrolling;
        } else if (isOverSlider) {
            state->isDraggingSlider = true;
        } else if (isOverSmoothSlider) {
            state->isDraggingSmoothSlider = true;
        } else if (isOverScrollbar) {
            state->isDraggingScrollbar = true;
            state->isDragging = false;
        } else if (!isOverButton && !isOverSlider && !isOverSmoothSlider) {
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
        state->isDraggingSmoothSlider = false;
    }
    
    // Slider dragging (Auto-scroll speed)
    if (state->isDraggingSlider) {
        float sliderX = mousePos.x - sliderTrack.x;
        float progress = sliderX / sliderTrack.width;
        if (progress < 0) progress = 0;
        if (progress > 1) progress = 1;
        state->autoScrollSpeed = AUTO_SCROLL_MIN + progress * (AUTO_SCROLL_MAX - AUTO_SCROLL_MIN);
    }
    
    // Smooth slider dragging
    if (state->isDraggingSmoothSlider) {
        float sliderX = mousePos.x - smoothSliderTrack.x;
        float progress = sliderX / smoothSliderTrack.width;
        if (progress < 0) progress = 0;
        if (progress > 1) progress = 1;
        state->scrollSmoothing = SCROLL_SMOOTHING_MIN + progress * (SCROLL_SMOOTHING_MAX - SCROLL_SMOOTHING_MIN);
    }
    
    // Scrollbar dragging
    if (state->isDraggingScrollbar && state->maxScrollY > 0) {
        float scrollBarHeight = (float)screenHeight / (state->maxScrollY + screenHeight) * screenHeight;
        if (scrollBarHeight < 40) scrollBarHeight = 40;
        
        float scrollableHeight = screenHeight - scrollBarHeight;
        float ratio = state->maxScrollY / scrollableHeight;
        
        float deltaY = mousePos.y - state->lastMousePos.y;
        state->scrollY += deltaY * ratio;
        state->targetScrollY = state->scrollY;
        
        if (state->scrollY < 0) { state->scrollY = 0; state->targetScrollY = 0; }
        if (state->scrollY > state->maxScrollY) { state->scrollY = state->maxScrollY; state->targetScrollY = state->maxScrollY; }
        
        state->lastMousePos = mousePos;
    }
    
    // Image drag scrolling
    if (state->isDragging && state->imageCount > 0 && !state->isDraggingScrollbar) {
        float deltaY = state->lastMousePos.y - mousePos.y;
        state->scrollY += deltaY;
        state->targetScrollY = state->scrollY;
        
        if (state->scrollY < 0) { state->scrollY = 0; state->targetScrollY = 0; }
        if (state->scrollY > state->maxScrollY) { state->scrollY = state->maxScrollY; state->targetScrollY = state->maxScrollY; }
        
        state->lastMousePos = mousePos;
    }
    
    // Keyboard navigation
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
        state->targetScrollY += screenHeight * 0.8f;
        if (state->targetScrollY > state->maxScrollY) state->targetScrollY = state->maxScrollY;
    }
    if (IsKeyPressed(KEY_PAGE_UP)) {
        state->targetScrollY -= screenHeight * 0.8f;
        if (state->targetScrollY < 0) state->targetScrollY = 0;
    }
}

// Handle drag and drop
void HandleDragDrop(AppState* state) {
    if (IsFileDropped()) {
        FilePathList droppedFiles = LoadDroppedFiles();
        
        if (droppedFiles.count > 0) {
            const char* path = droppedFiles.paths[0];
            
            if (IsDirectory(path)) {
                ScanFoldersWithImages(state, path);
                if (state->folderCount > 0) {
                    LoadFolderImages(state, state->folders[0].path);
                    state->currentFolderIndex = 0;
                }
            } else {
                printf("Not a directory: %s\n", path);
                // Try parent directory
                char parentPath[512];
                strncpy(parentPath, path, sizeof(parentPath) - 1);
                char* lastSep = strrchr(parentPath, PATH_SEPARATOR);
                if (lastSep) {
                    *lastSep = '\0';
                    ScanFoldersWithImages(state, parentPath);
                    if (state->folderCount > 0) {
                        LoadFolderImages(state, state->folders[0].path);
                        state->currentFolderIndex = 0;
                    }
                }
            }
        }
        
        UnloadDroppedFiles(droppedFiles);
    }
}
