package persistence

import (
	"os"
	"testing"
)

// ---------- NewLibraryManager ----------

func TestNewLibraryManager(t *testing.T) {
	tmp := withTempDir(t)
	lm := NewLibraryManager()
	if lm == nil {
		t.Fatal("NewLibraryManager returned nil")
	}
	if _, err := os.Stat(tmp + "/" + libraryFile); os.IsNotExist(err) {
		t.Errorf("expected %s to be created", libraryFile)
	}
}

// ---------- Add ----------

func TestLibraryManager_Add(t *testing.T) {
	withTempDir(t)
	lm := NewLibraryManager()

	entry := LibraryEntry{
		FolderPath:  "/manga/my-series",
		FolderName:  "My Series",
		TotalImages: 15,
		CoverImage:  "cover.jpg",
	}
	err := lm.Add(entry)
	if err != nil {
		t.Fatalf("Add() error = %v", err)
	}

	entries := lm.GetAll()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].FolderName != "My Series" {
		t.Errorf("FolderName = %q", entries[0].FolderName)
	}
	if entries[0].ID == "" {
		t.Error("ID should be auto-generated")
	}
	if entries[0].AddedAt == "" {
		t.Error("AddedAt should be set")
	}
}

func TestLibraryManager_Add_Duplicate_UpdatesExisting(t *testing.T) {
	withTempDir(t)
	lm := NewLibraryManager()

	lm.Add(LibraryEntry{FolderPath: "/manga/same", FolderName: "Old Name", TotalImages: 5})
	lm.Add(LibraryEntry{FolderPath: "/manga/same", FolderName: "New Name", TotalImages: 10})

	entries := lm.GetAll()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].FolderName != "New Name" {
		t.Errorf("FolderName = %q, want %q", entries[0].FolderName, "New Name")
	}
	if entries[0].TotalImages != 10 {
		t.Errorf("TotalImages = %d, want %d", entries[0].TotalImages, 10)
	}
}

// ---------- Get ----------

func TestLibraryManager_Get(t *testing.T) {
	withTempDir(t)
	lm := NewLibraryManager()

	lm.Add(LibraryEntry{FolderPath: "/series/a", FolderName: "A", TotalImages: 5})

	e := lm.Get("/series/a")
	if e == nil {
		t.Fatal("Get returned nil")
	}
	if e.FolderName != "A" {
		t.Errorf("FolderName = %q", e.FolderName)
	}
}

func TestLibraryManager_Get_NotFound(t *testing.T) {
	withTempDir(t)
	lm := NewLibraryManager()

	e := lm.Get("/nonexistent")
	if e != nil {
		t.Errorf("expected nil, got %v", e)
	}
}

// ---------- GetAll ----------

func TestLibraryManager_GetAll_ReturnsCopy(t *testing.T) {
	withTempDir(t)
	lm := NewLibraryManager()

	lm.Add(LibraryEntry{FolderPath: "/a", FolderName: "A", TotalImages: 1})
	lm.Add(LibraryEntry{FolderPath: "/b", FolderName: "B", TotalImages: 1})

	got1 := lm.GetAll()
	got2 := lm.GetAll()

	if len(got1) != len(got2) {
		t.Fatal("inconsistent lengths")
	}

	got1[0].FolderName = "Modified"
	original := lm.GetAll()
	if original[0].FolderName == "Modified" {
		t.Error("modifying returned slice should not affect internal state")
	}
}

// ---------- Remove ----------

func TestLibraryManager_Remove(t *testing.T) {
	withTempDir(t)
	lm := NewLibraryManager()

	lm.Add(LibraryEntry{FolderPath: "/a", FolderName: "A", TotalImages: 1})
	lm.Add(LibraryEntry{FolderPath: "/b", FolderName: "B", TotalImages: 1})

	err := lm.Remove("/a")
	if err != nil {
		t.Fatalf("Remove() error = %v", err)
	}

	entries := lm.GetAll()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].FolderPath != "/b" {
		t.Errorf("remaining = %q, want %q", entries[0].FolderPath, "/b")
	}
}

func TestLibraryManager_Remove_NotFound(t *testing.T) {
	withTempDir(t)
	lm := NewLibraryManager()

	err := lm.Remove("/nonexistent")
	if err != nil {
		t.Fatalf("Remove() unexpected error: %v", err)
	}
}

// ---------- Clear ----------

func TestLibraryManager_Clear(t *testing.T) {
	withTempDir(t)
	lm := NewLibraryManager()

	lm.Add(LibraryEntry{FolderPath: "/a", FolderName: "A", TotalImages: 1})
	lm.Add(LibraryEntry{FolderPath: "/b", FolderName: "B", TotalImages: 1})

	err := lm.Clear()
	if err != nil {
		t.Fatalf("Clear() error = %v", err)
	}

	entries := lm.GetAll()
	if len(entries) != 0 {
		t.Errorf("expected 0 entries, got %d", len(entries))
	}
}

// ---------- Save / Load ----------

func TestLibraryManager_SaveAndLoad(t *testing.T) {
	tmp := withTempDir(t)
	lm := NewLibraryManager()

	lm.Add(LibraryEntry{FolderPath: "/manga/saved", FolderName: "Saved", TotalImages: 7})

	lm2 := NewLibraryManager()
	entries := lm2.GetAll()

	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].FolderName != "Saved" {
		t.Errorf("FolderName = %q", entries[0].FolderName)
	}

	if _, err := os.Stat(tmp + "/" + libraryFile); os.IsNotExist(err) {
		t.Error("library.json not found after Save")
	}
}

// ---------- Temporary flag ----------

func TestLibraryManager_Add_TemporaryEntry(t *testing.T) {
	withTempDir(t)
	lm := NewLibraryManager()

	lm.Add(LibraryEntry{
		FolderPath:  "/tmp/folder",
		FolderName:  "Temp",
		TotalImages: 3,
		IsTemporary: true,
	})

	e := lm.Get("/tmp/folder")
	if e == nil {
		t.Fatal("Get returned nil")
	}
	if !e.IsTemporary {
		t.Error("expected IsTemporary = true")
	}
}
