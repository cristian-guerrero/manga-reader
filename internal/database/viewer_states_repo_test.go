package database

import (
	"testing"

	"manga-visor/internal/persistence"
)

func TestNewViewerStatesRepository(t *testing.T) {
	db := newTestDB(t)
	r := NewViewerStatesRepository(db)
	if r == nil {
		t.Fatal("NewViewerStatesRepository returned nil")
	}
}

func TestViewerStatesRepository_GetState_Default(t *testing.T) {
	db := newTestDB(t)
	r := NewViewerStatesRepository(db)

	state := r.GetState("/nonexistent")
	if state == nil {
		t.Fatal("GetState() should return default, not nil")
	}
	if state.Mode != "vertical" {
		t.Errorf("Mode = %q, want %q", state.Mode, "vertical")
	}
}

func TestViewerStatesRepository_SaveAndGetState(t *testing.T) {
	db := newTestDB(t)
	r := NewViewerStatesRepository(db)

	state := &persistence.ViewerState{
		CurrentIndex:   5,
		Mode:           "lateral",
		VerticalWidth:  800,
		ScrollPosition: 0.5,
	}

	if err := r.SaveState("/manga/test", state); err != nil {
		t.Fatalf("SaveState() error = %v", err)
	}

	got := r.GetState("/manga/test")
	if got.CurrentIndex != 5 {
		t.Errorf("CurrentIndex = %d, want %d", got.CurrentIndex, 5)
	}
	if got.Mode != "lateral" {
		t.Errorf("Mode = %q, want %q", got.Mode, "lateral")
	}
	if got.VerticalWidth != 800 {
		t.Errorf("VerticalWidth = %d, want %d", got.VerticalWidth, 800)
	}
	if got.ScrollPosition != 0.5 {
		t.Errorf("ScrollPosition = %f, want %f", got.ScrollPosition, 0.5)
	}
}

func TestViewerStatesRepository_GetState_ReturnsCopy(t *testing.T) {
	db := newTestDB(t)
	r := NewViewerStatesRepository(db)

	r.SaveState("/manga/test", &persistence.ViewerState{CurrentIndex: 1, Mode: "vertical"})

	got := r.GetState("/manga/test")
	got.CurrentIndex = 99
	if r.GetState("/manga/test").CurrentIndex != 1 {
		t.Error("modifying returned copy should not affect internal state")
	}
}

func TestViewerStatesRepository_UpdateState(t *testing.T) {
	db := newTestDB(t)
	r := NewViewerStatesRepository(db)

	if err := r.UpdateState("/manga/test", 10, 1200, 0.75); err != nil {
		t.Fatalf("UpdateState() error = %v", err)
	}

	state := r.GetState("/manga/test")
	if state.CurrentIndex != 10 || state.VerticalWidth != 1200 || state.ScrollPosition != 0.75 {
		t.Errorf("state = %+v", state)
	}
}

func TestViewerStatesRepository_Persistence(t *testing.T) {
	db := newTestDB(t)
	r := NewViewerStatesRepository(db)

	r.SaveState("/manga/test", &persistence.ViewerState{CurrentIndex: 3, Mode: "lateral"})

	r2 := NewViewerStatesRepository(db)
	got := r2.GetState("/manga/test")
	if got.CurrentIndex != 3 || got.Mode != "lateral" {
		t.Error("state should persist across instances")
	}
}

func TestViewerStatesRepository_SetDB(t *testing.T) {
	db1 := newTestDB(t)
	db2 := newTestDB(t)

	r := NewViewerStatesRepository(db1)
	r.SaveState("/manga/test", &persistence.ViewerState{CurrentIndex: 1, Mode: "vertical"})

	r.SetDB(db2)
	r.Load()
	got := r.GetState("/manga/test")
	if got.Mode != "vertical" || got.CurrentIndex != 0 {
		t.Error("after SetDB+Load, should return default state")
	}
}
