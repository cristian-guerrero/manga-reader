package persistence

// LibraryInfo represents a registered library in the JSON registry
type LibraryInfo struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Filename  string `json:"filename"`
	IsDefault bool   `json:"isDefault"`
}

// LibraryRegistryData represents the entire JSON registry file
type LibraryRegistryData struct {
	Libraries      []LibraryInfo `json:"libraries"`
	ActiveLibraryID string       `json:"activeLibraryId"`
}
