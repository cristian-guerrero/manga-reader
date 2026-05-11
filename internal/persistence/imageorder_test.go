package persistence

import (
	"os"
	"testing"
)

// ---------- NewOrdersManager ----------

func TestNewOrdersManager(t *testing.T) {
	withTempDir(t)
	om := NewOrdersManager()
	if om == nil {
		t.Fatal("NewOrdersManager returned nil")
	}
}

// ---------- Get ----------

func TestOrdersManager_Get_NotFound(t *testing.T) {
	withTempDir(t)
	om := NewOrdersManager()

	order := om.Get("/nonexistent")
	if order != nil {
		t.Errorf("expected nil, got %v", order)
	}
}

func TestOrdersManager_GetOrder_NotFound(t *testing.T) {
	withTempDir(t)
	om := NewOrdersManager()

	order := om.GetOrder("/nonexistent")
	if order != nil {
		t.Errorf("expected nil, got %v", order)
	}
}

// ---------- Save / Get ----------

func TestOrdersManager_SaveAndGet(t *testing.T) {
	withTempDir(t)
	om := NewOrdersManager()

	err := om.Save("/manga/my-folder", []string{"img3.jpg", "img1.jpg", "img2.jpg"}, []string{"img1.jpg", "img2.jpg", "img3.jpg"})
	if err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	loaded := om.Get("/manga/my-folder")
	if loaded == nil {
		t.Fatal("Get returned nil after Save")
	}
	if len(loaded.CustomOrder) != 3 {
		t.Fatalf("expected 3 items, got %d", len(loaded.CustomOrder))
	}
	if loaded.CustomOrder[0] != "img3.jpg" {
		t.Errorf("CustomOrder[0] = %q", loaded.CustomOrder[0])
	}
	if loaded.ModifiedAt == "" {
		t.Error("ModifiedAt should be set")
	}
}

// ---------- SetOriginalOrder ----------

func TestOrdersManager_SetOriginalOrder(t *testing.T) {
	withTempDir(t)
	om := NewOrdersManager()

	original := []string{"pg01.jpg", "pg02.jpg", "pg03.jpg"}
	err := om.SetOriginalOrder("/manga/folder", original)
	if err != nil {
		t.Fatalf("SetOriginalOrder() error = %v", err)
	}

	// GetOrder should return original order (no custom order set)
	order := om.GetOrder("/manga/folder")
	if len(order) != 3 {
		t.Fatalf("expected 3 items, got %d", len(order))
	}
	if order[0] != "pg01.jpg" {
		t.Errorf("order[0] = %q", order[0])
	}
}

// ---------- HasCustomOrder ----------

func TestOrdersManager_HasCustomOrder_False(t *testing.T) {
	withTempDir(t)
	om := NewOrdersManager()

	om.SetOriginalOrder("/manga/folder", []string{"a.jpg", "b.jpg"})

	if om.HasCustomOrder("/manga/folder") {
		t.Error("HasCustomOrder should be false with only original order")
	}
}

func TestOrdersManager_HasCustomOrder_True(t *testing.T) {
	withTempDir(t)
	om := NewOrdersManager()

	om.Save("/manga/folder", []string{"b.jpg", "a.jpg"}, []string{"a.jpg", "b.jpg"})

	if !om.HasCustomOrder("/manga/folder") {
		t.Error("HasCustomOrder should be true")
	}
}

// ---------- Reset ----------

func TestOrdersManager_Reset(t *testing.T) {
	withTempDir(t)
	om := NewOrdersManager()

	om.SetOriginalOrder("/manga/folder", []string{"a.jpg", "b.jpg"})
	om.Save("/manga/folder", []string{"b.jpg", "a.jpg"}, nil)

	err := om.Reset("/manga/folder")
	if err != nil {
		t.Fatalf("Reset() error = %v", err)
	}

	// After reset, GetOrder should still return the original order
	order := om.GetOrder("/manga/folder")
	if len(order) != 2 {
		t.Fatalf("expected 2 items, got %d", len(order))
	}
	if order[0] != "a.jpg" {
		t.Errorf("order[0] = %q, want %q", order[0], "a.jpg")
	}

	// HasCustomOrder should be false now
	if om.HasCustomOrder("/manga/folder") {
		t.Error("HasCustomOrder should be false after reset")
	}
}

func TestOrdersManager_Reset_NotFound(t *testing.T) {
	withTempDir(t)
	om := NewOrdersManager()

	err := om.Reset("/nonexistent")
	if err != nil {
		t.Fatalf("Reset() unexpected error: %v", err)
	}
}

// ---------- Remove ----------

func TestOrdersManager_Remove(t *testing.T) {
	withTempDir(t)
	om := NewOrdersManager()

	om.Save("/manga/folder", []string{"img.jpg"}, nil)

	err := om.Remove("/manga/folder")
	if err != nil {
		t.Fatalf("Remove() error = %v", err)
	}

	if om.Get("/manga/folder") != nil {
		t.Error("Get should return nil after Remove")
	}
}

func TestOrdersManager_Remove_NotFound(t *testing.T) {
	withTempDir(t)
	om := NewOrdersManager()

	err := om.Remove("/nonexistent")
	if err != nil {
		t.Fatalf("Remove() unexpected error: %v", err)
	}
}

// ---------- Save / Load ----------

func TestOrdersManager_SaveAndLoad(t *testing.T) {
	tmp := withTempDir(t)
	om := NewOrdersManager()

	om.Save("/manga/a", []string{"x.jpg", "y.jpg"}, []string{"y.jpg", "x.jpg"})

	om2 := NewOrdersManager()
	loaded := om2.Get("/manga/a")
	if loaded == nil {
		t.Fatal("Get returned nil after reload")
	}
	if len(loaded.CustomOrder) != 2 {
		t.Errorf("expected 2 items, got %d", len(loaded.CustomOrder))
	}
	if loaded.CustomOrder[0] != "x.jpg" {
		t.Errorf("CustomOrder[0] = %q", loaded.CustomOrder[0])
	}

	if _, err := os.Stat(tmp + "/" + ordersFile); os.IsNotExist(err) {
		t.Error("orders.json not found")
	}
}

// ---------- GetOrder prefers custom ----------

func TestOrdersManager_GetOrder_PrefersCustom(t *testing.T) {
	withTempDir(t)
	om := NewOrdersManager()

	om.SetOriginalOrder("/folder", []string{"a.jpg", "b.jpg"})
	om.Save("/folder", []string{"b.jpg", "a.jpg"}, nil)

	got := om.GetOrder("/folder")
	if got[0] != "b.jpg" {
		t.Errorf("expected custom order first, got %v", got)
	}
}

// ---------- Save preserves existing original order ----------

func TestOrdersManager_Save_PreservesOriginalOrder(t *testing.T) {
	withTempDir(t)
	om := NewOrdersManager()

	// Set original order first
	om.SetOriginalOrder("/folder", []string{"1.jpg", "2.jpg", "3.jpg"})

	// Then save with custom order and nil original — should keep existing original
	om.Save("/folder", []string{"3.jpg", "2.jpg", "1.jpg"}, nil)

	loaded := om.Get("/folder")
	if loaded == nil {
		t.Fatal("Get returned nil")
	}
	if len(loaded.OriginalOrder) != 3 {
		t.Errorf("expected 3 original items, got %d", len(loaded.OriginalOrder))
	}
	if loaded.OriginalOrder[0] != "1.jpg" {
		t.Errorf("OriginalOrder[0] = %q, want \"1.jpg\"", loaded.OriginalOrder[0])
	}
}
