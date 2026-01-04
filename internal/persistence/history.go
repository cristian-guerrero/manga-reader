package persistence

import (
	"crypto/md5"
	"fmt"
	"sort"
	"sync"
	"time"
)

const historyFile = "history.json"
const maxHistoryEntries = 100

// HistoryEntry represents a reading history entry
type HistoryEntry struct {
	// Unique ID (hash of folder path)
	ID string `json:"id"`
	// Full path to the folder
	FolderPath string `json:"folderPath"`
	// Folder name for display
	FolderName string `json:"folderName"`
	// Last viewed image filename
	LastImage string `json:"lastImage"`
	// Last viewed image index
	LastImageIndex int `json:"lastImageIndex"`
	// Scroll position (0-1 for percentage)
	ScrollPosition float64 `json:"scrollPosition"`
	// Total number of images in folder
	TotalImages int `json:"totalImages"`
	// Last read timestamp (ISO string)
	LastRead string `json:"lastRead"`
}

// History represents the reading history
type History struct {
	Entries []HistoryEntry `json:"entries"`
}

// HistoryManager handles history persistence
type HistoryManager struct {
	history *History
	mu      sync.RWMutex
}

// NewHistoryManager creates a new history manager
func NewHistoryManager() *HistoryManager {
	hm := &HistoryManager{
		history: &History{
			Entries: []HistoryEntry{},
		},
	}
	hm.Load()
	return hm
}

// generateID generates a unique ID for a folder path
func generateID(folderPath string) string {
	hash := md5.Sum([]byte(folderPath))
	return fmt.Sprintf("%x", hash)
}

// GetAll returns all history entries
func (hm *HistoryManager) GetAll() []HistoryEntry {
	hm.mu.RLock()
	defer hm.mu.RUnlock()

	// Return a copy
	entries := make([]HistoryEntry, len(hm.history.Entries))
	copy(entries, hm.history.Entries)
	return entries
}

// Get returns a specific history entry by folder path
func (hm *HistoryManager) Get(folderPath string) *HistoryEntry {
	hm.mu.RLock()
	defer hm.mu.RUnlock()

	id := generateID(folderPath)
	for _, entry := range hm.history.Entries {
		if entry.ID == id {
			copy := entry
			return &copy
		}
	}
	return nil
}

// Add adds or updates a history entry
func (hm *HistoryManager) Add(entry HistoryEntry) error {
	hm.mu.Lock()
	defer hm.mu.Unlock()

	// Generate ID if not set
	if entry.ID == "" {
		entry.ID = generateID(entry.FolderPath)
	}

	// Set timestamp
	entry.LastRead = time.Now().Format(time.RFC3339)

	// Find and update existing entry or add new one
	found := false
	for i, e := range hm.history.Entries {
		if e.ID == entry.ID {
			hm.history.Entries[i] = entry
			found = true
			break
		}
	}

	if !found {
		hm.history.Entries = append(hm.history.Entries, entry)
	}

	// Sort by last read (most recent first)
	sort.Slice(hm.history.Entries, func(i, j int) bool {
		return hm.history.Entries[i].LastRead > hm.history.Entries[j].LastRead
	})

	// Limit entries
	if len(hm.history.Entries) > maxHistoryEntries {
		hm.history.Entries = hm.history.Entries[:maxHistoryEntries]
	}

	return saveJSON(historyFile, hm.history)
}

// Remove removes a history entry by folder path
func (hm *HistoryManager) Remove(folderPath string) error {
	hm.mu.Lock()
	defer hm.mu.Unlock()

	id := generateID(folderPath)
	for i, entry := range hm.history.Entries {
		if entry.ID == id {
			hm.history.Entries = append(hm.history.Entries[:i], hm.history.Entries[i+1:]...)
			break
		}
	}

	return saveJSON(historyFile, hm.history)
}

// Clear removes all history entries
func (hm *HistoryManager) Clear() error {
	hm.mu.Lock()
	defer hm.mu.Unlock()

	hm.history.Entries = []HistoryEntry{}
	return saveJSON(historyFile, hm.history)
}

// Load loads history from disk
func (hm *HistoryManager) Load() error {
	hm.mu.Lock()
	defer hm.mu.Unlock()

	if !fileExists(historyFile) {
		return saveJSON(historyFile, hm.history)
	}

	history := &History{}
	if err := loadJSON(historyFile, history); err != nil {
		return err
	}

	hm.history = history
	return nil
}

// Save saves history to disk
func (hm *HistoryManager) Save() error {
	hm.mu.RLock()
	defer hm.mu.RUnlock()

	return saveJSON(historyFile, hm.history)
}
