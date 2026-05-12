package persistence

import (
	"os"
	"testing"
)

// ---------- NewExplorerManager ----------

func TestNewExplorerManager(t *testing.T) {
	tmp := withTempDir(t)
	em := NewExplorerManager()
	if em == nil {
		t.Fatal("NewExplorerManager returned nil")
	}
	if _, err := os.Stat(tmp + "/" + explorerFile); os.IsNotExist(err) {
		t.Errorf("expected %s to be created", explorerFile)
	}
}

func TestNewExplorerManager_EmptyFolders(t *testing.T) {
	withTempDir(t)
	em := NewExplorerManager()
	folders := em.GetAll()
	if len(folders) != 0 {
		t.Errorf("expected empty folders, got %d", len(folders))
	}
}

// ---------- Add ----------

func TestExplorerManager_Add(t *testing.T) {
	withTempDir(t)
	em := NewExplorerManager()

	folder := BaseFolder{
		Path:       "/manga/my-library",
		Name:       "My Library",
		AddedAt:    "2026-05-11T12:00:00Z",
		IsVisible:  true,
		CoverImage: "cover.jpg",
	}
	err := em.Add(folder)
	if err != nil {
		t.Fatalf("Add() error = %v", err)
	}

	folders := em.GetAll()
	if len(folders) != 1 {
		t.Fatalf("expected 1 folder, got %d", len(folders))
	}
	if folders[0].Name != "My Library" {
		t.Errorf("Name = %q", folders[0].Name)
	}
	if folders[0].AddedAt != "2026-05-11T12:00:00Z" {
		t.Errorf("AddedAt = %q, want fixed timestamp", folders[0].AddedAt)
	}
}

func TestExplorerManager_Add_Duplicate(t *testing.T) {
	withTempDir(t)
	em := NewExplorerManager()

	em.Add(BaseFolder{Path: "/manga/dup", Name: "First"})
	err := em.Add(BaseFolder{Path: "/manga/dup", Name: "Second"})
	if err == nil {
		t.Fatal("expected error for duplicate folder")
	}
}

// ---------- GetAll ----------

func TestExplorerManager_GetAll_ReturnsCopy(t *testing.T) {
	withTempDir(t)
	em := NewExplorerManager()

	em.Add(BaseFolder{Path: "/a", Name: "A"})

	got1 := em.GetAll()
	got1[0].Name = "Modified"

	got2 := em.GetAll()
	if got2[0].Name == "Modified" {
		t.Error("modifying returned slice should not affect internal state")
	}
}

// ---------- Remove ----------

func TestExplorerManager_Remove(t *testing.T) {
	withTempDir(t)
	em := NewExplorerManager()

	em.Add(BaseFolder{Path: "/a", Name: "A"})
	em.Add(BaseFolder{Path: "/b", Name: "B"})

	err := em.Remove("/a")
	if err != nil {
		t.Fatalf("Remove() error = %v", err)
	}

	folders := em.GetAll()
	if len(folders) != 1 {
		t.Fatalf("expected 1 folder, got %d", len(folders))
	}
	if folders[0].Path != "/b" {
		t.Errorf("remaining = %q", folders[0].Path)
	}
}

func TestExplorerManager_Remove_NotFound(t *testing.T) {
	withTempDir(t)
	em := NewExplorerManager()

	err := em.Remove("/nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent folder")
	}
}

// ---------- UpdateCoverImage ----------

func TestExplorerManager_UpdateCoverImage(t *testing.T) {
	withTempDir(t)
	em := NewExplorerManager()

	em.Add(BaseFolder{Path: "/manga/a", Name: "A"})

	err := em.UpdateCoverImage("/manga/a", "new-cover.jpg")
	if err != nil {
		t.Fatalf("UpdateCoverImage() error = %v", err)
	}

	folders := em.GetAll()
	if folders[0].CoverImage != "new-cover.jpg" {
		t.Errorf("CoverImage = %q", folders[0].CoverImage)
	}
}

func TestExplorerManager_UpdateCoverImage_NotFound(t *testing.T) {
	withTempDir(t)
	em := NewExplorerManager()

	err := em.UpdateCoverImage("/nonexistent", "cover.jpg")
	if err == nil {
		t.Fatal("expected error for nonexistent folder")
	}
}

// ---------- Save / Load ----------

func TestExplorerManager_SaveAndLoad(t *testing.T) {
	tmp := withTempDir(t)
	em := NewExplorerManager()

	em.Add(BaseFolder{Path: "/manga/saved", Name: "Saved Folder"})

	em2 := NewExplorerManager()
	folders := em2.GetAll()
	if len(folders) != 1 {
		t.Fatalf("expected 1 folder, got %d", len(folders))
	}
	if folders[0].Name != "Saved Folder" {
		t.Errorf("Name = %q", folders[0].Name)
	}

	if _, err := os.Stat(tmp + "/" + explorerFile); os.IsNotExist(err) {
		t.Error("explorer.json not found")
	}
}

// Test AddedAt field is preserved
func TestExplorerManager_Add_WithAddedAt(t *testing.T) {
	withTempDir(t)
	em := NewExplorerManager()

	em.Add(BaseFolder{Path: "/manga/ts", Name: "Timestamp Test", AddedAt: "2026-01-15T10:30:00Z"})

	folders := em.GetAll()
	if folders[0].AddedAt != "2026-01-15T10:30:00Z" {
		t.Errorf("AddedAt = %q", folders[0].AddedAt)
	}
}
