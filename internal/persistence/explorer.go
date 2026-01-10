package persistence

import (
	"fmt"
	"sync"
)

const explorerFile = "explorer.json"

// BaseFolder represents a root folder added to the explorer
type BaseFolder struct {
	Path       string `json:"path"`
	AddedAt    string `json:"addedAt"`
	Name       string `json:"name"`
	IsVisible  bool   `json:"isVisible"`  // To optionally hide it without deleting
	CoverImage string `json:"coverImage"` // Cached cover image path
}

// ExplorerManager handles persistence for explorer base folders
type ExplorerManager struct {
	folders []BaseFolder
	mu      sync.RWMutex
}

// NewExplorerManager creates a new explorer persistence manager
func NewExplorerManager() *ExplorerManager {
	em := &ExplorerManager{
		folders: []BaseFolder{},
	}
	em.Load()
	return em
}

// Load loads the base folders from disk
func (em *ExplorerManager) Load() error {
	em.mu.Lock()
	defer em.mu.Unlock()

	if !fileExists(explorerFile) {
		return saveJSON(explorerFile, em.folders)
	}

	var folders []BaseFolder
	if err := loadJSON(explorerFile, &folders); err != nil {
		return err
	}

	em.folders = folders
	return nil
}

// Save saves the base folders to disk
func (em *ExplorerManager) Save() error {
	em.mu.RLock()
	defer em.mu.RUnlock()
	return saveJSON(explorerFile, em.folders)
}

// Add adds a new base folder
func (em *ExplorerManager) Add(folder BaseFolder) error {
	em.mu.Lock()
	defer em.mu.Unlock()

	// Check for duplicates
	for _, f := range em.folders {
		if f.Path == folder.Path {
			return fmt.Errorf("folder already exists")
		}
	}

	em.folders = append(em.folders, folder)
	return saveJSON(explorerFile, em.folders)
}

// Remove removes a base folder
func (em *ExplorerManager) Remove(path string) error {
	em.mu.Lock()
	defer em.mu.Unlock()

	for i, f := range em.folders {
		if f.Path == path {
			// Remove element
			em.folders = append(em.folders[:i], em.folders[i+1:]...)
			return saveJSON(explorerFile, em.folders)
		}
	}

	return fmt.Errorf("folder not found")
}

// UpdateCoverImage updates the cached cover image for a base folder
func (em *ExplorerManager) UpdateCoverImage(path string, coverImage string) error {
	em.mu.Lock()
	defer em.mu.Unlock()

	for i, f := range em.folders {
		if f.Path == path {
			em.folders[i].CoverImage = coverImage
			return saveJSON(explorerFile, em.folders)
		}
	}

	return fmt.Errorf("folder not found")
}

// GetAll returns all base folders
func (em *ExplorerManager) GetAll() []BaseFolder {
	em.mu.RLock()
	defer em.mu.RUnlock()

	result := make([]BaseFolder, len(em.folders))
	copy(result, em.folders)
	return result
}
