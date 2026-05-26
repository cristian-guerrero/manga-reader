package database

import (
	"testing"
)

func TestNewFolderOrdersRepository(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderOrdersRepository(db)
	if r == nil {
		t.Fatal("NewFolderOrdersRepository returned nil")
	}
}

func TestFolderOrdersRepository_Get_Nonexistent(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderOrdersRepository(db)

	if r.Get("/nonexistent") != nil {
		t.Error("Get() nonexistent should return nil")
	}
	if r.GetOrder("/nonexistent") != nil {
		t.Error("GetOrder() nonexistent should return nil")
	}
}

func TestFolderOrdersRepository_Save(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderOrdersRepository(db)

	customOrder := []string{"folderB", "folderA"}
	originalOrder := []string{"folderA", "folderB"}

	if err := r.Save("/manga/test", customOrder, originalOrder); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	got := r.Get("/manga/test")
	if got == nil {
		t.Fatal("Get() returned nil")
	}
	if len(got.CustomOrder) != 2 {
		t.Errorf("CustomOrder len = %d, want 2", len(got.CustomOrder))
	}
}

func TestFolderOrdersRepository_GetOrder(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderOrdersRepository(db)

	r.Save("/manga/test", []string{"folderB", "folderA"}, nil)

	order := r.GetOrder("/manga/test")
	if len(order) != 2 || order[0] != "folderB" {
		t.Errorf("GetOrder() = %v, want [folderB folderA]", order)
	}
}

func TestFolderOrdersRepository_HasCustomOrder(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderOrdersRepository(db)

	if r.HasCustomOrder("/manga/test") {
		t.Error("HasCustomOrder should be false initially")
	}

	r.Save("/manga/test", []string{"folderB"}, nil)
	if !r.HasCustomOrder("/manga/test") {
		t.Error("HasCustomOrder should be true after Save")
	}
}

func TestFolderOrdersRepository_SetAutoOrder(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderOrdersRepository(db)

	if err := r.SetAutoOrder("/manga/test", []string{"folderC", "folderA", "folderB"}, []string{"folderA", "folderB", "folderC"}); err != nil {
		t.Fatalf("SetAutoOrder() error = %v", err)
	}

	auto := r.GetAutoOrder("/manga/test")
	if len(auto) != 3 || auto[0] != "folderC" {
		t.Errorf("auto = %v, want [folderC folderA folderB]", auto)
	}
}

func TestFolderOrdersRepository_HasAutoOrder(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderOrdersRepository(db)

	if r.HasAutoOrder("/manga/test") {
		t.Error("HasAutoOrder should be false initially")
	}

	r.SetAutoOrder("/manga/test", []string{"folderA"}, nil)
	if !r.HasAutoOrder("/manga/test") {
		t.Error("HasAutoOrder should be true after SetAutoOrder")
	}
}

func TestFolderOrdersRepository_PromoteToFront(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderOrdersRepository(db)

	allEntries := []string{"folderA", "folderB", "folderC", "folderD"}

	result, err := r.PromoteToFront("/manga/test", "folderC", allEntries)
	if err != nil {
		t.Fatalf("PromoteToFront() error = %v", err)
	}

	if len(result) < 4 || result[0] != "folderC" {
		t.Errorf("after promote, result[0] = %q, want %q, len=%d", result[0], "folderC", len(result))
	}
}

func TestFolderOrdersRepository_PromoteToFront_ExistingAuto(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderOrdersRepository(db)

	r.SetAutoOrder("/manga/test", []string{"folderB", "folderA"}, []string{"folderA", "folderB"})

	allEntries := []string{"folderA", "folderB", "folderC"}
	result, err := r.PromoteToFront("/manga/test", "folderA", allEntries)
	if err != nil {
		t.Fatalf("PromoteToFront() error = %v", err)
	}

	if result[0] != "folderA" {
		t.Errorf("result[0] = %q, want %q", result[0], "folderA")
	}
}

func TestFolderOrdersRepository_ResetAutoOrder(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderOrdersRepository(db)

	r.SetAutoOrder("/manga/test", []string{"folderB", "folderA"}, nil)

	if err := r.ResetAutoOrder("/manga/test"); err != nil {
		t.Fatalf("ResetAutoOrder() error = %v", err)
	}

	auto := r.GetAutoOrder("/manga/test")
	if auto != nil {
		t.Error("AutoOrder should be nil after ResetAutoOrder")
	}
}

func TestFolderOrdersRepository_Reset(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderOrdersRepository(db)

	r.Save("/manga/test", []string{"folderB", "folderA"}, nil)

	if err := r.Reset("/manga/test"); err != nil {
		t.Fatalf("Reset() error = %v", err)
	}

	got := r.Get("/manga/test")
	if len(got.CustomOrder) != 0 {
		t.Error("CustomOrder should be empty after Reset")
	}
}

func TestFolderOrdersRepository_Remove(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderOrdersRepository(db)

	r.Save("/manga/test", []string{"folderA"}, nil)

	if err := r.Remove("/manga/test"); err != nil {
		t.Fatalf("Remove() error = %v", err)
	}

	if r.Get("/manga/test") != nil {
		t.Error("entry should be removed")
	}
}

func TestFolderOrdersRepository_PinUnpin(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderOrdersRepository(db)

	if err := r.PinFolder("/manga/test", "name", "folderA"); err != nil {
		t.Fatalf("PinFolder() error = %v", err)
	}

	pinned := r.GetPinned("/manga/test", "name")
	if len(pinned) != 1 || pinned[0] != "folderA" {
		t.Errorf("pinned = %v, want [folderA]", pinned)
	}

	// Duplicate pin
	r.PinFolder("/manga/test", "name", "folderA")
	pinned = r.GetPinned("/manga/test", "name")
	if len(pinned) != 1 {
		t.Errorf("duplicate pin should be ignored, got %d", len(pinned))
	}

	if err := r.UnpinFolder("/manga/test", "name", "folderA"); err != nil {
		t.Fatalf("UnpinFolder() error = %v", err)
	}

	pinned = r.GetPinned("/manga/test", "name")
	if len(pinned) != 0 {
		t.Errorf("after unpin, pinned = %v, want empty", pinned)
	}
}

func TestFolderOrdersRepository_PinMultipleModes(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderOrdersRepository(db)

	r.PinFolder("/manga/test", "name", "folderA")
	r.PinFolder("/manga/test", "date", "folderB")

	pinnedName := r.GetPinned("/manga/test", "name")
	pinnedDate := r.GetPinned("/manga/test", "date")

	if len(pinnedName) != 1 || pinnedName[0] != "folderA" {
		t.Errorf("pinnedName = %v", pinnedName)
	}
	if len(pinnedDate) != 1 || pinnedDate[0] != "folderB" {
		t.Errorf("pinnedDate = %v", pinnedDate)
	}
}

func TestFolderOrdersRepository_ReorderPinnedFolders(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderOrdersRepository(db)

	r.PinFolder("/manga/test", "name", "folderA")
	r.PinFolder("/manga/test", "name", "folderB")

	if err := r.ReorderPinnedFolders("/manga/test", "name", []string{"folderB", "folderA"}); err != nil {
		t.Fatalf("ReorderPinnedFolders() error = %v", err)
	}

	pinned := r.GetPinned("/manga/test", "name")
	if pinned[0] != "folderB" {
		t.Errorf("pinned[0] = %q, want %q", pinned[0], "folderB")
	}
}

func TestFolderOrdersRepository_SetOriginalOrder(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderOrdersRepository(db)

	if err := r.SetOriginalOrder("/manga/test", []string{"folderA", "folderB"}); err != nil {
		t.Fatalf("SetOriginalOrder() error = %v", err)
	}

	got := r.Get("/manga/test")
	if len(got.OriginalOrder) != 2 {
		t.Errorf("OriginalOrder len = %d, want 2", len(got.OriginalOrder))
	}
}

func TestFolderOrdersRepository_Persistence(t *testing.T) {
	db := newTestDB(t)
	r := NewFolderOrdersRepository(db)

	r.Save("/manga/test", []string{"folderB", "folderA"}, []string{"folderA", "folderB"})

	r2 := NewFolderOrdersRepository(db)
	got := r2.Get("/manga/test")
	if got == nil || len(got.CustomOrder) != 2 {
		t.Error("folder orders should persist across instances")
	}
}

func TestFolderOrdersRepository_SetDB(t *testing.T) {
	db1 := newTestDB(t)
	db2 := newTestDB(t)

	r := NewFolderOrdersRepository(db1)
	r.Save("/manga/test", []string{"folderA"}, nil)

	r.SetDB(db2)
	r.Load()
	if r.Get("/manga/test") != nil {
		t.Error("after SetDB+Load, should have no entries")
	}
}
