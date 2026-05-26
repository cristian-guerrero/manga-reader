package database

import (
	"testing"

	"manga-visor/internal/persistence"
)

func TestNewSettingsRepository(t *testing.T) {
	db := newTestDB(t)
	r := NewSettingsRepository(db)
	if r == nil {
		t.Fatal("NewSettingsRepository returned nil")
	}

	s := r.Get()
	if s == nil {
		t.Fatal("Get() returned nil")
	}
	if s.Language != "en" {
		t.Errorf("default Language = %q, want %q", s.Language, "en")
	}
}

func TestSettingsRepository_Get_ReturnsCopy(t *testing.T) {
	db := newTestDB(t)
	r := NewSettingsRepository(db)

	got1 := r.Get()
	got2 := r.Get()
	if got1 == got2 {
		t.Error("Get() should return different pointers (copies)")
	}

	got1.Language = "es"
	original := r.Get()
	if original.Language == "es" {
		t.Error("modifying returned copy should not affect internal state")
	}
}

func TestSettingsRepository_SaveAndLoad(t *testing.T) {
	db := newTestDB(t)
	r := NewSettingsRepository(db)

	s := r.Get()
	s.Language = "fr"
	s.Theme = "dark"
	if err := r.Save(s); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	r2 := NewSettingsRepository(db)
	loaded := r2.Get()
	if loaded.Language != "fr" {
		t.Errorf("Language = %q, want %q", loaded.Language, "fr")
	}
	if loaded.Theme != "dark" {
		t.Errorf("Theme = %q, want %q", loaded.Theme, "dark")
	}
}

func TestSettingsRepository_Update(t *testing.T) {
	db := newTestDB(t)
	r := NewSettingsRepository(db)

	t.Run("string", func(t *testing.T) {
		err := r.Update(map[string]interface{}{"language": "es"})
		if err != nil {
			t.Fatalf("Update() error = %v", err)
		}
		if r.Get().Language != "es" {
			t.Errorf("Language = %q, want %q", r.Get().Language, "es")
		}
	})

	t.Run("numeric", func(t *testing.T) {
		err := r.Update(map[string]interface{}{"verticalWidth": float64(60)})
		if err != nil {
			t.Fatalf("Update() error = %v", err)
		}
		if r.Get().VerticalWidth != 60 {
			t.Errorf("VerticalWidth = %d, want %d", r.Get().VerticalWidth, 60)
		}
	})

	t.Run("bool", func(t *testing.T) {
		err := r.Update(map[string]interface{}{"sidebarCollapsed": true})
		if err != nil {
			t.Fatalf("Update() error = %v", err)
		}
		if !r.Get().SidebarCollapsed {
			t.Error("SidebarCollapsed should be true")
		}
	})

	t.Run("multiple", func(t *testing.T) {
		err := r.Update(map[string]interface{}{
			"language":   "ja",
			"viewerMode": "lateral",
		})
		if err != nil {
			t.Fatalf("Update() error = %v", err)
		}
		s := r.Get()
		if s.Language != "ja" || s.ViewerMode != "lateral" {
			t.Errorf("got Language=%q ViewerMode=%q, want %q %q", s.Language, s.ViewerMode, "ja", "lateral")
		}
	})

	t.Run("unknown key", func(t *testing.T) {
		err := r.Update(map[string]interface{}{"unknownKey": "value"})
		if err != nil {
			t.Fatalf("Update() with unknown key error = %v", err)
		}
	})
}

func TestSettingsRepository_Update_MenuItems(t *testing.T) {
	db := newTestDB(t)
	r := NewSettingsRepository(db)

	items := map[string]interface{}{
		"home":     true,
		"explorer": false,
	}
	err := r.Update(map[string]interface{}{"enabledMenuItems": items})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	result := r.Get().EnabledMenuItems
	if result["home"] != true {
		t.Errorf("home should be enabled")
	}
	if result["explorer"] != false {
		t.Errorf("explorer should be disabled")
	}
}

func TestSettingsRepository_Flush(t *testing.T) {
	db := newTestDB(t)
	r := NewSettingsRepository(db)

	s := r.Get()
	s.ViewerMode = "lateral"
	r.Save(s)

	if err := r.Flush(); err != nil {
		t.Errorf("Flush() error = %v", err)
	}

	r2 := NewSettingsRepository(db)
	if r2.Get().ViewerMode != "lateral" {
		t.Error("Flush did not persist changes")
	}
}

func TestSettingsRepository_SetDB(t *testing.T) {
	db1 := newTestDB(t)
	db2 := newTestDB(t)

	r := NewSettingsRepository(db1)
	s := r.Get()
	s.Language = "de"
	r.Save(s)

	r.SetDB(db2)
	r.Load()
	loaded := r.Get()
	if loaded.Language == "de" {
		t.Error("after SetDB+Load, should load from new DB (defaults)")
	}
}

func TestSettingsRepository_Load_EmptyDB(t *testing.T) {
	db := newTestDB(t)
	r := NewSettingsRepository(db)

	s := r.Get()
	if s == nil {
		t.Fatal("Get() returned nil on freshly loaded DB")
	}
}

func TestSettingsRepository_Update_UpdatesPersist(t *testing.T) {
	db := newTestDB(t)
	r := NewSettingsRepository(db)

	r.Update(map[string]interface{}{
		"language":       "ja",
		"viewerMode":     "lateral",
		"enableHistory":  false,
		"preloadCount":   float64(5),
		"autoUpdate":     false,
	})

	r.Flush()

	r2 := NewSettingsRepository(db)
	s := r2.Get()
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
	if s.AutoUpdate != false {
		t.Errorf("AutoUpdate = %v, want %v", s.AutoUpdate, false)
	}
}

func TestSettingsRepository_DefaultSettingsHaveExpectedValues(t *testing.T) {
	s := persistence.DefaultSettings()
	expected := []string{"home", "history", "oneShot", "series", "explorer", "settings", "download", "colorizer"}
	for _, key := range expected {
		if _, ok := s.EnabledMenuItems[key]; !ok {
			t.Errorf("default EnabledMenuItems missing key %q", key)
		}
	}
}
