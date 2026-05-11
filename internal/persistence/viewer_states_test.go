package persistence

import (
	"os"
	"testing"
)

// ---------- NewViewerStatesManager ----------

func TestNewViewerStatesManager(t *testing.T) {
	withTempDir(t)
	vsm := NewViewerStatesManager()
	if vsm == nil {
		t.Fatal("NewViewerStatesManager returned nil")
	}
}

// ---------- GetState ----------

func TestViewerStates_GetState_Default(t *testing.T) {
	withTempDir(t)
	vsm := NewViewerStatesManager()

	state := vsm.GetState("/nonexistent")
	if state == nil {
		t.Fatal("GetState returned nil for nonexistent path")
	}
	if state.CurrentIndex != 0 {
		t.Errorf("CurrentIndex = %d, want 0", state.CurrentIndex)
	}
	if state.Mode != "vertical" {
		t.Errorf("Mode = %q, want %q", state.Mode, "vertical")
	}
	if state.ScrollPosition != 0 {
		t.Errorf("ScrollPosition = %f, want 0", state.ScrollPosition)
	}
}

// ---------- SaveState ----------

func TestViewerStates_SaveState(t *testing.T) {
	withTempDir(t)
	vsm := NewViewerStatesManager()

	state := &ViewerState{
		CurrentIndex:   42,
		Mode:           "lateral",
		VerticalWidth:  80,
		ScrollPosition: 0.5,
	}
	err := vsm.SaveState("/manga/folder", state)
	if err != nil {
		t.Fatalf("SaveState() error = %v", err)
	}

	loaded := vsm.GetState("/manga/folder")
	if loaded.CurrentIndex != 42 {
		t.Errorf("CurrentIndex = %d, want %d", loaded.CurrentIndex, 42)
	}
	if loaded.Mode != "lateral" {
		t.Errorf("Mode = %q", loaded.Mode)
	}
	if loaded.VerticalWidth != 80 {
		t.Errorf("VerticalWidth = %d", loaded.VerticalWidth)
	}
	if loaded.ScrollPosition != 0.5 {
		t.Errorf("ScrollPosition = %f", loaded.ScrollPosition)
	}
}

// ---------- UpdateState ----------

func TestViewerStates_UpdateState(t *testing.T) {
	withTempDir(t)
	vsm := NewViewerStatesManager()

	err := vsm.UpdateState("/manga/folder", 99, 60, 0.75)
	if err != nil {
		t.Fatalf("UpdateState() error = %v", err)
	}

	loaded := vsm.GetState("/manga/folder")
	if loaded.CurrentIndex != 99 {
		t.Errorf("CurrentIndex = %d", loaded.CurrentIndex)
	}
	if loaded.VerticalWidth != 60 {
		t.Errorf("VerticalWidth = %d", loaded.VerticalWidth)
	}
	if loaded.ScrollPosition != 0.75 {
		t.Errorf("ScrollPosition = %f", loaded.ScrollPosition)
	}
	// Mode should default to "vertical" when UpdateState creates a new entry
	if loaded.Mode != "vertical" {
		t.Errorf("Mode = %q, want %q", loaded.Mode, "vertical")
	}
}

func TestViewerStates_UpdateState_Existing(t *testing.T) {
	withTempDir(t)
	vsm := NewViewerStatesManager()

	vsm.SaveState("/manga/folder", &ViewerState{
		CurrentIndex:   10,
		Mode:           "lateral",
		VerticalWidth:  70,
		ScrollPosition: 0.2,
	})

	// Update only index and scroll, not vertical width (0 means no change)
	err := vsm.UpdateState("/manga/folder", 20, 0, 0.8)
	if err != nil {
		t.Fatalf("UpdateState() error = %v", err)
	}

	loaded := vsm.GetState("/manga/folder")
	if loaded.CurrentIndex != 20 {
		t.Errorf("CurrentIndex = %d", loaded.CurrentIndex)
	}
	if loaded.VerticalWidth != 70 {
		// verticalWidth=0 in UpdateState means "don't change" for existing entries
		t.Errorf("VerticalWidth = %d, want 70 (preserved)", loaded.VerticalWidth)
	}
	if loaded.ScrollPosition != 0.8 {
		t.Errorf("ScrollPosition = %f", loaded.ScrollPosition)
	}
}

// ---------- GetState returns copy ----------

func TestViewerStates_GetState_ReturnsCopy(t *testing.T) {
	withTempDir(t)
	vsm := NewViewerStatesManager()

	vsm.SaveState("/folder", &ViewerState{CurrentIndex: 1, Mode: "vertical"})

	got1 := vsm.GetState("/folder")
	got1.CurrentIndex = 999

	got2 := vsm.GetState("/folder")
	if got2.CurrentIndex == 999 {
		t.Error("modifying returned state should not affect internal state")
	}
}

// ---------- Save / Load ----------

func TestViewerStates_SaveAndLoad(t *testing.T) {
	tmp := withTempDir(t)
	vsm := NewViewerStatesManager()

	vsm.SaveState("/manga/a", &ViewerState{CurrentIndex: 5, Mode: "lateral"})
	vsm.SaveState("/manga/b", &ViewerState{CurrentIndex: 10, Mode: "vertical"})

	// Create new manager that loads from disk
	vsm2 := NewViewerStatesManager()

	s1 := vsm2.GetState("/manga/a")
	if s1.CurrentIndex != 5 {
		t.Errorf("CurrentIndex = %d, want %d", s1.CurrentIndex, 5)
	}

	s2 := vsm2.GetState("/manga/b")
	if s2.CurrentIndex != 10 {
		t.Errorf("CurrentIndex = %d, want %d", s2.CurrentIndex, 10)
	}

	// Default for unset path
	s3 := vsm2.GetState("/manga/c")
	if s3.CurrentIndex != 0 {
		t.Errorf("CurrentIndex = %d, want 0", s3.CurrentIndex)
	}

	if _, err := os.Stat(tmp + "/" + viewerStatesFile); os.IsNotExist(err) {
		t.Error("viewer_states.json not found")
	}
}
