package history

import (
	"manga-visor/internal/database"
	"manga-visor/internal/persistence"
	"testing"
)

func newTestModule(t *testing.T) *Module {
	t.Helper()

	db, err := database.New(t.TempDir())
	if err != nil {
		t.Fatalf("failed to create test database: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	pm := database.NewHistoryRepository(db)
	sm := database.NewSettingsRepository(db)

	return NewModule(pm, sm)
}

func TestModule_GetHistory_Empty(t *testing.T) {
	m := newTestModule(t)

	entries := m.GetHistory()
	if len(entries) != 0 {
		t.Errorf("expected empty history, got %d entries", len(entries))
	}
}

func TestModule_GetHistory_WithEntries(t *testing.T) {
	m := newTestModule(t)

	m.history.Add(persistence.HistoryEntry{
		FolderPath: "/manga/a", FolderName: "A", LastImage: "1.jpg", TotalImages: 5,
	})
	m.history.Add(persistence.HistoryEntry{
		FolderPath: "/manga/b", FolderName: "B", LastImage: "2.jpg", TotalImages: 10,
	})

	entries := m.GetHistory()
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}
}

func TestModule_GetHistoryEntry_Found(t *testing.T) {
	m := newTestModule(t)

	m.history.Add(persistence.HistoryEntry{
		FolderPath: "/manga/test", FolderName: "Test", TotalImages: 3,
	})

	e := m.GetHistoryEntry("/manga/test")
	if e == nil {
		t.Fatal("GetHistoryEntry returned nil")
	}
	if e.FolderName != "Test" {
		t.Errorf("FolderName = %q", e.FolderName)
	}
}

func TestModule_GetHistoryEntry_NotFound(t *testing.T) {
	m := newTestModule(t)

	e := m.GetHistoryEntry("/nonexistent")
	if e != nil {
		t.Errorf("expected nil, got %v", e)
	}
}

func TestModule_AddHistory_Disabled(t *testing.T) {
	m := newTestModule(t)

	m.settings.Update(map[string]interface{}{"enableHistory": false})

	err := m.AddHistory(persistence.HistoryEntry{
		FolderPath: "/manga/disabled", FolderName: "ShouldNotAppear", TotalImages: 1,
	})
	if err != nil {
		t.Fatalf("AddHistory() error = %v", err)
	}

	entries := m.GetHistory()
	if len(entries) != 0 {
		t.Error("expected history to remain empty when disabled")
	}
}

func TestModule_AddHistory_AnonymousMode(t *testing.T) {
	m := newTestModule(t)

	m.settings.Update(map[string]interface{}{"enableHistory": true})
	m.settings.Update(map[string]interface{}{
		"enabledMenuItems": map[string]interface{}{
			"home": false, "explorer": false, "history": false,
			"download": false, "colorizer": false, "series": false, "settings": false,
		},
	})

	err := m.AddHistory(persistence.HistoryEntry{
		FolderPath: "/manga/anonymous", FolderName: "ShouldNotAppear", TotalImages: 1,
	})
	if err != nil {
		t.Fatalf("AddHistory() error = %v", err)
	}

	entries := m.GetHistory()
	if len(entries) != 0 {
		t.Error("expected history to remain empty in anonymous mode")
	}
}

func TestModule_AddHistory_Enabled_Persistence(t *testing.T) {
	m := newTestModule(t)

	m.settings.Update(map[string]interface{}{"enableHistory": true})

	m.history.Add(persistence.HistoryEntry{
		FolderPath: "/manga/enabled", FolderName: "EnabledTest", LastImage: "page1.jpg", TotalImages: 5,
	})

	e := m.history.Get("/manga/enabled")
	if e == nil {
		t.Fatal("history entry not found after Add")
	}
	if e.FolderName != "EnabledTest" {
		t.Errorf("FolderName = %q", e.FolderName)
	}
}

func TestModule_AddHistory_RespectsEnableHistory(t *testing.T) {
	m := newTestModule(t)

	_ = m.settings.Get()

	m.history.Add(persistence.HistoryEntry{
		FolderPath: "/manga/test-entry", FolderName: "ShouldExist", TotalImages: 3,
	})

	if m.GetHistoryEntry("/manga/test-entry") == nil {
		t.Error("history entry should exist when history is enabled")
	}

	m.settings.Update(map[string]interface{}{"enableHistory": false})

	m.history.Add(persistence.HistoryEntry{
		FolderPath: "/manga/ghost-entry", FolderName: "Ghost", TotalImages: 1,
	})

	entries := m.GetHistory()
	if len(entries) != 2 {
		t.Errorf("expected 2 entries in persistence, got %d", len(entries))
	}
}

func TestModule_RemoveHistory_Persistence(t *testing.T) {
	m := newTestModule(t)

	m.history.Add(persistence.HistoryEntry{FolderPath: "/manga/rm", FolderName: "Rm", TotalImages: 1})
	m.history.Add(persistence.HistoryEntry{FolderPath: "/manga/keep", FolderName: "Keep", TotalImages: 1})

	m.history.Remove("/manga/rm")

	if m.history.Get("/manga/rm") != nil {
		t.Error("entry should have been removed")
	}
	if m.GetHistoryEntry("/manga/keep") == nil {
		t.Error("other entry should still exist")
	}
}

func TestModule_RemoveHistory_NotFound(t *testing.T) {
	m := newTestModule(t)

	err := m.history.Remove("/nonexistent")
	if err != nil {
		t.Fatalf("Remove() error = %v", err)
	}
}

func TestModule_ClearHistory_Persistence(t *testing.T) {
	m := newTestModule(t)

	m.history.Add(persistence.HistoryEntry{FolderPath: "/a", FolderName: "A", TotalImages: 1})
	m.history.Add(persistence.HistoryEntry{FolderPath: "/b", FolderName: "B", TotalImages: 1})

	m.history.Clear()

	entries := m.GetHistory()
	if len(entries) != 0 {
		t.Errorf("expected 0 entries after clear, got %d", len(entries))
	}
}
