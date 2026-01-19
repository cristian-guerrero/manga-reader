// input.c - Input handling implementation
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
        state->scrollY += diff * SCROLL_SMOOTHING * deltaTime;
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
    bool isOverScrollbar = (mousePos.x >= WINDOW_WIDTH - 14) && (state->maxScrollY > 0);
    
    // Control panel bounds
    int panelX = WINDOW_WIDTH - 250;
    int panelY = WINDOW_HEIGHT - 45;
    Rectangle btnRect = { panelX, panelY, 30, 30 };
    Rectangle sliderTrack = { panelX + 95, panelY + 5, 100, 20 };
    
    // Folder navigation button bounds
    int navY = 35;
    Rectangle prevBtn = { 10, navY, 30, 20 };
    Rectangle nextBtn = { 200, navY, 30, 20 };
    
    bool isOverButton = CheckCollisionPointRec(mousePos, btnRect);
    bool isOverSlider = CheckCollisionPointRec(mousePos, sliderTrack);
    bool isOverPrevBtn = (state->folderCount > 1) && CheckCollisionPointRec(mousePos, prevBtn);
    bool isOverNextBtn = (state->folderCount > 1) && CheckCollisionPointRec(mousePos, nextBtn);
    
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
        } else if (isOverButton && state->imageCount > 0) {
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
    
    // Scrollbar dragging
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
