package database

import (
	"testing"

	"manga-visor/internal/persistence"
)

func TestNewTabsRepository(t *testing.T) {
	db := newTestDB(t)
	r := NewTabsRepository(db)
	if r == nil {
		t.Fatal("NewTabsRepository returned nil")
	}
	data := r.GetTabs()
	if data == nil {
		t.Fatal("GetTabs() returned nil")
	}
	if data.Tabs == nil {
		t.Error("Tabs slice should not be nil")
	}
}

func TestTabsRepository_SaveAndGet(t *testing.T) {
	db := newTestDB(t)
	r := NewTabsRepository(db)

	data := &persistence.TabsData{
		ActiveTabID: "tab1",
		Tabs: []persistence.Tab{
			{ID: "tab1", Title: "Tab 1", Page: "home"},
			{ID: "tab2", Title: "Tab 2", Page: "explorer"},
		},
	}

	if err := r.SaveTabs(data); err != nil {
		t.Fatalf("SaveTabs() error = %v", err)
	}

	got := r.GetTabs()
	if got.ActiveTabID != "tab1" {
		t.Errorf("ActiveTabID = %q, want %q", got.ActiveTabID, "tab1")
	}
	if len(got.Tabs) != 2 {
		t.Errorf("tabs = %d, want 2", len(got.Tabs))
	}
}

func TestTabsRepository_GetTabs_ReturnsCopy(t *testing.T) {
	db := newTestDB(t)
	r := NewTabsRepository(db)

	r.SaveTabs(&persistence.TabsData{
		ActiveTabID: "tab1",
		Tabs:        []persistence.Tab{{ID: "tab1", Title: "Test"}},
	})

	got := r.GetTabs()
	got.Tabs[0].Title = "Modified"
	if r.GetTabs().Tabs[0].Title != "Test" {
		t.Error("modifying returned copy should not affect internal state")
	}
}

func TestTabsRepository_EmptyTabs(t *testing.T) {
	db := newTestDB(t)
	r := NewTabsRepository(db)

	data := r.GetTabs()
	if len(data.Tabs) != 0 {
		t.Errorf("default tabs = %d, want 0", len(data.Tabs))
	}
}

func TestTabsRepository_Persistence(t *testing.T) {
	db := newTestDB(t)
	r := NewTabsRepository(db)

	r.SaveTabs(&persistence.TabsData{
		ActiveTabID: "tab1",
		Tabs:        []persistence.Tab{{ID: "tab1", Title: "Persisted Tab"}},
	})

	r2 := NewTabsRepository(db)
	got := r2.GetTabs()
	if len(got.Tabs) != 1 || got.Tabs[0].Title != "Persisted Tab" {
		t.Error("tabs should persist across instances")
	}
}

func TestTabsRepository_SetDB(t *testing.T) {
	db1 := newTestDB(t)
	db2 := newTestDB(t)

	r := NewTabsRepository(db1)
	r.SaveTabs(&persistence.TabsData{
		ActiveTabID: "tab1",
		Tabs:        []persistence.Tab{{ID: "tab1", Title: "Test"}},
	})

	r.SetDB(db2)
	r.Load()
	got := r.GetTabs()
	if len(got.Tabs) != 0 {
		t.Error("after SetDB+Load, should have no tabs")
	}
}

func TestTabsRepository_SaveTabs_NilTabs(t *testing.T) {
	db := newTestDB(t)
	r := NewTabsRepository(db)

	err := r.SaveTabs(&persistence.TabsData{
		ActiveTabID: "",
		Tabs:        nil,
	})
	if err != nil {
		t.Fatalf("SaveTabs() with nil tabs error = %v", err)
	}

	got := r.GetTabs()
	if got.Tabs == nil {
		t.Error("Tabs should not be nil after save")
	}
}
