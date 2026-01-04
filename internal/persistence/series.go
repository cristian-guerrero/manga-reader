package persistence

import (
	"sort"
	"sync"
	"time"
)

const seriesFile = "series.json"

// ChapterInfo represents information about a chapter in a series
type ChapterInfo struct {
	Path       string `json:"path"`
	Name       string `json:"name"`
	ImageCount int    `json:"imageCount"`
}

// SeriesEntry represents a series folder entry
type SeriesEntry struct {
	ID         string        `json:"id"`
	Path       string        `json:"path"`
	Name       string        `json:"name"`
	CoverImage string        `json:"coverImage"`
	AddedAt    string        `json:"addedAt"`
	Chapters   []ChapterInfo `json:"chapters"`
}

// Series represents the series structure
type Series struct {
	Entries []SeriesEntry `json:"entries"`
}

// SeriesManager handles series persistence
type SeriesManager struct {
	series *Series
	mu     sync.RWMutex
}

// NewSeriesManager creates a new series manager
func NewSeriesManager() *SeriesManager {
	sm := &SeriesManager{
		series: &Series{
			Entries: []SeriesEntry{},
		},
	}
	sm.Load()
	return sm
}

// GetAll returns all series entries
func (sm *SeriesManager) GetAll() []SeriesEntry {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	entries := make([]SeriesEntry, len(sm.series.Entries))
	copy(entries, sm.series.Entries)
	return entries
}

// Get returns a specific series entry
func (sm *SeriesManager) Get(path string) *SeriesEntry {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	id := generateID(path)
	for _, entry := range sm.series.Entries {
		if entry.ID == id {
			copy := entry
			return &copy
		}
	}
	return nil
}

// Add adds or updates a series entry
func (sm *SeriesManager) Add(entry SeriesEntry) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	if entry.ID == "" {
		entry.ID = generateID(entry.Path)
	}

	if entry.AddedAt == "" {
		entry.AddedAt = time.Now().Format(time.RFC3339)
	}

	// Check if already exists
	found := false
	for i, e := range sm.series.Entries {
		if e.ID == entry.ID {
			sm.series.Entries[i] = entry
			found = true
			break
		}
	}

	if !found {
		sm.series.Entries = append(sm.series.Entries, entry)
	}

	// Sort by name
	sort.Slice(sm.series.Entries, func(i, j int) bool {
		return sm.series.Entries[i].Name < sm.series.Entries[j].Name
	})

	return saveJSON(seriesFile, sm.series)
}

// Remove removes a series entry
func (sm *SeriesManager) Remove(path string) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	id := generateID(path)
	for i, entry := range sm.series.Entries {
		if entry.ID == id {
			sm.series.Entries = append(sm.series.Entries[:i], sm.series.Entries[i+1:]...)
			return saveJSON(seriesFile, sm.series)
		}
	}
	return nil
}

// Clear removes all series entries
func (sm *SeriesManager) Clear() error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	sm.series.Entries = []SeriesEntry{}
	return saveJSON(seriesFile, sm.series)
}

// Load loads series from disk
func (sm *SeriesManager) Load() error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	if !fileExists(seriesFile) {
		return saveJSON(seriesFile, sm.series)
	}

	series := &Series{}
	if err := loadJSON(seriesFile, series); err != nil {
		return err
	}

	sm.series = series
	return nil
}
