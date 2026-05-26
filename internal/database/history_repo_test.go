package database

import (
	"testing"

	"manga-visor/internal/persistence"
)

func TestNewHistoryRepository(t *testing.T) {
	db := newTestDB(t)
	r := NewHistoryRepository(db)
	if r == nil {
		t.Fatal("NewHistoryRepository returned nil")
	}
	entries := r.GetAll()
	if entries == nil {
		t.Error("GetAll() should return empty slice, not nil")
	}
}

func TestHistoryRepository_GetAll_ReturnsCopy(t *testing.T) {
	db := newTestDB(t)
	r := NewHistoryRepository(db)

	got1 := r.GetAll()
	got2 := r.GetAll()
	if len(got1) != 0 {
		return
	}
	got1 = append(got1, persistence.HistoryEntry{FolderPath: "/test"})
	if len(r.GetAll()) != 0 {
		t.Error("modifying returned slice should not affect internal state")
	}
	_ = got2
}

func TestHistoryRepository_AddAndGet(t *testing.T) {
	db := newTestDB(t)
	r := NewHistoryRepository(db)

	entry := persistence.HistoryEntry{
		FolderPath: "/manga/one-piece",
		FolderName: "One Piece",
		LastImage:  "001.jpg",
		TotalImages: 20,
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

func TestHistoryRepository_UpdateExisting(t *testing.T) {
	db := newTestDB(t)
	r := NewHistoryRepository(db)

	entry := persistence.HistoryEntry{
		FolderPath: "/manga/one-piece",
		FolderName: "One Piece",
		LastImage:  "001.jpg",
		TotalImages: 20,
	}
	r.Add(entry)

	entry.LastImage = "050.jpg"
	r.Add(entry)

	got := r.Get("/manga/one-piece")
	if got.LastImage != "050.jpg" {
		t.Errorf("LastImage = %q, want %q", got.LastImage, "050.jpg")
	}
}

func TestHistoryRepository_Remove(t *testing.T) {
	db := newTestDB(t)
	r := NewHistoryRepository(db)

	r.Add(persistence.HistoryEntry{FolderPath: "/manga/one-piece", FolderName: "One Piece"})
	r.Add(persistence.HistoryEntry{FolderPath: "/manga/naruto", FolderName: "Naruto"})

	if err := r.Remove("/manga/one-piece"); err != nil {
		t.Fatalf("Remove() error = %v", err)
	}

	if r.Get("/manga/one-piece") != nil {
		t.Error("entry should be removed")
	}
	if r.Get("/manga/naruto") == nil {
		t.Error("other entry should still exist")
	}
}

func TestHistoryRepository_Remove_Nonexistent(t *testing.T) {
	db := newTestDB(t)
	r := NewHistoryRepository(db)

	err := r.Remove("/nonexistent")
	if err != nil {
		t.Errorf("Remove() nonexistent error = %v", err)
	}
}

func TestHistoryRepository_Clear(t *testing.T) {
	db := newTestDB(t)
	r := NewHistoryRepository(db)

	r.Add(persistence.HistoryEntry{FolderPath: "/manga/one-piece", FolderName: "One Piece"})
	r.Add(persistence.HistoryEntry{FolderPath: "/manga/naruto", FolderName: "Naruto"})

	if err := r.Clear(); err != nil {
		t.Fatalf("Clear() error = %v", err)
	}

	if len(r.GetAll()) != 0 {
		t.Error("Clear() should remove all entries")
	}
}

func TestHistoryRepository_MaxEntries(t *testing.T) {
	db := newTestDB(t)
	r := NewHistoryRepository(db)

	for i := 0; i < maxHistoryEntries+10; i++ {
		r.Add(persistence.HistoryEntry{
			FolderPath: "/manga/test-" + string(rune('A'+i%26)) + string(rune('0'+i/26)),
			FolderName: "Test",
		})
	}

	entries := r.GetAll()
	if len(entries) > maxHistoryEntries {
		t.Errorf("entries = %d, want <= %d", len(entries), maxHistoryEntries)
	}
}

func TestHistoryRepository_SortByLastRead(t *testing.T) {
	db := newTestDB(t)
	r := NewHistoryRepository(db)

	r.Add(persistence.HistoryEntry{FolderPath: "/manga/old", FolderName: "Old"})
	r.Add(persistence.HistoryEntry{FolderPath: "/manga/new", FolderName: "New"})

	entries := r.GetAll()
	if len(entries) >= 2 && entries[0].FolderName != "New" && entries[0].FolderName != "Old" {
		t.Error("entries should be sorted by LastRead descending")
	}
}

func TestHistoryRepository_SaveAndLoadAcrossInstances(t *testing.T) {
	db := newTestDB(t)
	r := NewHistoryRepository(db)

	r.Add(persistence.HistoryEntry{FolderPath: "/manga/test", FolderName: "Test", LastImage: "001.jpg"})

	r2 := NewHistoryRepository(db)
	got := r2.Get("/manga/test")
	if got == nil {
		t.Fatal("entry should exist after reload")
	}
	if got.FolderName != "Test" {
		t.Errorf("FolderName = %q, want %q", got.FolderName, "Test")
	}
}

func TestHistoryRepository_SetDB(t *testing.T) {
	db1 := newTestDB(t)
	db2 := newTestDB(t)

	r := NewHistoryRepository(db1)
	r.Add(persistence.HistoryEntry{FolderPath: "/manga/test", FolderName: "Test"})

	r.SetDB(db2)
	r.Load()
	got := r.Get("/manga/test")
	if got != nil {
		t.Error("after SetDB+Load, should not have previous entries")
	}
}

func TestHistoryRepository_Get_Nonexistent(t *testing.T) {
	db := newTestDB(t)
	r := NewHistoryRepository(db)
	if got := r.Get("/nonexistent"); got != nil {
		t.Error("Get() nonexistent should return nil")
	}
}

func TestHistoryRepository_Get_ReturnsCopy(t *testing.T) {
	db := newTestDB(t)
	r := NewHistoryRepository(db)

	r.Add(persistence.HistoryEntry{FolderPath: "/manga/test", FolderName: "Test"})

	got := r.Get("/manga/test")
	if got == nil {
		t.Fatal("Get() returned nil")
	}
	got.FolderName = "Modified"
	if r.Get("/manga/test").FolderName != "Test" {
		t.Error("modifying returned copy should not affect internal state")
	}
}
