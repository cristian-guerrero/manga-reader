package persistence

import (
	"fmt"
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
	// Enable/Disable history tracking
	EnableHistory bool `json:"enableHistory"`
	// Minimum image size in KB to display
	MinImageSize int64 `json:"minImageSize"`
	// Process dropped folders (add to library and save history)
	ProcessDroppedFolders bool `json:"processDroppedFolders"`
	// Window dimensions
	WindowWidth     int  `json:"windowWidth"`
	WindowHeight    int  `json:"windowHeight"`
	WindowX         int  `json:"windowX"`
	WindowY         int  `json:"windowY"`
	WindowMaximized bool `json:"windowMaximized"`
	// Last page visited (for startup restore)
	LastPage string `json:"lastPage"`
	// Enabled menu items
	EnabledMenuItems map[string]bool `json:"enabledMenuItems"`
	// Download path
	DownloadPath string `json:"downloadPath"`
	// Clipboard auto monitor
	ClipboardAutoMonitor bool `json:"clipboardAutoMonitor"`
	// Auto resume incomplete downloads
	AutoResumeDownloads bool `json:"autoResumeDownloads"`
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

		EnableHistory:         true,
		MinImageSize:          0,
		ProcessDroppedFolders: true,
		WindowWidth:           1280,
		WindowHeight:          800,
		WindowX:               -1, // -1 means center
		WindowY:               -1,
		WindowMaximized:       false,
		LastPage:              "home",
		EnabledMenuItems: map[string]bool{
			"home":     true,
			"history":  true,
			"folders":  true,
			"series":   true,
			"explorer": true,
			"settings": true,
			"download": true,
		},
		DownloadPath:         "", // empty means default
		ClipboardAutoMonitor: false,
		AutoResumeDownloads:  false,
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

	settings := DefaultSettings()

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
		fmt.Printf("[SettingsManager] Updating field %s to %v\n", key, value)
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
		case "enableHistory":
			if v, ok := value.(bool); ok {
				sm.settings.EnableHistory = v
			}
		case "minImageSize":
			// fmt.Printf("Updating minImageSize: %v (%T)\n", value, value)
			if v, ok := value.(float64); ok {
				sm.settings.MinImageSize = int64(v)
			} else if v, ok := value.(int); ok {
				sm.settings.MinImageSize = int64(v)
			} else if v, ok := value.(int64); ok {
				sm.settings.MinImageSize = v
			} else {
				fmt.Printf("Failed to update minImageSize: invalid type %v (%T)\n", value, value)
			}
		case "processDroppedFolders":
			if v, ok := value.(bool); ok {
				sm.settings.ProcessDroppedFolders = v
			}
		case "windowWidth":
			if v, ok := value.(float64); ok {
				sm.settings.WindowWidth = int(v)
			} else if v, ok := value.(int); ok {
				sm.settings.WindowWidth = v
			}
		case "windowHeight":
			if v, ok := value.(float64); ok {
				sm.settings.WindowHeight = int(v)
			} else if v, ok := value.(int); ok {
				sm.settings.WindowHeight = v
			}
		case "windowX":
			if v, ok := value.(float64); ok {
				sm.settings.WindowX = int(v)
			} else if v, ok := value.(int); ok {
				sm.settings.WindowX = v
			}
		case "windowY":
			if v, ok := value.(float64); ok {
				sm.settings.WindowY = int(v)
			} else if v, ok := value.(int); ok {
				sm.settings.WindowY = v
			}
		case "windowMaximized":
			if v, ok := value.(bool); ok {
				sm.settings.WindowMaximized = v
			}
		case "lastPage":
			if v, ok := value.(string); ok {
				sm.settings.LastPage = v
			}
		case "enabledMenuItems":
			if v, ok := value.(map[string]interface{}); ok {
				newMap := make(map[string]bool)
				for k, val := range v {
					if boolVal, ok := val.(bool); ok {
						newMap[k] = boolVal
					}
				}
				sm.settings.EnabledMenuItems = newMap
			}
		case "downloadPath":
			if v, ok := value.(string); ok {
				sm.settings.DownloadPath = v
			}
		case "clipboardAutoMonitor":
			if v, ok := value.(bool); ok {
				sm.settings.ClipboardAutoMonitor = v
			}
		case "autoResumeDownloads":
			if v, ok := value.(bool); ok {
				sm.settings.AutoResumeDownloads = v
			}
		}

	}

	return saveJSON(settingsFile, sm.settings)
}
