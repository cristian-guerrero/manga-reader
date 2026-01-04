package persistence

import (
	"sync"
)

const settingsFile = "settings.json"

// Settings represents the application settings
type Settings struct {
	// Language code (en, es, etc.)
	Language string `json:"language"`
	// Theme ID
	Theme string `json:"theme"`
	// Default viewer mode (vertical, lateral)
	ViewerMode string `json:"viewerMode"`
	// Width percentage for vertical viewer (10-100)
	VerticalWidth int `json:"verticalWidth"`
	// Lateral viewer mode (single, double)
	LateralMode string `json:"lateralMode"`
	// Reading direction (ltr, rtl)
	ReadingDirection string `json:"readingDirection"`
	// Panic button key
	PanicKey string `json:"panicKey"`
	// Last opened folder path
	LastFolder string `json:"lastFolder"`
	// Sidebar collapsed state
	SidebarCollapsed bool `json:"sidebarCollapsed"`
	// Show image info overlay
	ShowImageInfo bool `json:"showImageInfo"`
	// Preload adjacent images
	PreloadImages bool `json:"preloadImages"`
	// Number of images to preload
	PreloadCount int `json:"preloadCount"`
}

// DefaultSettings returns the default settings
func DefaultSettings() *Settings {
	return &Settings{
		Language:         "en",
		Theme:            "dark",
		ViewerMode:       "vertical",
		VerticalWidth:    80,
		LateralMode:      "single",
		ReadingDirection: "ltr",
		PanicKey:         "Escape",
		LastFolder:       "",
		SidebarCollapsed: false,
		ShowImageInfo:    false,
		PreloadImages:    true,
		PreloadCount:     3,
	}
}

// SettingsManager handles settings persistence
type SettingsManager struct {
	settings *Settings
	mu       sync.RWMutex
}

// NewSettingsManager creates a new settings manager
func NewSettingsManager() *SettingsManager {
	sm := &SettingsManager{
		settings: DefaultSettings(),
	}
	sm.Load()
	return sm
}

// Get returns the current settings
func (sm *SettingsManager) Get() *Settings {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	// Return a copy to prevent external modification
	copy := *sm.settings
	return &copy
}

// Save saves the settings to disk
func (sm *SettingsManager) Save(settings *Settings) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	sm.settings = settings
	return saveJSON(settingsFile, settings)
}

// Load loads the settings from disk
func (sm *SettingsManager) Load() error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	if !fileExists(settingsFile) {
		// Save default settings
		return saveJSON(settingsFile, sm.settings)
	}

	settings := &Settings{}
	if err := loadJSON(settingsFile, settings); err != nil {
		return err
	}

	sm.settings = settings
	return nil
}

// Update updates specific settings fields
func (sm *SettingsManager) Update(updates map[string]interface{}) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	// Apply updates
	for key, value := range updates {
		switch key {
		case "language":
			if v, ok := value.(string); ok {
				sm.settings.Language = v
			}
		case "theme":
			if v, ok := value.(string); ok {
				sm.settings.Theme = v
			}
		case "viewerMode":
			if v, ok := value.(string); ok {
				sm.settings.ViewerMode = v
			}
		case "verticalWidth":
			if v, ok := value.(float64); ok {
				sm.settings.VerticalWidth = int(v)
			}
		case "lateralMode":
			if v, ok := value.(string); ok {
				sm.settings.LateralMode = v
			}
		case "readingDirection":
			if v, ok := value.(string); ok {
				sm.settings.ReadingDirection = v
			}
		case "panicKey":
			if v, ok := value.(string); ok {
				sm.settings.PanicKey = v
			}
		case "lastFolder":
			if v, ok := value.(string); ok {
				sm.settings.LastFolder = v
			}
		case "sidebarCollapsed":
			if v, ok := value.(bool); ok {
				sm.settings.SidebarCollapsed = v
			}
		case "showImageInfo":
			if v, ok := value.(bool); ok {
				sm.settings.ShowImageInfo = v
			}
		case "preloadImages":
			if v, ok := value.(bool); ok {
				sm.settings.PreloadImages = v
			}
		case "preloadCount":
			if v, ok := value.(float64); ok {
				sm.settings.PreloadCount = int(v)
			}
		}
	}

	return saveJSON(settingsFile, sm.settings)
}
