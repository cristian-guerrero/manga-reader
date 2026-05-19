package database

import (
	"encoding/json"
	"fmt"
	"manga-visor/internal/persistence"
	"sync"
	"time"
)

type SettingsRepository struct {
	db        *Database
	settings  *persistence.Settings
	mu        sync.RWMutex
	saveTimer *time.Timer
	tmMu      sync.Mutex
}

func NewSettingsRepository(db *Database) *SettingsRepository {
	r := &SettingsRepository{
		db:       db,
		settings: persistence.DefaultSettings(),
	}
	if err := r.Load(); err != nil {
		r.settings = persistence.DefaultSettings()
		r.saveNow()
	}
	return r
}

func (r *SettingsRepository) Get() *persistence.Settings {
	r.mu.RLock()
	defer r.mu.RUnlock()
	cp := *r.settings
	return &cp
}

func (r *SettingsRepository) Save(settings *persistence.Settings) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.settings = settings
	return r.saveNow()
}

func (r *SettingsRepository) Load() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	rows, err := r.db.db.Query("SELECT key, value FROM settings")
	if err != nil {
		return fmt.Errorf("query settings: %w", err)
	}
	defer rows.Close()

	loaded := persistence.DefaultSettings()
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return fmt.Errorf("scan setting: %w", err)
		}
		setField(loaded, key, value)
	}

	if err := rows.Err(); err != nil {
		return err
	}

	r.settings = loaded
	return nil
}

func (r *SettingsRepository) Flush() error {
	r.tmMu.Lock()
	if r.saveTimer != nil {
		r.saveTimer.Stop()
		r.saveTimer = nil
	}
	r.tmMu.Unlock()

	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.saveNow()
}

func (r *SettingsRepository) Update(updates map[string]interface{}) error {
	r.mu.Lock()

	for key, value := range updates {
		switch v := value.(type) {
		case string:
			setStringField(r.settings, key, v)
		case float64:
			setNumericField(r.settings, key, v)
		case int:
			setNumericField(r.settings, key, float64(v))
		case bool:
			setBoolField(r.settings, key, v)
		case map[string]interface{}:
			if key == "enabledMenuItems" {
				menuMap := make(map[string]bool)
				for k, mv := range v {
					if b, ok := mv.(bool); ok {
						menuMap[k] = b
					}
				}
				r.settings.EnabledMenuItems = menuMap
			}
		}
	}

	r.mu.Unlock()
	r.scheduleSave()
	return nil
}

func (r *SettingsRepository) saveNow() error {
	data := map[string]string{
		"language":              r.settings.Language,
		"theme":                 r.settings.Theme,
		"viewerMode":            r.settings.ViewerMode,
		"lateralMode":           r.settings.LateralMode,
		"readingDirection":      r.settings.ReadingDirection,
		"panicKey":              r.settings.PanicKey,
		"lastFolder":            r.settings.LastFolder,
		"lastPage":              r.settings.LastPage,
		"downloadPath":          r.settings.DownloadPath,
		"verticalWidth":         fmt.Sprintf("%d", r.settings.VerticalWidth),
		"preloadCount":          fmt.Sprintf("%d", r.settings.PreloadCount),
		"minImageSize":          fmt.Sprintf("%d", r.settings.MinImageSize),
		"windowWidth":           fmt.Sprintf("%d", r.settings.WindowWidth),
		"windowHeight":          fmt.Sprintf("%d", r.settings.WindowHeight),
		"windowX":               fmt.Sprintf("%d", r.settings.WindowX),
		"windowY":               fmt.Sprintf("%d", r.settings.WindowY),
		"sidebarCollapsed":      fmt.Sprintf("%t", r.settings.SidebarCollapsed),
		"showImageInfo":         fmt.Sprintf("%t", r.settings.ShowImageInfo),
		"preloadImages":         fmt.Sprintf("%t", r.settings.PreloadImages),
		"enableHistory":         fmt.Sprintf("%t", r.settings.EnableHistory),
		"processDroppedFolders": fmt.Sprintf("%t", r.settings.ProcessDroppedFolders),
		"windowMaximized":       fmt.Sprintf("%t", r.settings.WindowMaximized),
		"clipboardAutoMonitor":  fmt.Sprintf("%t", r.settings.ClipboardAutoMonitor),
		"autoResumeDownloads":   fmt.Sprintf("%t", r.settings.AutoResumeDownloads),
		"tabMemorySaving":       fmt.Sprintf("%t", r.settings.TabMemorySaving),
		"restoreTabs":           fmt.Sprintf("%t", r.settings.RestoreTabs),
		"generateThumbnails":    fmt.Sprintf("%t", r.settings.GenerateThumbnails),
		"savedTabs":             r.settings.SavedTabs,
	}

	if r.settings.EnabledMenuItems != nil {
		b, _ := json.Marshal(r.settings.EnabledMenuItems)
		data["enabledMenuItems"] = string(b)
	}

	tx, err := r.db.db.Begin()
	if err != nil {
		return fmt.Errorf("begin settings tx: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
	if err != nil {
		return fmt.Errorf("prepare settings stmt: %w", err)
	}
	defer stmt.Close()

	for key, value := range data {
		if _, err := stmt.Exec(key, value); err != nil {
			return fmt.Errorf("save setting %s: %w", key, err)
		}
	}

	return tx.Commit()
}

func (r *SettingsRepository) scheduleSave() {
	r.tmMu.Lock()
	defer r.tmMu.Unlock()

	if r.saveTimer != nil {
		r.saveTimer.Stop()
	}
	r.saveTimer = time.AfterFunc(1*time.Second, func() {
		r.mu.Lock()
		defer r.mu.Unlock()
		if err := r.saveNow(); err != nil {
			fmt.Printf("Error saving settings: %v\n", err)
		}
	})
}

func setField(s *persistence.Settings, key, value string) {
	switch key {
	case "language":
		s.Language = value
	case "theme":
		s.Theme = value
	case "viewerMode":
		s.ViewerMode = value
	case "lateralMode":
		s.LateralMode = value
	case "readingDirection":
		s.ReadingDirection = value
	case "panicKey":
		s.PanicKey = value
	case "lastFolder":
		s.LastFolder = value
	case "lastPage":
		s.LastPage = value
	case "downloadPath":
		s.DownloadPath = value
	case "savedTabs":
		s.SavedTabs = value
	case "verticalWidth":
		fmt.Sscanf(value, "%d", &s.VerticalWidth)
	case "preloadCount":
		fmt.Sscanf(value, "%d", &s.PreloadCount)
	case "minImageSize":
		fmt.Sscanf(value, "%d", &s.MinImageSize)
	case "windowWidth":
		fmt.Sscanf(value, "%d", &s.WindowWidth)
	case "windowHeight":
		fmt.Sscanf(value, "%d", &s.WindowHeight)
	case "windowX":
		fmt.Sscanf(value, "%d", &s.WindowX)
	case "windowY":
		fmt.Sscanf(value, "%d", &s.WindowY)
	case "sidebarCollapsed":
		s.SidebarCollapsed = value == "true"
	case "showImageInfo":
		s.ShowImageInfo = value == "true"
	case "preloadImages":
		s.PreloadImages = value == "true"
	case "enableHistory":
		s.EnableHistory = value == "true"
	case "processDroppedFolders":
		s.ProcessDroppedFolders = value == "true"
	case "windowMaximized":
		s.WindowMaximized = value == "true"
	case "clipboardAutoMonitor":
		s.ClipboardAutoMonitor = value == "true"
	case "autoResumeDownloads":
		s.AutoResumeDownloads = value == "true"
	case "tabMemorySaving":
		s.TabMemorySaving = value == "true"
	case "restoreTabs":
		s.RestoreTabs = value == "true"
	case "generateThumbnails":
		s.GenerateThumbnails = value == "true"
	case "enabledMenuItems":
		json.Unmarshal([]byte(value), &s.EnabledMenuItems)
	}
}

func setStringField(s *persistence.Settings, key, value string) {
	setField(s, key, value)
}

func setNumericField(s *persistence.Settings, key string, value float64) {
	switch key {
	case "verticalWidth":
		s.VerticalWidth = int(value)
	case "preloadCount":
		s.PreloadCount = int(value)
	case "minImageSize":
		s.MinImageSize = int64(value)
	case "windowWidth":
		s.WindowWidth = int(value)
	case "windowHeight":
		s.WindowHeight = int(value)
	case "windowX":
		s.WindowX = int(value)
	case "windowY":
		s.WindowY = int(value)
	}
}

func setBoolField(s *persistence.Settings, key string, value bool) {
	switch key {
	case "sidebarCollapsed":
		s.SidebarCollapsed = value
	case "showImageInfo":
		s.ShowImageInfo = value
	case "preloadImages":
		s.PreloadImages = value
	case "enableHistory":
		s.EnableHistory = value
	case "processDroppedFolders":
		s.ProcessDroppedFolders = value
	case "windowMaximized":
		s.WindowMaximized = value
	case "clipboardAutoMonitor":
		s.ClipboardAutoMonitor = value
	case "autoResumeDownloads":
		s.AutoResumeDownloads = value
	case "tabMemorySaving":
		s.TabMemorySaving = value
	case "restoreTabs":
		s.RestoreTabs = value
	case "generateThumbnails":
		s.GenerateThumbnails = value
	}
}
