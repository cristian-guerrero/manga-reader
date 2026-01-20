#ifndef LOADER_H
#define LOADER_H

#include <stdint.h>
#include <stdbool.h>

// Image data structure (compatible with Raylib Image)
typedef struct {
    void *data;          // Pointer to image raw data
    int width;           // Image width
    int height;          // Image height
    int mipmaps;         // Number of mipmaps (1 for no mipmaps)
    int format;          // Data format (PixelFormat type)
} ImageData;

// Pixel formats (matching Raylib's PIXELFORMAT_*)
#define PIXELFORMAT_R8G8B8      4   // 24 bpp
#define PIXELFORMAT_R8G8B8A8    7   // 32 bpp

// Initialize the image loader (call once at startup)
bool InitImageLoader(const char* argv0);

// Shutdown the image loader (call at exit)
void ShutdownImageLoader(void);

// Load an image file using libvips
// Returns ImageData with data=NULL on failure
ImageData LoadImageVips(const char* fileName);

// Load an image file using libvips thumbnailing (optimized resize on load)
ImageData LoadThumbnailVips(const char* fileName, int width);

// Free image data loaded by LoadImageVips
void FreeImageData(ImageData* img);

// Get image size without loading full data
bool GetImageSizeVips(const char* fileName, int* width, int* height);

// Check if file extension needs vips loader
bool NeedsVipsLoader(const char* filename);

#endif // LOADER_H
