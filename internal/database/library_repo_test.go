package database

import (
	"testing"

	"manga-visor/internal/persistence"
)

func TestNewLibraryRepository(t *testing.T) {
	db := newTestDB(t)
	r := NewLibraryRepository(db)
	if r == nil {
		t.Fatal("NewLibraryRepository returned nil")
	}
	if entries := r.GetAll(); entries == nil {
		t.Error("GetAll() should return empty slice, not nil")
	}
}

func TestLibraryRepository_AddAndGet(t *testing.T) {
	db := newTestDB(t)
	r := NewLibraryRepository(db)

	entry := persistence.LibraryEntry{
		FolderPath: "/manga/one-piece",
		FolderName: "One Piece",
		TotalImages: 100,
	}

	if err := r.Add(entry); err != nil {
		t.Fatalf("Add() error = %v", err)
	}

	got := r.Get("/manga/one-piece")
	if got == nil {
		t.Fatal("Get() returned nil")
	}
	if got.FolderName != "One Piece" {
		t.Errorf("FolderName = %q, want %q", got.FolderName, "One Piece")
	}
	if got.ID == "" {
		t.Error("ID should be auto-generated")
	}
}

func TestLibraryRepository_UpdateExisting(t *testing.T) {
	db := newTestDB(t)
	r := NewLibraryRepository(db)

	r.Add(persistence.LibraryEntry{FolderPath: "/manga/test", FolderName: "Test"})
	r.Add(persistence.LibraryEntry{FolderPath: "/manga/test", FolderName: "Test Updated"})

	got := r.Get("/manga/test")
	if got.FolderName != "Test Updated" {
		t.Errorf("FolderName = %q, want %q", got.FolderName, "Test Updated")
	}
}

func TestLibraryRepository_GetAll_ReturnsCopy(t *testing.T) {
	db := newTestDB(t)
	r := NewLibraryRepository(db)

	r.Add(persistence.LibraryEntry{FolderPath: "/manga/test", FolderName: "Test"})
	got := r.GetAll()
	got[0].FolderName = "Modified"
	if r.Get("/manga/test").FolderName != "Test" {
		t.Error("modifying returned copy should not affect internal state")
	}
}

func TestLibraryRepository_Remove(t *testing.T) {
	db := newTestDB(t)
	r := NewLibraryRepository(db)

	r.Add(persistence.LibraryEntry{FolderPath: "/manga/a", FolderName: "A"})
	r.Add(persistence.LibraryEntry{FolderPath: "/manga/b", FolderName: "B"})

	if err := r.Remove("/manga/a"); err != nil {
		t.Fatalf("Remove() error = %v", err)
	}

	if r.Get("/manga/a") != nil {
		t.Error("entry should be removed")
	}
	if r.Get("/manga/b") == nil {
		t.Error("other entry should still exist")
	}
}

func TestLibraryRepository_Clear(t *testing.T) {
	db := newTestDB(t)
	r := NewLibraryRepository(db)

	r.Add(persistence.LibraryEntry{FolderPath: "/manga/a", FolderName: "A"})
	r.Add(persistence.LibraryEntry{FolderPath: "/manga/b", FolderName: "B"})

	if err := r.Clear(); err != nil {
		t.Fatalf("Clear() error = %v", err)
	}

	if len(r.GetAll()) != 0 {
		t.Error("Clear() should remove all entries")
	}
}

func TestLibraryRepository_Persistence(t *testing.T) {
	db := newTestDB(t)
	r := NewLibraryRepository(db)

	r.Add(persistence.LibraryEntry{FolderPath: "/manga/test", FolderName: "Test", TotalImages: 50})

	r2 := NewLibraryRepository(db)
	got := r2.Get("/manga/test")
	if got == nil || got.TotalImages != 50 {
		t.Errorf("persistence failed: got %+v", got)
	}
}

func TestLibraryRepository_SetDB(t *testing.T) {
	db1 := newTestDB(t)
	db2 := newTestDB(t)

	r := NewLibraryRepository(db1)
	r.Add(persistence.LibraryEntry{FolderPath: "/manga/test", FolderName: "Test"})

	r.SetDB(db2)
	r.Load()
	if got := r.Get("/manga/test"); got != nil {
		t.Error("after SetDB+Load, should not have previous entries")
	}
}

func TestLibraryRepository_Get_Nonexistent(t *testing.T) {
	db := newTestDB(t)
	r := NewLibraryRepository(db)
	if got := r.Get("/nonexistent"); got != nil {
		t.Error("Get() nonexistent should return nil")
	}
}
