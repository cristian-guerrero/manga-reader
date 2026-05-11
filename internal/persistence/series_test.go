package persistence

import (
	"os"
	"testing"
)

// ---------- NewSeriesManager ----------

func TestNewSeriesManager(t *testing.T) {
	tmp := withTempDir(t)
	sm := NewSeriesManager()
	if sm == nil {
		t.Fatal("NewSeriesManager returned nil")
	}
	if _, err := os.Stat(tmp + "/" + seriesFile); os.IsNotExist(err) {
		t.Errorf("expected %s to be created", seriesFile)
	}
}

func TestNewSeriesManager_EmptyEntries(t *testing.T) {
	withTempDir(t)
	sm := NewSeriesManager()
	entries := sm.GetAll()
	if len(entries) != 0 {
		t.Errorf("expected empty series, got %d entries", len(entries))
	}
}

// ---------- Add ----------

func TestSeriesManager_Add(t *testing.T) {
	withTempDir(t)
	sm := NewSeriesManager()

	entry := SeriesEntry{
		Path:       "/manga/series-one",
		Name:       "Series One",
		CoverImage: "cover.jpg",
		Chapters: []ChapterInfo{
			{Path: "/manga/series-one/ch1", Name: "Chapter 1", ImageCount: 20},
		},
	}
	err := sm.Add(entry)
	if err != nil {
		t.Fatalf("Add() error = %v", err)
	}

	entries := sm.GetAll()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].Name != "Series One" {
		t.Errorf("Name = %q", entries[0].Name)
	}
	if len(entries[0].Chapters) != 1 {
		t.Errorf("expected 1 chapter, got %d", len(entries[0].Chapters))
	}
}

func TestSeriesManager_Add_UpdateExisting(t *testing.T) {
	withTempDir(t)
	sm := NewSeriesManager()

	e1 := SeriesEntry{Path: "/series/a", Name: "Old Name"}
	e2 := SeriesEntry{Path: "/series/a", Name: "New Name", Chapters: []ChapterInfo{{Path: "ch1", Name: "Ch1", ImageCount: 5}}}

	sm.Add(e1)
	sm.Add(e2)

	entries := sm.GetAll()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].Name != "New Name" {
		t.Errorf("Name = %q, want %q", entries[0].Name, "New Name")
	}
	if len(entries[0].Chapters) != 1 {
		t.Errorf("expected 1 chapter, got %d", len(entries[0].Chapters))
	}
}

// ---------- Get ----------

func TestSeriesManager_Get(t *testing.T) {
	withTempDir(t)
	sm := NewSeriesManager()

	sm.Add(SeriesEntry{Path: "/series/x", Name: "Series X"})

	e := sm.Get("/series/x")
	if e == nil {
		t.Fatal("Get returned nil")
	}
	if e.Name != "Series X" {
		t.Errorf("Name = %q", e.Name)
	}
}

func TestSeriesManager_Get_NotFound(t *testing.T) {
	withTempDir(t)
	sm := NewSeriesManager()

	e := sm.Get("/nonexistent")
	if e != nil {
		t.Errorf("expected nil, got %v", e)
	}
}

// ---------- GetAll ----------

func TestSeriesManager_GetAll_ReturnsCopy(t *testing.T) {
	withTempDir(t)
	sm := NewSeriesManager()

	sm.Add(SeriesEntry{Path: "/a", Name: "A"})
	sm.Add(SeriesEntry{Path: "/b", Name: "B"})

	got1 := sm.GetAll()
	got1[0].Name = "Modified"

	got2 := sm.GetAll()
	if got2[0].Name == "Modified" {
		t.Error("modifying returned slice should not affect internal state")
	}
}

// ---------- Remove ----------

func TestSeriesManager_Remove(t *testing.T) {
	withTempDir(t)
	sm := NewSeriesManager()

	sm.Add(SeriesEntry{Path: "/a", Name: "A"})
	sm.Add(SeriesEntry{Path: "/b", Name: "B"})

	err := sm.Remove("/a")
	if err != nil {
		t.Fatalf("Remove() error = %v", err)
	}

	entries := sm.GetAll()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].Path != "/b" {
		t.Errorf("remaining = %q", entries[0].Path)
	}
}

func TestSeriesManager_Remove_NotFound(t *testing.T) {
	withTempDir(t)
	sm := NewSeriesManager()

	err := sm.Remove("/nonexistent")
	if err != nil {
		t.Fatalf("Remove() unexpected error: %v", err)
	}
}

// ---------- Clear ----------

func TestSeriesManager_Clear(t *testing.T) {
	withTempDir(t)
	sm := NewSeriesManager()

	sm.Add(SeriesEntry{Path: "/a", Name: "A"})
	sm.Add(SeriesEntry{Path: "/b", Name: "B"})

	err := sm.Clear()
	if err != nil {
		t.Fatalf("Clear() error = %v", err)
	}

	entries := sm.GetAll()
	if len(entries) != 0 {
		t.Errorf("expected 0 entries, got %d", len(entries))
	}
}

// ---------- Save / Load ----------

func TestSeriesManager_SaveAndLoad(t *testing.T) {
	tmp := withTempDir(t)
	sm := NewSeriesManager()

	sm.Add(SeriesEntry{Path: "/series/persist", Name: "Persisted Series"})

	sm2 := NewSeriesManager()
	entries := sm2.GetAll()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].Name != "Persisted Series" {
		t.Errorf("Name = %q", entries[0].Name)
	}

	if _, err := os.Stat(tmp + "/" + seriesFile); os.IsNotExist(err) {
		t.Error("series.json not found")
	}
}
