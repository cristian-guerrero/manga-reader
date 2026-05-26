package database

import (
	"testing"
)

func TestNewFolderViewModeRepository(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderViewModeRepository(db)
	if r == nil {
		t.Fatal("NewFolderViewModeRepository returned nil")
	}
}

func TestFolderViewModeRepository_SetAndGet(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderViewModeRepository(db)

	if err := r.Set("/manga/test", "grid"); err != nil {
		t.Fatalf("Set() error = %v", err)
	}

	got := r.Get("/manga/test")
	if got == nil {
		t.Fatal("Get() returned nil")
	}
	if *got != "grid" {
		t.Errorf("Get() = %q, want %q", *got, "grid")
	}
}

func TestFolderViewModeRepository_Get_Nonexistent(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderViewModeRepository(db)

	if got := r.Get("/nonexistent"); got != nil {
		t.Error("Get() nonexistent should return nil")
	}
}

func TestFolderViewModeRepository_Update(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderViewModeRepository(db)

	r.Set("/manga/test", "grid")
	r.Set("/manga/test", "list")

	got := r.Get("/manga/test")
	if *got != "list" {
		t.Errorf("Get() = %q, want %q", *got, "list")
	}
}

func TestFolderViewModeRepository_Remove(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderViewModeRepository(db)

	r.Set("/manga/test", "grid")
	if err := r.Remove("/manga/test"); err != nil {
		t.Fatalf("Remove() error = %v", err)
	}

	if got := r.Get("/manga/test"); got != nil {
		t.Error("entry should be removed")
	}
}

func TestFolderViewModeRepository_Persistence(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderViewModeRepository(db)

	r.Set("/manga/test", "list")

	r2 := NewFolderViewModeRepository(db)
	got := r2.Get("/manga/test")
	if got == nil || *got != "list" {
		t.Error("view mode should persist across instances")
	}
}

func TestFolderViewModeRepository_SetDB(t *testing.T) {
	db1 := newTestDB(t)
	db2 := newTestDB(t)

	r := NewFolderViewModeRepository(db1)
	r.Set("/manga/test", "grid")

	r.SetDB(db2)
	r.Load()
	if got := r.Get("/manga/test"); got != nil {
		t.Error("after SetDB+Load, should have no entries")
	}
}
