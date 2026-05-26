package database

import (
	"testing"
)

func TestNewFolderGridSizeRepository(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderGridSizeRepository(db)
	if r == nil {
		t.Fatal("NewFolderGridSizeRepository returned nil")
	}
}

func TestFolderGridSizeRepository_SetAndGet(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderGridSizeRepository(db)

	if err := r.Set("/manga/test", 300); err != nil {
		t.Fatalf("Set() error = %v", err)
	}

	got := r.Get("/manga/test")
	if got == nil {
		t.Fatal("Get() returned nil")
	}
	if *got != 300 {
		t.Errorf("Get() = %d, want %d", *got, 300)
	}
}

func TestFolderGridSizeRepository_Get_Nonexistent(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderGridSizeRepository(db)

	if got := r.Get("/nonexistent"); got != nil {
		t.Error("Get() nonexistent should return nil")
	}
}

func TestFolderGridSizeRepository_Update(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderGridSizeRepository(db)

	r.Set("/manga/test", 200)
	r.Set("/manga/test", 400)

	got := r.Get("/manga/test")
	if *got != 400 {
		t.Errorf("Get() = %d, want %d", *got, 400)
	}
}

func TestFolderGridSizeRepository_Remove(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderGridSizeRepository(db)

	r.Set("/manga/test", 200)
	if err := r.Remove("/manga/test"); err != nil {
		t.Fatalf("Remove() error = %v", err)
	}

	if got := r.Get("/manga/test"); got != nil {
		t.Error("entry should be removed")
	}
}

func TestFolderGridSizeRepository_Persistence(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderGridSizeRepository(db)

	r.Set("/manga/test", 250)

	r2 := NewFolderGridSizeRepository(db)
	got := r2.Get("/manga/test")
	if got == nil || *got != 250 {
		t.Error("grid size should persist across instances")
	}
}

func TestFolderGridSizeRepository_SetDB(t *testing.T) {
	db1 := newTestDB(t)
	db2 := newTestDB(t)

	r := NewFolderGridSizeRepository(db1)
	r.Set("/manga/test", 200)

	r.SetDB(db2)
	r.Load()
	if got := r.Get("/manga/test"); got != nil {
		t.Error("after SetDB+Load, should have no entries")
	}
}
