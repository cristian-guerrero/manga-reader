package persistence

import (
	"os"
	"testing"
)

// ---------- DefaultSettings ----------

func TestDefaultSettings_NotEmpty(t *testing.T) {
	s := DefaultSettings()
	if s.EnabledMenuItems == nil {
		t.Error("default EnabledMenuItems should not be nil")
	}
	if s.Language != "en" {
		t.Errorf("Language = %q, want %q", s.Language, "en")
	}
}

// ---------- NewSettingsManager ----------

func TestNewSettingsManager(t *testing.T) {
	tmp := withTempDir(t)
	sm := NewSettingsManager()
	if sm == nil {
		t.Fatal("NewSettingsManager returned nil")
	}
	// Should have created settings.json in the temp dir
	if _, err := os.Stat(tmp + "/" + settingsFile); os.IsNotExist(err) {
		t.Errorf("expected settings.json to be created, but it doesn't exist")
	}
}

// ---------- Get ----------

func TestSettingsManager_Get_ReturnsCopy(t *testing.T) {
	withTempDir(t)
	sm := NewSettingsManager()

	got1 := sm.Get()
	got2 := sm.Get()

	// Different pointers = copies
	if got1 == got2 {
		t.Error("Get() should return a new copy each time")
	}

	// Modifying the copy should not affect the original
	got1.Language = "es"
	original := sm.Get()
	if original.Language == "es" {
		t.Error("modifying returned copy should not affect internal state")
	}
}

// ---------- Save / Load ----------

func TestSettingsManager_SaveAndLoad(t *testing.T) {
	tmp := withTempDir(t)
	sm := NewSettingsManager()

	original := sm.Get()
	original.Language = "fr"
	original.Theme = "light"

	if err := sm.Save(original); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Create a new manager that loads from disk
	sm2 := NewSettingsManager()
	loaded := sm2.Get()

	if loaded.Language != "fr" {
		t.Errorf("Language = %q, want %q", loaded.Language, "fr")
	}
	if loaded.Theme != "light" {
		t.Errorf("Theme = %q, want %q", loaded.Theme, "light")
	}

	// Verify the file was written to temp dir
	if _, err := os.Stat(tmp + "/" + settingsFile); os.IsNotExist(err) {
		t.Error("settings.json not found after Save")
	}
}

func TestSettingsManager_Load_WhenFileMissing_CreatesDefault(t *testing.T) {
	tmp := withTempDir(t)
	sm := NewSettingsManager()
	_ = sm // Creates default + saves it

	if _, err := os.Stat(tmp + "/" + settingsFile); os.IsNotExist(err) {
		t.Error("settings.json should have been created by NewSettingsManager")
	}
}

// ---------- Flush ----------

func TestSettingsManager_Flush(t *testing.T) {
	withTempDir(t)
	sm := NewSettingsManager()

	original := sm.Get()
	original.ViewerMode = "lateral"
	sm.Save(original)

	if err := sm.Flush(); err != nil {
		t.Errorf("Flush() error = %v", err)
	}

	// Verify by creating a new manager
	sm2 := NewSettingsManager()
	if sm2.Get().ViewerMode != "lateral" {
		t.Error("Flush did not persist changes to disk")
	}
}

// ---------- Update ----------

func TestSettingsManager_Update_Language(t *testing.T) {
	withTempDir(t)
	sm := NewSettingsManager()

	err := sm.Update(map[string]interface{}{"language": "es"})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if sm.Get().Language != "es" {
		t.Errorf("Language = %q, want %q", sm.Get().Language, "es")
	}
}

func TestSettingsManager_Update_Theme(t *testing.T) {
	withTempDir(t)
	sm := NewSettingsManager()

	err := sm.Update(map[string]interface{}{"theme": "light"})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if sm.Get().Theme != "light" {
		t.Errorf("Theme = %q, want %q", sm.Get().Theme, "light")
	}
}

func TestSettingsManager_Update_ViewerMode(t *testing.T) {
	withTempDir(t)
	sm := NewSettingsManager()

	err := sm.Update(map[string]interface{}{"viewerMode": "lateral"})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if sm.Get().ViewerMode != "lateral" {
		t.Errorf("ViewerMode = %q, want %q", sm.Get().ViewerMode, "lateral")
	}
}

func TestSettingsManager_Update_VerticalWidth(t *testing.T) {
	withTempDir(t)
	sm := NewSettingsManager()

	err := sm.Update(map[string]interface{}{"verticalWidth": float64(60)})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if sm.Get().VerticalWidth != 60 {
		t.Errorf("VerticalWidth = %d, want %d", sm.Get().VerticalWidth, 60)
	}
}

func TestSettingsManager_Update_BoolSettings(t *testing.T) {
	withTempDir(t)
	sm := NewSettingsManager()

	tests := []struct {
		key   string
		value bool
		get   func(*Settings) bool
	}{
		{"sidebarCollapsed", true, func(s *Settings) bool { return s.SidebarCollapsed }},
		{"showImageInfo", true, func(s *Settings) bool { return s.ShowImageInfo }},
		{"preloadImages", false, func(s *Settings) bool { return s.PreloadImages }},
		{"enableHistory", false, func(s *Settings) bool { return s.EnableHistory }},
		{"processDroppedFolders", false, func(s *Settings) bool { return s.ProcessDroppedFolders }},
		{"windowMaximized", true, func(s *Settings) bool { return s.WindowMaximized }},
		{"clipboardAutoMonitor", false, func(s *Settings) bool { return s.ClipboardAutoMonitor }},
		{"autoResumeDownloads", true, func(s *Settings) bool { return s.AutoResumeDownloads }},
		{"tabMemorySaving", true, func(s *Settings) bool { return s.TabMemorySaving }},
		{"restoreTabs", false, func(s *Settings) bool { return s.RestoreTabs }},
	}

	for _, tt := range tests {
		t.Run(tt.key, func(t *testing.T) {
			err := sm.Update(map[string]interface{}{tt.key: tt.value})
			if err != nil {
				t.Fatalf("Update(%q) error = %v", tt.key, err)
			}
			if got := tt.get(sm.Get()); got != tt.value {
				t.Errorf("after Update(%q): got %v, want %v", tt.key, got, tt.value)
			}
		})
	}
}

func TestSettingsManager_Update_EnabledMenuItems(t *testing.T) {
	withTempDir(t)
	sm := NewSettingsManager()

	items := map[string]interface{}{
		"home":     true,
		"explorer": false,
		"download": true,
	}
	err := sm.Update(map[string]interface{}{"enabledMenuItems": items})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	result := sm.Get().EnabledMenuItems
	if result["home"] != true {
		t.Errorf("home should be enabled")
	}
	if result["explorer"] != false {
		t.Errorf("explorer should be disabled")
	}
	if result["download"] != true {
		t.Errorf("download should be enabled")
	}
}

func TestSettingsManager_Update_StringSettings(t *testing.T) {
	withTempDir(t)
	sm := NewSettingsManager()

	tests := []struct {
		key   string
		value string
		get   func(*Settings) string
	}{
		{"lastPage", "explorer", func(s *Settings) string { return s.LastPage }},
		{"downloadPath", "/custom/path", func(s *Settings) string { return s.DownloadPath }},
		{"panicKey", "F12", func(s *Settings) string { return s.PanicKey }},
		{"lastFolder", "/manga", func(s *Settings) string { return s.LastFolder }},
		{"readingDirection", "rtl", func(s *Settings) string { return s.ReadingDirection }},
		{"lateralMode", "double", func(s *Settings) string { return s.LateralMode }},
		{"savedTabs", `[{"id":"1"}]`, func(s *Settings) string { return s.SavedTabs }},
	}

	for _, tt := range tests {
		t.Run(tt.key, func(t *testing.T) {
			err := sm.Update(map[string]interface{}{tt.key: tt.value})
			if err != nil {
				t.Fatalf("Update(%q) error = %v", tt.key, err)
			}
			if got := tt.get(sm.Get()); got != tt.value {
				t.Errorf("after Update(%q): got %q, want %q", tt.key, got, tt.value)
			}
		})
	}
}

func TestSettingsManager_Update_PreloadCount(t *testing.T) {
	withTempDir(t)
	sm := NewSettingsManager()

	err := sm.Update(map[string]interface{}{"preloadCount": float64(5)})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if sm.Get().PreloadCount != 5 {
		t.Errorf("PreloadCount = %d, want %d", sm.Get().PreloadCount, 5)
	}
}

func TestSettingsManager_Update_MinImageSize_AsFloat(t *testing.T) {
	withTempDir(t)
	sm := NewSettingsManager()

	err := sm.Update(map[string]interface{}{"minImageSize": float64(1024)})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if sm.Get().MinImageSize != 1024 {
		t.Errorf("MinImageSize = %d, want %d", sm.Get().MinImageSize, 1024)
	}
}

func TestSettingsManager_Update_MinImageSize_AsInt(t *testing.T) {
	withTempDir(t)
	sm := NewSettingsManager()

	err := sm.Update(map[string]interface{}{"minImageSize": 2048})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if sm.Get().MinImageSize != 2048 {
		t.Errorf("MinImageSize = %d, want %d", sm.Get().MinImageSize, 2048)
	}
}

func TestSettingsManager_Update_MinImageSize_InvalidType(t *testing.T) {
	withTempDir(t)
	sm := NewSettingsManager()
	initial := sm.Get().MinImageSize

	// This should log a message but not panic
	err := sm.Update(map[string]interface{}{"minImageSize": "not_a_number"})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if sm.Get().MinImageSize != initial {
		t.Errorf("MinImageSize changed from %d to %d, expected no change", initial, sm.Get().MinImageSize)
	}
}

func TestSettingsManager_Update_WindowDimensions(t *testing.T) {
	withTempDir(t)
	sm := NewSettingsManager()

	updates := map[string]interface{}{
		"windowWidth":  float64(1920),
		"windowHeight": float64(1080),
		"windowX":      float64(100),
		"windowY":      float64(50),
	}
	err := sm.Update(updates)
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	s := sm.Get()
	if s.WindowWidth != 1920 {
		t.Errorf("WindowWidth = %d, want %d", s.WindowWidth, 1920)
	}
	if s.WindowHeight != 1080 {
		t.Errorf("WindowHeight = %d, want %d", s.WindowHeight, 1080)
	}
	if s.WindowX != 100 {
		t.Errorf("WindowX = %d, want %d", s.WindowX, 100)
	}
	if s.WindowY != 50 {
		t.Errorf("WindowY = %d, want %d", s.WindowY, 50)
	}
}

func TestSettingsManager_Update_WindowDimensions_AsInt(t *testing.T) {
	withTempDir(t)
	sm := NewSettingsManager()

	updates := map[string]interface{}{
		"windowWidth":  800,
		"windowHeight": 600,
	}
	err := sm.Update(updates)
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	s := sm.Get()
	if s.WindowWidth != 800 {
		t.Errorf("WindowWidth = %d, want %d", s.WindowWidth, 800)
	}
	if s.WindowHeight != 600 {
		t.Errorf("WindowHeight = %d, want %d", s.WindowHeight, 600)
	}
}

func TestSettingsManager_Update_UnknownKey(t *testing.T) {
	withTempDir(t)
	sm := NewSettingsManager()

	// Unknown keys should be silently ignored, not panic
	err := sm.Update(map[string]interface{}{"unknownKey": "value"})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
}

// ---------- Persistence across manager instances ----------

func TestSettingsManager_UpdatesPersistAcrossInstances(t *testing.T) {
	withTempDir(t)
	sm := NewSettingsManager()

	sm.Update(map[string]interface{}{
		"language":        "ja",
		"viewerMode":      "lateral",
		"enableHistory":   false,
		"preloadCount":    float64(5),
		"enabledMenuItems": map[string]interface{}{"colorizer": false, "history": true},
	})

	// Flush to ensure settings are written to disk (Update uses debounced save)
	if err := sm.Flush(); err != nil {
		t.Fatalf("Flush() error = %v", err)
	}

	// Create a new manager (loads from disk)
	sm2 := NewSettingsManager()
	s := sm2.Get()

	if s.Language != "ja" {
		t.Errorf("Language = %q, want %q", s.Language, "ja")
	}
	if s.ViewerMode != "lateral" {
		t.Errorf("ViewerMode = %q, want %q", s.ViewerMode, "lateral")
	}
	if s.EnableHistory != false {
		t.Errorf("EnableHistory = %v, want %v", s.EnableHistory, false)
	}
	if s.PreloadCount != 5 {
		t.Errorf("PreloadCount = %d, want %d", s.PreloadCount, 5)
	}
	if s.EnabledMenuItems["colorizer"] != false {
		t.Errorf("colorizer should be disabled")
	}
	if s.EnabledMenuItems["history"] != true {
		t.Errorf("history should be enabled")
	}
}

func TestDefaultEnabledMenuItems_HaveExpectedKeys(t *testing.T) {
	s := DefaultSettings()
	expected := []string{"home", "history", "folders", "series", "explorer", "settings", "download"}
	for _, key := range expected {
		if _, ok := s.EnabledMenuItems[key]; !ok {
			t.Errorf("default EnabledMenuItems missing key %q", key)
		}
	}
}

func TestSettingsManager_Get_AfterUpdate_ReturnsUpdatedValue(t *testing.T) {
	withTempDir(t)
	sm := NewSettingsManager()

	sm.Update(map[string]interface{}{"language": "de"})
	got := sm.Get()
	if got.Language != "de" {
		t.Errorf("Get() after Update() = %q, want %q", got.Language, "de")
	}
}


