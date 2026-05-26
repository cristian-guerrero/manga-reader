package database

import (
	"testing"

	"manga-visor/internal/persistence"
)

func TestNewExplorerRepository(t *testing.T) {
	db := newTestDB(t)
	r := NewExplorerRepository(db)
	if r == nil {
		t.Fatal("NewExplorerRepository returned nil")
	}
	if entries := r.GetAll(); entries == nil {
		t.Error("GetAll() should return empty slice, not nil")
	}
}

func TestExplorerRepository_AddAndGetAll(t *testing.T) {
	db := newTestDB(t)
	r := NewExplorerRepository(db)

	folder := persistence.BaseFolder{
		Path: "/manga/shonen",
		Name: "Shonen",
	}

	if err := r.Add(folder); err != nil {
		t.Fatalf("Add() error = %v", err)
	}

	entries := r.GetAll()
	if len(entries) != 1 {
		t.Fatalf("GetAll() = %d entries, want 1", len(entries))
	}
	if entries[0].Name != "Shonen" {
		t.Errorf("Name = %q, want %q", entries[0].Name, "Shonen")
	}
}

func TestExplorerRepository_Add_Deduplicates(t *testing.T) {
	db := newTestDB(t)
	r := NewExplorerRepository(db)

	r.Add(persistence.BaseFolder{Path: "/manga/test", Name: "Test"})
	r.Add(persistence.BaseFolder{Path: "/manga/test", Name: "Test"})

	if len(r.GetAll()) != 1 {
		t.Errorf("should have 1 entry, got %d", len(r.GetAll()))
	}
}

func TestExplorerRepository_Remove(t *testing.T) {
	db := newTestDB(t)
	r := NewExplorerRepository(db)

	r.Add(persistence.BaseFolder{Path: "/manga/a", Name: "A"})
	r.Add(persistence.BaseFolder{Path: "/manga/b", Name: "B"})

	if err := r.Remove("/manga/a"); err != nil {
		t.Fatalf("Remove() error = %v", err)
	}

	entries := r.GetAll()
	if len(entries) != 1 {
		t.Errorf("entries = %d, want 1", len(entries))
	}
}

func TestExplorerRepository_UpdateCoverImage(t *testing.T) {
	db := newTestDB(t)
	r := NewExplorerRepository(db)

	r.Add(persistence.BaseFolder{Path: "/manga/test", Name: "Test"})

	if err := r.UpdateCoverImage("/manga/test", "cover.jpg"); err != nil {
		t.Fatalf("UpdateCoverImage() error = %v", err)
	}

	entries := r.GetAll()
	if len(entries) == 1 && entries[0].CoverImage != "cover.jpg" {
		t.Errorf("CoverImage = %q, want %q", entries[0].CoverImage, "cover.jpg")
	}
}

func TestExplorerRepository_GetAll_ReturnsCopy(t *testing.T) {
	db := newTestDB(t)
	r := NewExplorerRepository(db)

	r.Add(persistence.BaseFolder{Path: "/manga/test", Name: "Test"})
	got := r.GetAll()
	got[0].Name = "Modified"
	if r.GetAll()[0].Name != "Test" {
		t.Error("modifying returned copy should affect internal state")
	}
}

func TestExplorerRepository_Persistence(t *testing.T) {
	db := newTestDB(t)
	r := NewExplorerRepository(db)

	r.Add(persistence.BaseFolder{Path: "/manga/test", Name: "Test Persistence"})

	r2 := NewExplorerRepository(db)
	entries := r2.GetAll()
	if len(entries) != 1 || entries[0].Name != "Test Persistence" {
		t.Error("entries should persist across instances")
	}
}

func TestExplorerRepository_SetDB(t *testing.T) {
	db1 := newTestDB(t)
	db2 := newTestDB(t)

	r := NewExplorerRepository(db1)
	r.Add(persistence.BaseFolder{Path: "/manga/test", Name: "Test"})

	r.SetDB(db2)
	r.Load()
	if len(r.GetAll()) != 0 {
		t.Error("after SetDB+Load, should have no entries")
	}
}
