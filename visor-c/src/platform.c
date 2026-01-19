// platform.c - Platform-specific implementations
#include "platform.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _WIN32
    #define WIN32_LEAN_AND_MEAN
    #define NOGDI
    #define NOUSER
    #include <windows.h>
    #undef near
    #undef far
#else
    #include <dirent.h>
    #include <sys/stat.h>
#endif

// Platform initialization
void PlatformInit(void) {
#ifdef _WIN32
    // Set console to UTF-8 output
    SetConsoleOutputCP(CP_UTF8);
#endif
}

#ifdef _WIN32
// Convert UTF-8 to UTF-16 (wide string)
static wchar_t* Utf8ToUtf16(const char* utf8) {
    if (!utf8) return NULL;
    int size = MultiByteToWideChar(CP_UTF8, 0, utf8, -1, NULL, 0);
    wchar_t* wide = (wchar_t*)malloc(size * sizeof(wchar_t));
    if (wide) {
        MultiByteToWideChar(CP_UTF8, 0, utf8, -1, wide, size);
    }
    return wide;
}

// Convert UTF-16 to UTF-8
static char* Utf16ToUtf8(const wchar_t* wide) {
    if (!wide) return NULL;
    int size = WideCharToMultiByte(CP_UTF8, 0, wide, -1, NULL, 0, NULL, NULL);
    char* utf8 = (char*)malloc(size);
    if (utf8) {
        WideCharToMultiByte(CP_UTF8, 0, wide, -1, utf8, size, NULL, NULL);
    }
    return utf8;
}
#endif

// Check if path is a directory
bool IsDirectory(const char* path) {
#ifdef _WIN32
    wchar_t* wPath = Utf8ToUtf16(path);
    if (!wPath) return false;
    
    DWORD attrs = GetFileAttributesW(wPath);
    free(wPath);
    
    return (attrs != INVALID_FILE_ATTRIBUTES) && (attrs & FILE_ATTRIBUTE_DIRECTORY);
#else
    struct stat st;
    if (stat(path, &st) != 0) return false;
    return S_ISDIR(st.st_mode);
#endif
}

// Iterate over directory entries
void IterateDirectory(const char* path, DirEntryCallback callback, void* userData) {
#ifdef _WIN32
    char searchPath[600];
    snprintf(searchPath, sizeof(searchPath), "%s\\*", path);
    
    wchar_t* wSearchPath = Utf8ToUtf16(searchPath);
    if (!wSearchPath) return;
    
    WIN32_FIND_DATAW findData;
    HANDLE hFind = FindFirstFileW(wSearchPath, &findData);
    free(wSearchPath);
    
    if (hFind == INVALID_HANDLE_VALUE) return;
    
    do {
        // Skip . and ..
        if (findData.cFileName[0] == L'.') {
            if (findData.cFileName[1] == L'\0') continue;
            if (findData.cFileName[1] == L'.' && findData.cFileName[2] == L'\0') continue;
        }
        
        char* utf8Name = Utf16ToUtf8(findData.cFileName);
        if (utf8Name) {
            bool isDir = (findData.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) != 0;
            bool continueIteration = callback(utf8Name, isDir, userData);
            free(utf8Name);
            if (!continueIteration) break;
        }
    } while (FindNextFileW(hFind, &findData));
    
    FindClose(hFind);
#else
    DIR* dir = opendir(path);
    if (!dir) return;
    
    struct dirent* entry;
    while ((entry = readdir(dir)) != NULL) {
        // Skip . and ..
        if (entry->d_name[0] == '.') {
            if (entry->d_name[1] == '\0') continue;
            if (entry->d_name[1] == '.' && entry->d_name[2] == '\0') continue;
        }
        
        // Check if directory
        char fullPath[600];
        snprintf(fullPath, sizeof(fullPath), "%s/%s", path, entry->d_name);
        bool isDir = IsDirectory(fullPath);
        
        bool continueIteration = callback(entry->d_name, isDir, userData);
        if (!continueIteration) break;
    }
    
    closedir(dir);
#endif
}
