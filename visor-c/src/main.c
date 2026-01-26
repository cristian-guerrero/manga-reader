// main.c - Manga/Image Viewer entry point
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

#include "raylib.h"
#include "../include/types.h"
#include "../include/font_data.h"
#include "platform.h"
#include "viewer.h"
#include "input.h"
#include "loader.h"
#include "config.h"
#include <stdio.h>
#include <stdlib.h>
#include <locale.h> // Para setlocale
int main(int argc, char *argv[])
{
    // Initialize platform (UTF-8 console on Windows)
    PlatformInit();

    // Initialize image loader (libvips)
    if (!InitImageLoader(argv[0]))
    {
        return 1;
    }

    // Load saved configuration
    AppConfig appConfig = LoadAppConfig();

    // Initialize Raylib with window hidden initially (to avoid position flash)
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_WINDOW_HIDDEN);
    InitWindow(appConfig.windowWidth, appConfig.windowHeight, "Manga Viewer - PoC (C + Raylib + VIPS)");
    SetTargetFPS(60);

    // Restore window position if we have valid saved config
    if (appConfig.isValid)
    {
        // Find the best monitor to place the window on
        int monitorCount = GetMonitorCount();
        int adjustedX = appConfig.windowX;
        int adjustedY = appConfig.windowY;
        bool needsAdjustment = false;

        // Get primary monitor info as fallback
        Vector2 primaryPos = GetMonitorPosition(0);
        int primaryWidth = GetMonitorWidth(0);
        int primaryHeight = GetMonitorHeight(0);

        // Check if position is on any monitor
        bool foundMonitor = false;
        for (int i = 0; i < monitorCount; i++)
        {
            Vector2 monPos = GetMonitorPosition(i);
            int monWidth = GetMonitorWidth(i);
            int monHeight = GetMonitorHeight(i);

            // Check if the window's X is within this monitor's range
            if (appConfig.windowX >= monPos.x - appConfig.windowWidth + 100 &&
                appConfig.windowX < monPos.x + monWidth - 100)
            {

                foundMonitor = true;

                // Adjust Y to ensure title bar (top ~30px) is visible
                if (adjustedY < monPos.y)
                {
                    adjustedY = (int)monPos.y + 10; // 10px from top
                    needsAdjustment = true;
                }
                // Also ensure some part of window is not below screen
                if (adjustedY > monPos.y + monHeight - 100)
                {
                    adjustedY = (int)monPos.y + monHeight - 200;
                    needsAdjustment = true;
                }
                break;
            }
        }

        // If no valid monitor found, reset to primary monitor
        if (!foundMonitor)
        {
            adjustedX = (int)primaryPos.x + (primaryWidth - appConfig.windowWidth) / 2;
            adjustedY = (int)primaryPos.y + 50;
            needsAdjustment = true;
            printf("Window position off-screen, moving to primary monitor\n");
        }

        SetWindowPosition(adjustedX, adjustedY);
        if (needsAdjustment)
        {
            printf("Adjusted window position: (%d, %d) -> (%d, %d)\n",
                   appConfig.windowX, appConfig.windowY, adjustedX, adjustedY);
        }
        else
        {
            printf("Restored window position: (%d, %d)\n", adjustedX, adjustedY);
        }
    }

    // Now show the window (remove hidden flag)
    ClearWindowState(FLAG_WINDOW_HIDDEN);

    // Initialize state with loaded config values
    AppState state = {0};
    state.autoScrollSpeed = appConfig.autoScrollSpeed;
    state.scrollSmoothing = appConfig.scrollSmoothing;

    // Try to load a font that supports Japanese (hiragana/katakana/CJK) from common locations.
    const char *candidates[] = {
        "./resources/KosugiMaru-Regular.ttf",
        NULL};

    const char *jpFontPath = NULL;
    for (int i = 0; candidates[i] != NULL; i++)
    {
        if (FileExists(candidates[i]))
        {
            jpFontPath = candidates[i];
            break;
        }
    }

    if (jpFontPath)
    {
        setlocale(LC_ALL, "en_US.UTF-8");
        printf("Found Japanese-capable font: %s\n", jpFontPath);
        // Build codepoint list for ASCII + CJK punctuation + hiragana + katakana + common CJK ideographs
        // Ranges: 32..126, 0x3000..0x303F (CJK punctuation), 0x3040..0x309F (Hiragana), 0x30A0..0x30FF (Katakana), 0x4E00..0x9FFF (CJK Unified Ideographs)
        int ranges[][2] = {{32, 126}, {0x3000, 0x303F}, {0x3040, 0x309F}, {0x30A0, 0x30FF}, {0x4E00, 0x9FFF}};
        int total = 0;
        for (int r = 0; r < 5; r++)
            total += (ranges[r][1] - ranges[r][0] + 1);
        int *codepoints = malloc(sizeof(int) * total);
        int idx = 0;
        for (int r = 0; r < 5; r++)
        {
            for (int c = ranges[r][0]; c <= ranges[r][1]; c++)
            {
                codepoints[idx++] = c;
            }
        }
        state.customFont = LoadFontEx(jpFontPath, 64, codepoints, total);
        free(codepoints);
        state.fontLoaded = (state.customFont.texture.id > 0);
        if (state.fontLoaded)
        {
            SetTextureFilter(state.customFont.texture, TEXTURE_FILTER_BILINEAR);
            printf("Custom font loaded successfully (Japanese-capable, 64px)\n");
        }
        else
        {
            printf("Failed to load font at %s\n", jpFontPath);
        }
    }

    // Fallback: use embedded Latin-1 font if no JP-capable font found or load failed
    if (!state.fontLoaded)
    {
        int codepoints[250];
        for (int i = 0; i < 250; i++)
            codepoints[i] = i + 32;
        state.customFont = LoadFontFromMemory(".ttf", FONT_DATA, FONT_DATA_SIZE, 64, codepoints, 250);
        state.fontLoaded = (state.customFont.texture.id > 0);
        if (state.fontLoaded)
        {
            SetTextureFilter(state.customFont.texture, TEXTURE_FILTER_BILINEAR);
            printf("Custom font loaded successfully (Latin-1 range, 64px, Bilinear)\n");
        }
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

    // Start background loading thread
    StartLoaderThread(&state);

    // Main loop
    while (!WindowShouldClose())
    {
        HandleInput(&state);
        HandleDragDrop(&state);
        DrawViewer(&state);
    }

    // Save configuration before exit
    Vector2 windowPos = GetWindowPosition();
    int windowWidth = GetScreenWidth();
    int windowHeight = GetScreenHeight();
    SaveAppConfig((int)windowPos.x, (int)windowPos.y, windowWidth, windowHeight,
                  state.scrollSmoothing, state.autoScrollSpeed);

    // Cleanup
    StopLoaderThread(&state);

    if (state.fontLoaded)
    {
        UnloadFont(state.customFont);
    }
    ClearImages(&state);
    CloseWindow();
    ShutdownImageLoader();

    return 0;
}
