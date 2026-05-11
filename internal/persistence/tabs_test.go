package persistence

import (
	"os"
	"testing"
)

// ---------- NewTabsManager ----------

func TestNewTabsManager(t *testing.T) {
	tmp := withTempDir(t)
	tm := NewTabsManager()
	if tm == nil {
		t.Fatal("NewTabsManager returned nil")
	}
	data := tm.GetTabs()
	if data == nil {
		t.Fatal("GetTabs returned nil")
	}
	if data.Tabs == nil {
		t.Error("Tabs slice should not be nil")
	}

	// tabs file might not exist since we only write on SaveTabs/Save
	// NewTabsManager doesn't create the file, only loads if exists
	_ = tmp
}

func TestNewTabsManager_Empty(t *testing.T) {
	withTempDir(t)
	tm := NewTabsManager()
	data := tm.GetTabs()
	if len(data.Tabs) != 0 {
		t.Errorf("expected 0 tabs, got %d", len(data.Tabs))
	}
	if data.ActiveTabID != "" {
		t.Errorf("ActiveTabID = %q, want empty", data.ActiveTabID)
	}
}

// ---------- SaveTabs ----------

func TestTabsManager_SaveTabs(t *testing.T) {
	withTempDir(t)
	tm := NewTabsManager()

	data := &TabsData{
		ActiveTabID: "tab-1",
		Tabs: []Tab{
			{ID: "tab-1", Title: "Home", Page: "home"},
			{ID: "tab-2", Title: "Explorer", Page: "explorer", Params: map[string]string{"path": "/manga"}},
		},
	}

	err := tm.SaveTabs(data)
	if err != nil {
		t.Fatalf("SaveTabs() error = %v", err)
	}

	loaded := tm.GetTabs()
	if loaded.ActiveTabID != "tab-1" {
		t.Errorf("ActiveTabID = %q, want %q", loaded.ActiveTabID, "tab-1")
	}
	if len(loaded.Tabs) != 2 {
		t.Fatalf("expected 2 tabs, got %d", len(loaded.Tabs))
	}
	if loaded.Tabs[1].Page != "explorer" {
		t.Errorf("Tab[1].Page = %q", loaded.Tabs[1].Page)
	}
	if loaded.Tabs[1].Params["path"] != "/manga" {
		t.Errorf("Tab[1].Params = %v", loaded.Tabs[1].Params)
	}
}

// ---------- Save / Load ----------

func TestTabsManager_SaveAndLoad(t *testing.T) {
	tmp := withTempDir(t)
	tm := NewTabsManager()

	tm.SaveTabs(&TabsData{
		ActiveTabID: "tab1",
		Tabs:        []Tab{{ID: "tab1", Title: "T1", Page: "home"}},
	})

	tm2 := NewTabsManager()
	data := tm2.GetTabs()

	if len(data.Tabs) != 1 {
		t.Fatalf("expected 1 tab, got %d", len(data.Tabs))
	}
	if data.Tabs[0].Title != "T1" {
		t.Errorf("Title = %q", data.Tabs[0].Title)
	}

	if _, err := os.Stat(tmp + "/" + tabsFile); os.IsNotExist(err) {
		t.Error("tabs.json not found")
	}
}

func TestTabsManager_GetTabs_ReturnsCopy(t *testing.T) {
	withTempDir(t)
	tm := NewTabsManager()

	tm.SaveTabs(&TabsData{
		ActiveTabID: "t1",
		Tabs:        []Tab{{ID: "t1", Title: "Original", Page: "home"}},
	})

	got1 := tm.GetTabs()
	got1.Tabs[0].Title = "Modified"

	got2 := tm.GetTabs()
	if got2.Tabs[0].Title == "Modified" {
		t.Error("modifying returned data should not affect internal state")
	}
}
