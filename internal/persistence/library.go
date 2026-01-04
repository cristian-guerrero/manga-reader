package persistence

import (
	"crypto/md5"
	"fmt"
	"sort"
	"sync"
	"time"
)

const libraryFile = "library.json"

// LibraryEntry represents a library folder entry
type LibraryEntry struct {
	ID          string `json:"id"`
	FolderPath  string `json:"folderPath"`
	FolderName  string `json:"folderName"`
	TotalImages int    `json:"totalImages"`
	AddedAt     string `json:"addedAt"`
	CoverImage  string `json:"coverImage,omitempty"`
}

// Library represents the library structure
type Library struct {
	Entries []LibraryEntry `json:"entries"`
}

// LibraryManager handles library persistence
type LibraryManager struct {
	library *Library
	mu      sync.RWMutex
}

// NewLibraryManager creates a new library manager
func NewLibraryManager() *LibraryManager {
	lm := &LibraryManager{
		library: &Library{
			Entries: []LibraryEntry{},
		},
	}
	lm.Load()
	return lm
}

// GetAll returns all library entries
func (lm *LibraryManager) GetAll() []LibraryEntry {
	lm.mu.RLock()
	defer lm.mu.RUnlock()

	entries := make([]LibraryEntry, len(lm.library.Entries))
	copy(entries, lm.library.Entries)
	return entries
}

// Get returns a specific library entry
func (lm *LibraryManager) Get(folderPath string) *LibraryEntry {
	lm.mu.RLock()
	defer lm.mu.RUnlock()

	id := generateID(folderPath) // Reusing generateID from history if possible, or duplicate
	for _, entry := range lm.library.Entries {
		if entry.ID == id {
			copy := entry
			return &copy
		}
	}
	return nil
}

// Add adds a library entry
func (lm *LibraryManager) Add(entry LibraryEntry) error {
	lm.mu.Lock()
	defer lm.mu.Unlock()

	if entry.ID == "" {
		hash := md5.Sum([]byte(entry.FolderPath))
		entry.ID = fmt.Sprintf("%x", hash)
	}

	if entry.AddedAt == "" {
		entry.AddedAt = time.Now().Format(time.RFC3339)
	}

	// Check if already exists
	for i, e := range lm.library.Entries {
		if e.ID == entry.ID {
			// Update info
			lm.library.Entries[i].TotalImages = entry.TotalImages
			lm.library.Entries[i].FolderName = entry.FolderName
			lm.library.Entries[i].CoverImage = entry.CoverImage // Update cover image in case it changed (e.g. filter)
			return saveJSON(libraryFile, lm.library)

		}
	}

	lm.library.Entries = append(lm.library.Entries, entry)

	// Sort by name
	sort.Slice(lm.library.Entries, func(i, j int) bool {
		return lm.library.Entries[i].FolderName < lm.library.Entries[j].FolderName
	})

	return saveJSON(libraryFile, lm.library)
}

// Remove removes a library entry
func (lm *LibraryManager) Remove(folderPath string) error {
	lm.mu.Lock()
	defer lm.mu.Unlock()

	hash := md5.Sum([]byte(folderPath))
	id := fmt.Sprintf("%x", hash)

	for i, entry := range lm.library.Entries {
		if entry.ID == id {
			lm.library.Entries = append(lm.library.Entries[:i], lm.library.Entries[i+1:]...)
			return saveJSON(libraryFile, lm.library)
		}
	}
	return nil
}

// Clear removes all library entries
func (lm *LibraryManager) Clear() error {
	lm.mu.Lock()
	defer lm.mu.Unlock()

	lm.library.Entries = []LibraryEntry{}
	return saveJSON(libraryFile, lm.library)
}

// Load loads library from disk
func (lm *LibraryManager) Load() error {
	lm.mu.Lock()
	defer lm.mu.Unlock()

	if !fileExists(libraryFile) {
		return saveJSON(libraryFile, lm.library)
	}

	library := &Library{}
	if err := loadJSON(libraryFile, library); err != nil {
		return err
	}

	lm.library = library
	return nil
}
