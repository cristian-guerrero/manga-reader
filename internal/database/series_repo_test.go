package database

import (
	"testing"

	"manga-visor/internal/persistence"
)

func TestNewSeriesRepository(t *testing.T) {
	db := newTestDB(t)
	r := NewSeriesRepository(db)
	if r == nil {
		t.Fatal("NewSeriesRepository returned nil")
	}
	entries := r.GetAll()
	if entries == nil {
		t.Error("GetAll() should return empty slice, not nil")
	}
}

func TestSeriesRepository_AddAndGet(t *testing.T) {
	db := newTestDB(t)
	r := NewSeriesRepository(db)

	entry := persistence.SeriesEntry{
		Path: "/manga/one-piece",
		Name: "One Piece",
	}

	if err := r.Add(entry); err != nil {
		t.Fatalf("Add() error = %v", err)
	}

	got := r.Get("/manga/one-piece")
	if got == nil {
		t.Fatal("Get() returned nil")
	}
	if got.Name != "One Piece" {
		t.Errorf("Name = %q, want %q", got.Name, "One Piece")
	}
	if got.ID == "" {
		t.Error("ID should be auto-generated")
	}
}

func TestSeriesRepository_AddWithChapters(t *testing.T) {
	db := newTestDB(t)
	r := NewSeriesRepository(db)

	entry := persistence.SeriesEntry{
		Path: "/manga/one-piece",
		Name: "One Piece",
		Chapters: []persistence.ChapterInfo{
			{Path: "/manga/one-piece/ch1", Name: "Chapter 1", ImageCount: 20},
			{Path: "/manga/one-piece/ch2", Name: "Chapter 2", ImageCount: 18},
		},
	}

	if err := r.Add(entry); err != nil {
		t.Fatalf("Add() error = %v", err)
	}

	got := r.Get("/manga/one-piece")
	if got == nil {
		t.Fatal("Get() returned nil")
	}
	if len(got.Chapters) != 2 {
		t.Errorf("Chapters = %d, want 2", len(got.Chapters))
	}
}

func TestSeriesRepository_UpdateExisting(t *testing.T) {
	db := newTestDB(t)
	r := NewSeriesRepository(db)

	entry := persistence.SeriesEntry{
		Path: "/manga/one-piece",
		Name: "One Piece",
	}
	r.Add(entry)

	entry.Name = "One Piece (Updated)"
	r.Add(entry)

	got := r.Get("/manga/one-piece")
	if got.Name != "One Piece (Updated)" {
		t.Errorf("Name = %q, want %q", got.Name, "One Piece (Updated)")
	}
}

func TestSeriesRepository_GetAll_ReturnsCopy(t *testing.T) {
	db := newTestDB(t)
	r := NewSeriesRepository(db)

	r.Add(persistence.SeriesEntry{Path: "/manga/test", Name: "Test"})
	got := r.GetAll()
	if len(got) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(got))
	}
	got[0].Name = "Modified"
	if r.Get("/manga/test").Name != "Test" {
		t.Error("modifying returned copy should not affect internal state")
	}
}

func TestSeriesRepository_Remove(t *testing.T) {
	db := newTestDB(t)
	r := NewSeriesRepository(db)

	r.Add(persistence.SeriesEntry{Path: "/manga/one-piece", Name: "One Piece"})
	r.Add(persistence.SeriesEntry{Path: "/manga/naruto", Name: "Naruto"})

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

func TestSeriesRepository_Clear(t *testing.T) {
	db := newTestDB(t)
	r := NewSeriesRepository(db)

	r.Add(persistence.SeriesEntry{Path: "/manga/one-piece", Name: "One Piece"})
	r.Add(persistence.SeriesEntry{Path: "/manga/naruto", Name: "Naruto"})

	if err := r.Clear(); err != nil {
		t.Fatalf("Clear() error = %v", err)
	}

	if len(r.GetAll()) != 0 {
		t.Error("Clear() should remove all entries")
	}
}

func TestSeriesRepository_Persistence(t *testing.T) {
	db := newTestDB(t)
	r := NewSeriesRepository(db)

	r.Add(persistence.SeriesEntry{
		Path: "/manga/test", Name: "Test",
		Chapters: []persistence.ChapterInfo{
			{Path: "/manga/test/ch1", Name: "Ch1", ImageCount: 10},
		},
	})

	r2 := NewSeriesRepository(db)
	got := r2.Get("/manga/test")
	if got == nil {
		t.Fatal("entry should persist across instances")
	}
	if len(got.Chapters) != 1 {
		t.Errorf("chapters = %d, want 1", len(got.Chapters))
	}
}

func TestSeriesRepository_SetDB(t *testing.T) {
	db1 := newTestDB(t)
	db2 := newTestDB(t)

	r := NewSeriesRepository(db1)
	r.Add(persistence.SeriesEntry{Path: "/manga/test", Name: "Test"})

	r.SetDB(db2)
	r.Load()
	got := r.Get("/manga/test")
	if got != nil {
		t.Error("after SetDB+Load, should not have previous entries")
	}
}

func TestSeriesRepository_Get_Nonexistent(t *testing.T) {
	db := newTestDB(t)
	r := NewSeriesRepository(db)
	if got := r.Get("/nonexistent"); got != nil {
		t.Error("Get() nonexistent should return nil")
	}
}
