// platform.h - Platform-specific abstractions
#ifndef PLATFORM_H
#define PLATFORM_H

#include <stdbool.h>

// Directory entry callback - return false to stop iteration
typedef bool (*DirEntryCallback)(const char* name, bool isDirectory, void* userData);

// Initialize platform (call once at startup)
void PlatformInit(void);

// Check if path is a directory
bool IsDirectory(const char* path);

// Iterate over directory entries
// Callback receives UTF-8 encoded names on all platforms
void IterateDirectory(const char* path, DirEntryCallback callback, void* userData);

#endif // PLATFORM_H
