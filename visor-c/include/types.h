// types.h - Shared type definitions and constants for Manga Viewer
#ifndef TYPES_H
#define TYPES_H

#include "raylib.h"
#include <stdbool.h>

// Configuration constants
#define MAX_IMAGES 1000
#define MAX_FOLDERS 500
#define LOAD_BUFFER_PAGES 5
#define WINDOW_WIDTH 1200
#define WINDOW_HEIGHT 800
#define SCROLL_SPEED 300.0f
#define AUTO_SCROLL_MIN 10.0f
#define AUTO_SCROLL_MAX 500.0f
#define AUTO_SCROLL_DEFAULT 100.0f
#define SCROLL_SMOOTHING_MIN 1.0f
#define SCROLL_SMOOTHING_MAX 20.0f
#define SCROLL_SMOOTHING_DEFAULT 5.0f
#define IMAGE_MARGIN 40
#define SCROLLBAR_WIDTH 14

#ifdef _WIN32
    #define PATH_SEPARATOR '\\'
#else
    #define PATH_SEPARATOR '/'
#endif

typedef enum {
    STATE_EMPTY = 0,    // No data
    STATE_LOADING,      // Currently being loaded by background thread
    STATE_READY,        // Píxels loaded in RAM, ready for GPU upload
    STATE_LOADED        // Texture available in GPU
} LoadingStatus;

// Image entry structure
typedef struct {
    char path[512];
    Texture2D texture;
    int width;
    int height;
    int displayY;
    int displayHeight;
    bool isLoaded;      // Keep for legacy/simple checks
    
    // Threaded loading
    LoadingStatus status;
    void* pixelData;
    int pixelFormat;
} ImageEntry;

// Folder entry for navigation
typedef struct {
    char path[512];
    char name[256];
} FolderEntry;

// Application state
typedef struct {
    ImageEntry images[MAX_IMAGES];
    int imageCount;
    float scrollY;
    float targetScrollY;
    float maxScrollY;
    bool isDragging;
    bool isDraggingScrollbar;
    bool isDraggingSlider;
    Vector2 lastMousePos;
    char currentFolder[512];
    // Auto-scroll
    bool isAutoScrolling;
    float autoScrollSpeed;
    // Scroll smoothing
    float scrollSmoothing;
    bool isDraggingSmoothSlider;
    // Folder navigation
    FolderEntry folders[MAX_FOLDERS];
    int folderCount;
    int currentFolderIndex;
    // Custom font
    Font customFont;
    bool fontLoaded;
    
    // Threading
    bool shouldExit;
    bool loaderPaused;  // Pause loader during folder changes
    void* loaderThread;
} AppState;

// Supported image extensions
extern const char* supportedExtensions[];

#endif // TYPES_H
