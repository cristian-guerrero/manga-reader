package persistence

// FolderInfo represents information about a folder for frontend consumption
// Moved from app.go to shared persistence package
type FolderInfo struct {
	Path         string `json:"path"`
	Name         string `json:"name"`
	ImageCount   int    `json:"imageCount"`
	CoverImage   string `json:"coverImage"`
	ThumbnailURL string `json:"thumbnailUrl,omitempty"`
	LastModified string `json:"lastModified,omitempty"`
}

type AddFolderResult struct {
	Path     string `json:"path"`
	IsSeries bool   `json:"isSeries"`
}

// ImageInfo represents information about an image for frontend consumption
type ImageInfo struct {
	Path         string `json:"path"`
	ThumbnailURL string `json:"thumbnailUrl"`
	ImageURL     string `json:"imageUrl"`
	Name         string `json:"name"`
	Extension    string `json:"extension"`
	Size         int64  `json:"size"`
	Index        int    `json:"index"`
	ModTime      int64  `json:"modTime"`
}
