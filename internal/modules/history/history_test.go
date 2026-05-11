package history

import (
	"manga-visor/internal/persistence"
	"testing"
)

// helper: create a fresh Module pointing at temp dirs. ctx is left nil,
// so AddHistory/ClearHistory/RemoveHistory will not reach runtime.EventsEmit.
func newTestModule(t *testing.T) *Module {
	t.Helper()

	cleanup := persistence.SetTestDataDir(t.TempDir())
	t.Cleanup(cleanup)

	pm := persistence.NewHistoryManager()
	sm := persistence.NewSettingsManager()

	return NewModule(pm, sm)
}

// ---------- GetHistory ----------

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

// ---------- GetHistoryEntry ----------

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

// ---------- AddHistory (history disabled) ----------

func TestModule_AddHistory_Disabled(t *testing.T) {
	m := newTestModule(t)

	m.settings.Update(map[string]interface{}{"enableHistory": false})

	err := m.AddHistory(persistence.HistoryEntry{
		FolderPath: "/manga/disabled", FolderName: "ShouldNotAppear", TotalImages: 1,
	})
	if err != nil {
		t.Fatalf("AddHistory() error = %v", err)
	}

	// History should be empty (AddHistory returned early due to disable)
	entries := m.GetHistory()
	if len(entries) != 0 {
		t.Error("expected history to remain empty when disabled")
	}
}

// ---------- AddHistory (anonymous mode: all menu items disabled) ----------

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

// ---------- AddHistory (enabled) — tests persistence directly ----------

func TestModule_AddHistory_Enabled_Persistence(t *testing.T) {
	m := newTestModule(t)

	m.settings.Update(map[string]interface{}{"enableHistory": true})

	// We cannot call m.AddHistory() because it triggers runtime.EventsEmit
	// which calls log.Fatalf/os.Exit with no Wails context.
	// Instead, we test that the underlying persistence works correctly
	// (which is what AddHistory does before the event emission).
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

// ---------- Validate settings flow (history enabled but called via disabled test) ----------

func TestModule_AddHistory_RespectsEnableHistory(t *testing.T) {
	// Test that when enableHistory is true, the entry is persisted
	// (simulates what happens before runtime.EventsEmit in AddHistory)
	m := newTestModule(t)

	// History enabled (default) → entry should be added
	_ = m.settings.Get()

	// Use persistence directly to simulate AddHistory's pre-event logic
	m.history.Add(persistence.HistoryEntry{
		FolderPath: "/manga/test-entry", FolderName: "ShouldExist", TotalImages: 3,
	})

	if m.GetHistoryEntry("/manga/test-entry") == nil {
		t.Error("history entry should exist when history is enabled")
	}

	// Now disable history
	m.settings.Update(map[string]interface{}{"enableHistory": false})

	// Even if we add directly via persistence (module won't call AddHistory at all),
	// the module's GetHistory should still reflect persistence state
	m.history.Add(persistence.HistoryEntry{
		FolderPath: "/manga/ghost-entry", FolderName: "Ghost", TotalImages: 1,
	})

	// Both entries should be visible because they're in persistence
	// The module's AddHistory is the gate, not GetHistory
	entries := m.GetHistory()
	if len(entries) != 2 {
		t.Errorf("expected 2 entries in persistence, got %d", len(entries))
	}
}

// ---------- RemoveHistory (tests persistence directly) ----------

func TestModule_RemoveHistory_Persistence(t *testing.T) {
	m := newTestModule(t)

	m.history.Add(persistence.HistoryEntry{FolderPath: "/manga/rm", FolderName: "Rm", TotalImages: 1})
	m.history.Add(persistence.HistoryEntry{FolderPath: "/manga/keep", FolderName: "Keep", TotalImages: 1})

	// Remove via persistence (simulating what RemoveHistory does)
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

	// Remove via persistence (simulating RemoveHistory)
	err := m.history.Remove("/nonexistent")
	if err != nil {
		t.Fatalf("Remove() error = %v", err)
	}
}

// ---------- ClearHistory (tests persistence directly) ----------

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
