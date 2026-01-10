package persistence

import (
	"sync"
)

const viewerStatesFile = "viewer_states.json"

// ViewerState represents the saved state for a viewer at a specific folder
type ViewerState struct {
	CurrentIndex  int    `json:"currentIndex"`
	Mode          string `json:"mode"` // "vertical" or "lateral"
	VerticalWidth int    `json:"verticalWidth"`
}

// ViewerStatesManager handles viewer states persistence
type ViewerStatesManager struct {
	states map[string]*ViewerState // key is folder path
	mu     sync.RWMutex
}

// NewViewerStatesManager creates a new viewer states manager
func NewViewerStatesManager() *ViewerStatesManager {
	vsm := &ViewerStatesManager{
		states: make(map[string]*ViewerState),
	}
	vsm.Load()
	return vsm
}

// GetState returns the viewer state for a folder path
func (vsm *ViewerStatesManager) GetState(folderPath string) *ViewerState {
	vsm.mu.RLock()
	defer vsm.mu.RUnlock()

	if state, ok := vsm.states[folderPath]; ok {
		// Return a copy
		return &ViewerState{
			CurrentIndex:  state.CurrentIndex,
			Mode:          state.Mode,
			VerticalWidth: state.VerticalWidth,
		}
	}

	// Return default state if not found
	return &ViewerState{
		CurrentIndex: 0,
		Mode:         "vertical",
	}
}

// SaveState saves the viewer state for a folder path
func (vsm *ViewerStatesManager) SaveState(folderPath string, state *ViewerState) error {
	vsm.mu.Lock()
	vsm.states[folderPath] = state
	vsm.mu.Unlock()

	return vsm.Save()
}

// UpdateState updates only the provided fields for a folder path
func (vsm *ViewerStatesManager) UpdateState(folderPath string, currentIndex int, verticalWidth int) error {
	vsm.mu.Lock()

	existing, ok := vsm.states[folderPath]
	if !ok {
		existing = &ViewerState{Mode: "vertical"}
	}
	existing.CurrentIndex = currentIndex
	if verticalWidth > 0 {
		existing.VerticalWidth = verticalWidth
	}
	vsm.states[folderPath] = existing

	vsm.mu.Unlock()

	return vsm.Save()
}

// Load loads the viewer states from disk
func (vsm *ViewerStatesManager) Load() error {
	vsm.mu.Lock()
	defer vsm.mu.Unlock()

	if !fileExists(viewerStatesFile) {
		return nil
	}

	states := make(map[string]*ViewerState)
	if err := loadJSON(viewerStatesFile, &states); err != nil {
		return err
	}

	vsm.states = states
	return nil
}

// Save saves the viewer states to disk
func (vsm *ViewerStatesManager) Save() error {
	vsm.mu.RLock()
	states := make(map[string]*ViewerState, len(vsm.states))
	for k, v := range vsm.states {
		states[k] = v
	}
	vsm.mu.RUnlock()

	return saveJSON(viewerStatesFile, states)
}
