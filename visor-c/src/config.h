// config.h - Window configuration persistence
#ifndef CONFIG_H
#define CONFIG_H

#include <stdbool.h>

// Application configuration structure
typedef struct {
    // Window settings
    int windowX;
    int windowY;
    int windowWidth;
    int windowHeight;
    // Scroll settings
    float scrollSmoothing;
    float autoScrollSpeed;
    // Validity flag
    bool isValid;  // True if config was loaded successfully
} AppConfig;

// Get the config directory path (~/.manga-visor on Linux, %APPDATA%\.manga-visor on Windows)
// Returns pointer to static buffer, do not free
const char* GetConfigDir(void);

// Load application configuration from config.ini
// Returns default values if file doesn't exist
AppConfig LoadAppConfig(void);

// Save application configuration to config.ini
// Creates the config directory if it doesn't exist
bool SaveAppConfig(int x, int y, int width, int height, float scrollSmoothing, float autoScrollSpeed);

#endif // CONFIG_H
