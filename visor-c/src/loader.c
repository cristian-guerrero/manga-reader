// Image loader using libvips
// This file is compiled separately to avoid header conflicts with raylib

#include "loader.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <vips/vips.h>

// Extensions that need vips (not supported by raylib natively)
static const char* vipsExtensions[] = {
    ".avif", ".webp", ".heic", ".heif", ".jxl", ".tiff", ".tif", NULL
};

bool InitImageLoader(const char* argv0) {
    if (VIPS_INIT(argv0)) {
        fprintf(stderr, "Failed to initialize VIPS\n");
        return false;
    }
    return true;
}

void ShutdownImageLoader(void) {
    vips_shutdown();
}

bool NeedsVipsLoader(const char* filename) {
    const char* ext = strrchr(filename, '.');
    if (!ext) return false;
    
    for (int i = 0; vipsExtensions[i] != NULL; i++) {
        if (strcasecmp(ext, vipsExtensions[i]) == 0) {
            return true;
        }
    }
    return false;
}

ImageData LoadImageVips(const char* fileName) {
    ImageData image = { 0 };
    
    char fullPath[1024];
    const char* pathToUse = fileName;
    
    // Add long path prefix if needed on Windows
#ifdef _WIN32
    if (strlen(fileName) >= 240 && fileName[1] == ':' && fileName[2] == '\\' && strncmp(fileName, "\\\\?\\", 4) != 0) {
        snprintf(fullPath, sizeof(fullPath), "\\\\?\\%s", fileName);
        pathToUse = fullPath;
    }
#endif
    
    VipsImage *vimg = vips_image_new_from_file(pathToUse, NULL);
    
    if (!vimg) {
        printf("VIPS Error: %s\n", vips_error_buffer());
        vips_error_clear();
        return image;
    }
    
    // Convert to sRGB if needed
    VipsImage *rgb = NULL;
    if (vips_colourspace(vimg, &rgb, VIPS_INTERPRETATION_sRGB, NULL)) {
        printf("VIPS: Colourspace conversion failed for: %s\n", fileName);
        g_object_unref(vimg);
        return image;
    }
    g_object_unref(vimg);
    vimg = rgb;
    
    // Add alpha channel if not present (to get 4 bands)
    if (vips_image_get_bands(vimg) < 4) {
        VipsImage *rgba = NULL;
        if (vips_bandjoin_const1(vimg, &rgba, 255, NULL)) {
            printf("VIPS: Failed to add alpha channel\n");
            g_object_unref(vimg);
            return image;
        }
        g_object_unref(vimg);
        vimg = rgba;
    }
    
    // Cast to 8-bit if needed
    if (vips_image_get_format(vimg) != VIPS_FORMAT_UCHAR) {
        VipsImage *cast = NULL;
        if (vips_cast(vimg, &cast, VIPS_FORMAT_UCHAR, NULL)) {
            printf("VIPS: Cast failed\n");
            g_object_unref(vimg);
            return image;
        }
        g_object_unref(vimg);
        vimg = cast;
    }
    
    int width = vips_image_get_width(vimg);
    int height = vips_image_get_height(vimg);
    int bands = vips_image_get_bands(vimg);
    
    // Get pixel data
    size_t dataSize;
    void *data = vips_image_write_to_memory(vimg, &dataSize);
    
    if (!data) {
        printf("VIPS: Failed to get image data\n");
        g_object_unref(vimg);
        return image;
    }
    
    // Create ImageData
    image.width = width;
    image.height = height;
    image.mipmaps = 1;
    
    if (bands >= 4) {
        image.format = PIXELFORMAT_R8G8B8A8;
        image.data = malloc(width * height * 4);
        memcpy(image.data, data, width * height * 4);
    } else {
        image.format = PIXELFORMAT_R8G8B8;
        image.data = malloc(width * height * 3);
        memcpy(image.data, data, width * height * 3);
    }
    
    g_free(data);
    g_object_unref(vimg);
    
    printf("VIPS: Loaded %dx%d (%d bands)\n", width, height, bands);
    return image;
}

ImageData LoadThumbnailVips(const char* fileName, int width) {
    ImageData image = { 0 };
    VipsImage *vimg = NULL;
    
    char fullPath[1024];
    const char* pathToUse = fileName;
    
    // Add long path prefix if needed on Windows
#ifdef _WIN32
    if (strlen(fileName) >= 240 && fileName[1] == ':' && fileName[2] == '\\' && strncmp(fileName, "\\\\?\\", 4) != 0) {
        snprintf(fullPath, sizeof(fullPath), "\\\\?\\%s", fileName);
        pathToUse = fullPath;
    }
#endif
    
    // vips_thumbnail is extremely fast because it performs shrink-on-load
    if (vips_thumbnail(pathToUse, &vimg, width, "height", 10000000, NULL)) {
        printf("VIPS Error: %s\n", vips_error_buffer());
        vips_error_clear();
        return image;
    }
    
    // Convert to sRGB if needed
    VipsImage *rgb = NULL;
    if (vips_colourspace(vimg, &rgb, VIPS_INTERPRETATION_sRGB, NULL)) {
        g_object_unref(vimg);
        return image;
    }
    g_object_unref(vimg);
    vimg = rgb;
    
    // Add alpha channel if not present
    if (vips_image_get_bands(vimg) < 4) {
        VipsImage *rgba = NULL;
        vips_bandjoin_const1(vimg, &rgba, 255, NULL);
        g_object_unref(vimg);
        vimg = rgba;
    }
    
    int t_width = vips_image_get_width(vimg);
    int t_height = vips_image_get_height(vimg);
    size_t dataSize;
    void *data = vips_image_write_to_memory(vimg, &dataSize);
    
    if (data) {
        image.width = t_width;
        image.height = t_height;
        image.mipmaps = 1;
        image.format = PIXELFORMAT_R8G8B8A8;
        image.data = malloc(t_width * t_height * 4);
        memcpy(image.data, data, t_width * t_height * 4);
        g_free(data);
    }
    
    g_object_unref(vimg);
    return image;
}

bool GetImageSizeVips(const char* fileName, int* width, int* height) {
    char fullPath[1024];
    const char* pathToUse = fileName;
    
#ifdef _WIN32
    if (strlen(fileName) >= 240 && fileName[1] == ':' && fileName[2] == '\\' && strncmp(fileName, "\\\\?\\", 4) != 0) {
        snprintf(fullPath, sizeof(fullPath), "\\\\?\\%s", fileName);
        pathToUse = fullPath;
    }
#endif

    VipsImage *vimg = vips_image_new_from_file(pathToUse, "access", VIPS_ACCESS_SEQUENTIAL, NULL);
    if (!vimg) return false;
    
    *width = vips_image_get_width(vimg);
    *height = vips_image_get_height(vimg);
    
    g_object_unref(vimg);
    return true;
}

void FreeImageData(ImageData* img) {
    if (img && img->data) {
        free(img->data);
        img->data = NULL;
    }
}
