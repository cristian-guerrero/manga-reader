package persistence

import (
	"sync"
)

const tabsFile = "tabs.json"

// Tab represents a single tab
type Tab struct {
	ID                       string            `json:"id"`
	Title                    string            `json:"title"`
	Page                     string            `json:"page"`
	FromPage                 string            `json:"fromPage"`
	Params                   map[string]string `json:"params"`
	ExplorerState            interface{}       `json:"explorerState"`
	ThumbnailScrollPositions interface{}       `json:"thumbnailScrollPositions"`
}

// TabsData represents the saved tabs data
type TabsData struct {
	ActiveTabID string `json:"activeTabId"`
	Tabs        []Tab  `json:"tabs"`
}

// TabsManager handles tabs persistence
type TabsManager struct {
	data *TabsData
	mu   sync.RWMutex
}

// NewTabsManager creates a new tabs manager
func NewTabsManager() *TabsManager {
	tm := &TabsManager{
		data: &TabsData{
			ActiveTabID: "",
			Tabs:        []Tab{},
		},
	}
	tm.Load()
	return tm
}

// GetTabs returns the current tabs data
func (tm *TabsManager) GetTabs() *TabsData {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	// Return a copy
	tabs := make([]Tab, len(tm.data.Tabs))
	copy(tabs, tm.data.Tabs)

	return &TabsData{
		ActiveTabID: tm.data.ActiveTabID,
		Tabs:        tabs,
	}
}

// SaveTabs saves the tabs data
func (tm *TabsManager) SaveTabs(data *TabsData) error {
	tm.mu.Lock()
	tm.data = data
	tm.mu.Unlock()

	return tm.Save()
}

// Load loads the tabs from disk
func (tm *TabsManager) Load() error {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	if !fileExists(tabsFile) {
		return nil
	}

	data := &TabsData{}
	if err := loadJSON(tabsFile, data); err != nil {
		return err
	}

	tm.data = data
	return nil
}

// Save saves the tabs to disk
func (tm *TabsManager) Save() error {
	tm.mu.RLock()
	data := *tm.data
	tm.mu.RUnlock()

	return saveJSON(tabsFile, &data)
}
