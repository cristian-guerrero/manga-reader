// main.c - Manga/Image Viewer entry point
// Modular C project using Raylib for rendering, libvips for image loading

#include "raylib.h"
#include "../include/types.h"
#include "../include/font_data.h"
#include "platform.h"
#include "viewer.h"
#include "input.h"
#include "loader.h"
#include <stdio.h>

int main(int argc, char *argv[]) {
    // Initialize platform (UTF-8 console on Windows)
    PlatformInit();
    
    // Initialize image loader (libvips)
    if (!InitImageLoader(argv[0])) {
        return 1;
    }
    
    // Initialize Raylib
    SetConfigFlags(FLAG_WINDOW_RESIZABLE);
    InitWindow(WINDOW_WIDTH, WINDOW_HEIGHT, "Manga Viewer - PoC (C + Raylib + VIPS)");
    SetTargetFPS(60);
    
    // Initialize state
    AppState state = {0};
    state.autoScrollSpeed = AUTO_SCROLL_DEFAULT;
    state.scrollSmoothing = SCROLL_SMOOTHING_DEFAULT;
    
    // Load embedded font with extended character range (Latin-1)
    int codepoints[250];
    for (int i = 0; i < 250; i++) codepoints[i] = i + 32; 
    state.customFont = LoadFontFromMemory(".ttf", FONT_DATA, FONT_DATA_SIZE, 64, codepoints, 250);
    
    state.fontLoaded = (state.customFont.texture.id > 0);
    if (state.fontLoaded) {
        SetTextureFilter(state.customFont.texture, TEXTURE_FILTER_BILINEAR);
        printf("Custom font loaded successfully (Latin-1 range, 64px, Bilinear)\n");
    }
    
    printf("=== Manga Viewer PoC ===\n");
    printf("Image loading via libvips\n");
    printf("Supports: PNG, JPG, AVIF, WebP, HEIC, JXL, TIFF...\n");
    printf("Controls:\n");
    printf("  - Drag & Drop folder to load images\n");
    printf("  - Mouse wheel or drag to scroll\n");
    printf("  - Arrow keys / J/K to scroll\n");
    printf("  - Left/Right to change folder\n");
    printf("  - Page Up/Down for fast scroll\n");
    printf("  - Home/End to go to start/end\n");
    printf("  - Space to toggle auto-scroll\n");
    printf("========================\n");
    
    // Main loop
    while (!WindowShouldClose()) {
        HandleInput(&state);
        HandleDragDrop(&state);
        DrawViewer(&state);
    }
    
    // Cleanup
    if (state.fontLoaded) {
        UnloadFont(state.customFont);
    }
    ClearImages(&state);
    CloseWindow();
    ShutdownImageLoader();
    
    return 0;
}

