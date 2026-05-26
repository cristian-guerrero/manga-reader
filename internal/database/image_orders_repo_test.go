package database

import (
	"testing"
)

func TestNewImageOrdersRepository(t *testing.T) {
	db := newTestDB(t)
	r := NewImageOrdersRepository(db)
	if r == nil {
		t.Fatal("NewImageOrdersRepository returned nil")
	}
}

func TestImageOrdersRepository_Get_Nonexistent(t *testing.T) {
	db := newTestDB(t)
	r := NewImageOrdersRepository(db)
	if r.Get("/nonexistent") != nil {
		t.Error("Get() nonexistent should return nil")
	}
}

func TestImageOrdersRepository_Save(t *testing.T) {
	db := newTestDB(t)
	r := NewImageOrdersRepository(db)

	customOrder := []string{"img3.jpg", "img1.jpg", "img2.jpg"}
	originalOrder := []string{"img1.jpg", "img2.jpg", "img3.jpg"}

	if err := r.Save("/manga/test", customOrder, originalOrder); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	got := r.Get("/manga/test")
	if got == nil {
		t.Fatal("Get() returned nil")
	}
	if len(got.CustomOrder) != 3 {
		t.Errorf("CustomOrder len = %d, want 3", len(got.CustomOrder))
	}
}

func TestImageOrdersRepository_GetOrder(t *testing.T) {
	db := newTestDB(t)
	r := NewImageOrdersRepository(db)

	customOrder := []string{"img3.jpg", "img1.jpg"}
	originalOrder := []string{"img1.jpg", "img2.jpg", "img3.jpg"}
	r.Save("/manga/test", customOrder, originalOrder)

	order := r.GetOrder("/manga/test")
	if len(order) != 2 {
		t.Errorf("GetOrder() len = %d, want 2 (custom order)", len(order))
	}
	if order[0] != "img3.jpg" {
		t.Errorf("order[0] = %q, want %q", order[0], "img3.jpg")
	}
}

func TestImageOrdersRepository_GetOrder_FallsBackToOriginal(t *testing.T) {
	db := newTestDB(t)
	r := NewImageOrdersRepository(db)

	originalOrder := []string{"img1.jpg", "img2.jpg"}
	r.SetOriginalOrder("/manga/test", originalOrder)

	order := r.GetOrder("/manga/test")
	if len(order) != 2 {
		t.Errorf("GetOrder() len = %d, want 2", len(order))
	}
}

func TestImageOrdersRepository_HasCustomOrder(t *testing.T) {
	db := newTestDB(t)
	r := NewImageOrdersRepository(db)

	if r.HasCustomOrder("/manga/test") {
		t.Error("HasCustomOrder should be false initially")
	}

	r.Save("/manga/test", []string{"img2.jpg"}, nil)
	if !r.HasCustomOrder("/manga/test") {
		t.Error("HasCustomOrder should be true after Save with custom order")
	}
}

func TestImageOrdersRepository_SetOriginalOrder(t *testing.T) {
	db := newTestDB(t)
	r := NewImageOrdersRepository(db)

	if err := r.SetOriginalOrder("/manga/test", []string{"a.jpg", "b.jpg"}); err != nil {
		t.Fatalf("SetOriginalOrder() error = %v", err)
	}

	got := r.Get("/manga/test")
	if len(got.OriginalOrder) != 2 {
		t.Errorf("OriginalOrder len = %d, want 2", len(got.OriginalOrder))
	}
}

func TestImageOrdersRepository_Reset(t *testing.T) {
	db := newTestDB(t)
	r := NewImageOrdersRepository(db)

	r.Save("/manga/test", []string{"img2.jpg", "img1.jpg"}, []string{"img1.jpg", "img2.jpg"})

	if err := r.Reset("/manga/test"); err != nil {
		t.Fatalf("Reset() error = %v", err)
	}

	got := r.Get("/manga/test")
	if len(got.CustomOrder) != 0 {
		t.Error("CustomOrder should be empty after Reset")
	}
}

func TestImageOrdersRepository_Remove(t *testing.T) {
	db := newTestDB(t)
	r := NewImageOrdersRepository(db)

	r.Save("/manga/test", []string{"img1.jpg"}, []string{"img1.jpg"})

	if err := r.Remove("/manga/test"); err != nil {
		t.Fatalf("Remove() error = %v", err)
	}

	if r.Get("/manga/test") != nil {
		t.Error("entry should be removed")
	}
}

func TestImageOrdersRepository_PinUnpinImage(t *testing.T) {
	db := newTestDB(t)
	r := NewImageOrdersRepository(db)

	if err := r.PinImage("/manga/test", "name", "img1.jpg"); err != nil {
		t.Fatalf("PinImage() error = %v", err)
	}

	pinned := r.GetPinnedImages("/manga/test", "name")
	if len(pinned) != 1 || pinned[0] != "img1.jpg" {
		t.Errorf("pinned = %v, want [img1.jpg]", pinned)
	}

	// Pin again should be idempotent
	r.PinImage("/manga/test", "name", "img1.jpg")
	pinned = r.GetPinnedImages("/manga/test", "name")
	if len(pinned) != 1 {
		t.Errorf("duplicate pin should be ignored, got %d", len(pinned))
	}

	if err := r.UnpinImage("/manga/test", "name", "img1.jpg"); err != nil {
		t.Fatalf("UnpinImage() error = %v", err)
	}

	pinned = r.GetPinnedImages("/manga/test", "name")
	if len(pinned) != 0 {
		t.Errorf("after unpin, pinned = %v, want empty", pinned)
	}
}

func TestImageOrdersRepository_PinImage_CreatesEntry(t *testing.T) {
	db := newTestDB(t)
	r := NewImageOrdersRepository(db)

	r.PinImage("/manga/test", "name", "img1.jpg")

	got := r.Get("/manga/test")
	if got == nil {
		t.Fatal("entry should be auto-created on pin")
	}
}

func TestImageOrdersRepository_ReorderPinnedImages(t *testing.T) {
	db := newTestDB(t)
	r := NewImageOrdersRepository(db)

	r.PinImage("/manga/test", "name", "img1.jpg")
	r.PinImage("/manga/test", "name", "img2.jpg")

	if err := r.ReorderPinnedImages("/manga/test", "name", []string{"img2.jpg", "img1.jpg"}); err != nil {
		t.Fatalf("ReorderPinnedImages() error = %v", err)
	}

	pinned := r.GetPinnedImages("/manga/test", "name")
	if len(pinned) != 2 || pinned[0] != "img2.jpg" {
		t.Errorf("after reorder, pinned[0] = %q, want %q", pinned[0], "img2.jpg")
	}
}

func TestImageOrdersRepository_Persistence(t *testing.T) {
	db := newTestDB(t)
	r := NewImageOrdersRepository(db)

	r.Save("/manga/test", []string{"img2.jpg", "img1.jpg"}, []string{"img1.jpg", "img2.jpg"})

	r2 := NewImageOrdersRepository(db)
	got := r2.Get("/manga/test")
	if got == nil || len(got.CustomOrder) != 2 {
		t.Error("image orders should persist across instances")
	}
}

func TestImageOrdersRepository_SetDB(t *testing.T) {
	db1 := newTestDB(t)
	db2 := newTestDB(t)

	r := NewImageOrdersRepository(db1)
	r.Save("/manga/test", []string{"img1.jpg"}, nil)

	r.SetDB(db2)
	r.Load()
	if r.Get("/manga/test") != nil {
		t.Error("after SetDB+Load, should have no entries")
	}
}
