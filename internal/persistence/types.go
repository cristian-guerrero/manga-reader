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

// AddFolderResult represents the result of adding a folder
type AddFolderResult struct {
	Path     string `json:"path"`
	IsSeries bool   `json:"isSeries"`
}
