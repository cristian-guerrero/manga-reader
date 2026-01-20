// config.c - Window configuration persistence

#ifdef _WIN32
    #define WIN32_LEAN_AND_MEAN
    #define NOGDI
    #define NOUSER
    #include <windows.h>
    #undef near
    #undef far
    
    // Declare SHGetFolderPathA directly to avoid shlobj.h conflicts
    #define CSIDL_APPDATA 0x001a
    #ifndef SUCCEEDED
        #define SUCCEEDED(hr) (((HRESULT)(hr)) >= 0)
    #endif
    __declspec(dllimport) HRESULT __stdcall SHGetFolderPathA(void* hwnd, int csidl, void* hToken, unsigned long dwFlags, char* pszPath);
#else
    #include <sys/stat.h>
    #include <sys/types.h>
    #include <unistd.h>
    #include <pwd.h>
#endif

#include "config.h"
#include "../include/types.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define CONFIG_FOLDER ".manga-visor"
#define CONFIG_FILE "config.ini"

static char configDirPath[512] = {0};
static char configFilePath[600] = {0};

// Get the config directory path
const char* GetConfigDir(void) {
    if (configDirPath[0] != '\0') {
        return configDirPath;
    }

#ifdef _WIN32
    // Get %APPDATA%
    char appData[MAX_PATH];
    if (SUCCEEDED(SHGetFolderPathA(NULL, CSIDL_APPDATA, NULL, 0, appData))) {
        snprintf(configDirPath, sizeof(configDirPath), "%s\\%s", appData, CONFIG_FOLDER);
    } else {
        // Fallback to current directory
        snprintf(configDirPath, sizeof(configDirPath), ".\\%s", CONFIG_FOLDER);
    }
#else
    // Get home directory
    const char* home = getenv("HOME");
    if (!home) {
        struct passwd* pw = getpwuid(getuid());
        if (pw) {
            home = pw->pw_dir;
        }
    }
    if (home) {
        snprintf(configDirPath, sizeof(configDirPath), "%s/%s", home, CONFIG_FOLDER);
    } else {
        // Fallback to current directory
        snprintf(configDirPath, sizeof(configDirPath), "./%s", CONFIG_FOLDER);
    }
#endif

    return configDirPath;
}

// Get full path to config file
static const char* GetConfigFilePath(void) {
    if (configFilePath[0] != '\0') {
        return configFilePath;
    }

    const char* dir = GetConfigDir();
#ifdef _WIN32
    snprintf(configFilePath, sizeof(configFilePath), "%s\\%s", dir, CONFIG_FILE);
#else
    snprintf(configFilePath, sizeof(configFilePath), "%s/%s", dir, CONFIG_FILE);
#endif

    return configFilePath;
}

// Create config directory if it doesn't exist
static bool EnsureConfigDirExists(void) {
    const char* dir = GetConfigDir();

#ifdef _WIN32
    // Check if directory exists
    DWORD attrs = GetFileAttributesA(dir);
    if (attrs == INVALID_FILE_ATTRIBUTES) {
        // Create directory
        if (!CreateDirectoryA(dir, NULL)) {
            printf("Failed to create config directory: %s\n", dir);
            return false;
        }
        printf("Created config directory: %s\n", dir);
    }
#else
    struct stat st;
    if (stat(dir, &st) != 0) {
        // Create directory with permissions rwxr-xr-x
        if (mkdir(dir, 0755) != 0) {
            printf("Failed to create config directory: %s\n", dir);
            return false;
        }
        printf("Created config directory: %s\n", dir);
    }
#endif

    return true;
}

// Load window configuration
WindowConfig LoadWindowConfig(void) {
    WindowConfig config = {
        .windowX = -1,  // -1 means use system default
        .windowY = -1,
        .windowWidth = WINDOW_WIDTH,
        .windowHeight = WINDOW_HEIGHT,
        .isValid = false
    };

    const char* filePath = GetConfigFilePath();
    FILE* file = fopen(filePath, "r");
    if (!file) {
        printf("No config file found at: %s (using defaults)\n", filePath);
        return config;
    }

    char line[256];
    while (fgets(line, sizeof(line), file)) {
        // Skip comments and empty lines
        if (line[0] == '#' || line[0] == ';' || line[0] == '\n' || line[0] == '\r') {
            continue;
        }

        // Parse key=value pairs
        char key[64], value[64];
        if (sscanf(line, "%63[^=]=%63s", key, value) == 2) {
            // Trim whitespace from key
            char* k = key;
            while (*k == ' ' || *k == '\t') k++;
            char* end = k + strlen(k) - 1;
            while (end > k && (*end == ' ' || *end == '\t')) *end-- = '\0';

            if (strcmp(k, "window_x") == 0) {
                config.windowX = atoi(value);
            } else if (strcmp(k, "window_y") == 0) {
                config.windowY = atoi(value);
            } else if (strcmp(k, "window_width") == 0) {
                int w = atoi(value);
                if (w >= 400 && w <= 7680) config.windowWidth = w;
            } else if (strcmp(k, "window_height") == 0) {
                int h = atoi(value);
                if (h >= 300 && h <= 4320) config.windowHeight = h;
            }
        }
    }

    fclose(file);

    // Mark as valid if we found at least position
    if (config.windowX != -1 && config.windowY != -1) {
        config.isValid = true;
        printf("Loaded window config: pos(%d, %d) size(%dx%d)\n",
               config.windowX, config.windowY, config.windowWidth, config.windowHeight);
    }

    return config;
}

// Save window configuration
bool SaveWindowConfig(int x, int y, int width, int height) {
    if (!EnsureConfigDirExists()) {
        return false;
    }

    const char* filePath = GetConfigFilePath();
    FILE* file = fopen(filePath, "w");
    if (!file) {
        printf("Failed to save config to: %s\n", filePath);
        return false;
    }

    fprintf(file, "# Manga Viewer Configuration\n");
    fprintf(file, "# This file is auto-generated\n\n");
    fprintf(file, "[window]\n");
    fprintf(file, "window_x=%d\n", x);
    fprintf(file, "window_y=%d\n", y);
    fprintf(file, "window_width=%d\n", width);
    fprintf(file, "window_height=%d\n", height);

    fclose(file);
    printf("Saved window config: pos(%d, %d) size(%dx%d)\n", x, y, width, height);

    return true;
}
