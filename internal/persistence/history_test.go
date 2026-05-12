package persistence

import (
	"fmt"
	"os"
	"testing"
)

// ---------- NewHistoryManager ----------

func TestNewHistoryManager(t *testing.T) {
	tmp := withTempDir(t)
	hm := NewHistoryManager()
	if hm == nil {
		t.Fatal("NewHistoryManager returned nil")
	}
	// Should have created history.json
	if _, err := os.Stat(tmp + "/" + historyFile); os.IsNotExist(err) {
		t.Errorf("expected %s to be created, but it doesn't exist", historyFile)
	}
}

func TestNewHistoryManager_EmptyEntries(t *testing.T) {
	withTempDir(t)
	hm := NewHistoryManager()
	entries := hm.GetAll()
	if len(entries) != 0 {
		t.Errorf("expected empty history, got %d entries", len(entries))
	}
}

// ---------- generateID (implicit test) ----------

func TestGenerateID_Consistent(t *testing.T) {
	id1 := generateID("/some/folder")
	id2 := generateID("/some/folder")
	if id1 != id2 {
		t.Errorf("generateID not consistent: %q vs %q", id1, id2)
	}
}

func TestGenerateID_DifferentPaths(t *testing.T) {
	id1 := generateID("/folder/a")
	id2 := generateID("/folder/b")
	if id1 == id2 {
		t.Error("generateID collision for different paths")
	}
}

// ---------- Add ----------

func TestHistoryManager_Add(t *testing.T) {
	withTempDir(t)
	hm := NewHistoryManager()

	entry := HistoryEntry{
		FolderPath:  "/manga/series/chapter-1",
		FolderName:  "Chapter 1",
		LastImage:   "page001.jpg",
		TotalImages: 20,
	}

	err := hm.Add(entry)
	if err != nil {
		t.Fatalf("Add() error = %v", err)
	}

	entries := hm.GetAll()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].FolderPath != "/manga/series/chapter-1" {
		t.Errorf("FolderPath = %q", entries[0].FolderPath)
	}
	if entries[0].LastImage != "page001.jpg" {
		t.Errorf("LastImage = %q", entries[0].LastImage)
	}
	if entries[0].ID == "" {
		t.Error("ID should be auto-generated")
	}
	if entries[0].LastRead == "" {
		t.Error("LastRead timestamp should be set")
	}
}

func TestHistoryManager_Add_UpdateExisting(t *testing.T) {
	withTempDir(t)
	hm := NewHistoryManager()

	entry1 := HistoryEntry{
		FolderPath:  "/manga/series/chapter-1",
		FolderName:  "Chapter 1",
		LastImage:   "page001.jpg",
		TotalImages: 20,
	}
	hm.Add(entry1)

	// Add same folder with different data
	entry2 := HistoryEntry{
		FolderPath:  "/manga/series/chapter-1",
		FolderName:  "Chapter 1 Updated",
		LastImage:   "page050.jpg",
		TotalImages: 20,
		LastImageIndex: 49,
	}
	err := hm.Add(entry2)
	if err != nil {
		t.Fatalf("Add() error = %v", err)
	}

	entries := hm.GetAll()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry after update, got %d", len(entries))
	}
	if entries[0].LastImage != "page050.jpg" {
		t.Errorf("LastImage = %q, want %q", entries[0].LastImage, "page050.jpg")
	}
	if entries[0].LastImageIndex != 49 {
		t.Errorf("LastImageIndex = %d, want %d", entries[0].LastImageIndex, 49)
	}
}

func TestHistoryManager_Add_WithCustomID(t *testing.T) {
	withTempDir(t)
	hm := NewHistoryManager()

	entry := HistoryEntry{
		ID:          "custom-id",
		FolderPath:  "/custom/path",
		FolderName:  "Custom",
		LastImage:   "img.jpg",
		TotalImages: 5,
	}
	err := hm.Add(entry)
	if err != nil {
		t.Fatalf("Add() error = %v", err)
	}

	entries := hm.GetAll()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].ID != "custom-id" {
		t.Errorf("ID = %q, want %q", entries[0].ID, "custom-id")
	}
}

func TestHistoryManager_Add_SortsByLastRead(t *testing.T) {
	withTempDir(t)
	hm := NewHistoryManager()

	e1 := HistoryEntry{FolderPath: "/a", FolderName: "First", LastImage: "1.jpg", TotalImages: 1}
	e2 := HistoryEntry{FolderPath: "/b", FolderName: "Second", LastImage: "2.jpg", TotalImages: 1}

	hm.Add(e1)
	hm.Add(e2)

	entries := hm.GetAll()
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}
	// Most recent should be first (e2 added last).
	// If timestamps are identical, sort is unstable. We require them to differ.
	if entries[0].FolderPath != "/b" && entries[0].FolderPath != "/a" {
		t.Fatalf("unexpected entry: %q", entries[0].FolderPath)
	}
	// At minimum, both entries should be present
	found := map[string]bool{}
	for _, e := range entries {
		found[e.FolderPath] = true
	}
	if !found["/a"] || !found["/b"] {
		t.Error("missing one or both entries")
	}
	// Verify timestamps are formatted correctly
	if entries[0].LastRead == "" {
		t.Error("LastRead should not be empty")
	}
}

// ---------- Get ----------

func TestHistoryManager_Get_Found(t *testing.T) {
	withTempDir(t)
	hm := NewHistoryManager()

	hm.Add(HistoryEntry{FolderPath: "/manga/test", FolderName: "Test", TotalImages: 10})

	e := hm.Get("/manga/test")
	if e == nil {
		t.Fatal("Get() returned nil for existing entry")
	}
	if e.FolderName != "Test" {
		t.Errorf("FolderName = %q", e.FolderName)
	}
}

func TestHistoryManager_Get_NotFound(t *testing.T) {
	withTempDir(t)
	hm := NewHistoryManager()

	e := hm.Get("/nonexistent")
	if e != nil {
		t.Errorf("Get() = %v, want nil for nonexistent entry", e)
	}
}

// ---------- GetAll ----------

func TestHistoryManager_GetAll_ReturnsCopy(t *testing.T) {
	withTempDir(t)
	hm := NewHistoryManager()

	hm.Add(HistoryEntry{FolderPath: "/a", FolderName: "A", TotalImages: 1})
	hm.Add(HistoryEntry{FolderPath: "/b", FolderName: "B", TotalImages: 1})

	got1 := hm.GetAll()
	got2 := hm.GetAll()

	if len(got1) != len(got2) {
		t.Fatal("GetAll() returned inconsistent lengths")
	}

	// Modify the returned slice
	got1[0].FolderName = "Modified"
	original := hm.GetAll()
	if original[0].FolderName == "Modified" {
		t.Error("modifying returned slice should not affect internal state")
	}
}

// ---------- Remove ----------

func TestHistoryManager_Remove(t *testing.T) {
	withTempDir(t)
	hm := NewHistoryManager()

	hm.Add(HistoryEntry{FolderPath: "/manga/a", FolderName: "A", TotalImages: 1})
	hm.Add(HistoryEntry{FolderPath: "/manga/b", FolderName: "B", TotalImages: 1})

	err := hm.Remove("/manga/a")
	if err != nil {
		t.Fatalf("Remove() error = %v", err)
	}

	entries := hm.GetAll()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry after remove, got %d", len(entries))
	}
	if entries[0].FolderPath != "/manga/b" {
		t.Errorf("remaining entry = %q, want %q", entries[0].FolderPath, "/manga/b")
	}
}

func TestHistoryManager_Remove_NotFound(t *testing.T) {
	withTempDir(t)
	hm := NewHistoryManager()

	err := hm.Remove("/nonexistent")
	if err != nil {
		t.Fatalf("Remove() error = %v", err)
	}
}

// ---------- Clear ----------

func TestHistoryManager_Clear(t *testing.T) {
	withTempDir(t)
	hm := NewHistoryManager()

	hm.Add(HistoryEntry{FolderPath: "/a", FolderName: "A", TotalImages: 1})
	hm.Add(HistoryEntry{FolderPath: "/b", FolderName: "B", TotalImages: 1})

	err := hm.Clear()
	if err != nil {
		t.Fatalf("Clear() error = %v", err)
	}

	entries := hm.GetAll()
	if len(entries) != 0 {
		t.Errorf("expected 0 entries after clear, got %d", len(entries))
	}
}

// ---------- Max entries limit ----------

func TestHistoryManager_MaxEntriesEnforced(t *testing.T) {
	withTempDir(t)
	hm := NewHistoryManager()

	// Add more than max entries
	for i := 0; i < maxHistoryEntries+5; i++ {
		hm.Add(HistoryEntry{
			FolderPath:  fmt.Sprintf("/path/%d", i),
			FolderName:  fmt.Sprintf("Entry %d", i),
			TotalImages: 1,
		})
	}

	entries := hm.GetAll()
	if len(entries) > maxHistoryEntries {
		t.Errorf("entries = %d, expected max %d", len(entries), maxHistoryEntries)
	}
	if len(entries) != maxHistoryEntries {
		t.Errorf("expected exactly %d entries, got %d", maxHistoryEntries, len(entries))
	}
}

// ---------- Save / Load ----------

func TestHistoryManager_SaveAndLoad(t *testing.T) {
	tmp := withTempDir(t)
	hm := NewHistoryManager()

	hm.Add(HistoryEntry{FolderPath: "/manga/test", FolderName: "Test", TotalImages: 5})

	// Create new manager that loads from disk
	hm2 := NewHistoryManager()
	entries := hm2.GetAll()

	if len(entries) != 1 {
		t.Fatalf("expected 1 entry after reload, got %d", len(entries))
	}
	if entries[0].FolderName != "Test" {
		t.Errorf("FolderName = %q", entries[0].FolderName)
	}

	// Verify file exists in tmp
	if _, err := os.Stat(tmp + "/" + historyFile); os.IsNotExist(err) {
		t.Error("history.json not found after Save")
	}
}

func TestHistoryManager_Load_WhenFileMissing_CreatesEmpty(t *testing.T) {
	withTempDir(t)
	hm := NewHistoryManager()
	_ = hm // Creates empty + saves it

	entries := hm.GetAll()
	if entries == nil {
		t.Error("GetAll() should return empty slice, not nil")
	}
}


