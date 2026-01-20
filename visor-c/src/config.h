// config.h - Window configuration persistence
#ifndef CONFIG_H
#define CONFIG_H

#include <stdbool.h>

// Window configuration structure
typedef struct {
    int windowX;
    int windowY;
    int windowWidth;
    int windowHeight;
    bool isValid;  // True if config was loaded successfully
} WindowConfig;

// Get the config directory path (~/.manga-visor on Linux, %APPDATA%\.manga-visor on Windows)
// Returns pointer to static buffer, do not free
const char* GetConfigDir(void);

// Load window configuration from config.ini
// Returns default values if file doesn't exist
WindowConfig LoadWindowConfig(void);

// Save window configuration to config.ini
// Creates the config directory if it doesn't exist
bool SaveWindowConfig(int x, int y, int width, int height);

#endif // CONFIG_H
