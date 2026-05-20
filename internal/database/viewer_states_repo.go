package database

import (
	"fmt"
	"manga-visor/internal/persistence"
	"sync"
)

type ViewerStatesRepository struct {
	db     *Database
	states map[string]*persistence.ViewerState
	mu     sync.RWMutex
}

func (r *ViewerStatesRepository) SetDB(db *Database) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.db = db
}

func NewViewerStatesRepository(db *Database) *ViewerStatesRepository {
	r := &ViewerStatesRepository{db: db, states: make(map[string]*persistence.ViewerState)}
	if err := r.Load(); err != nil {
		r.states = make(map[string]*persistence.ViewerState)
	}
	return r
}

func (r *ViewerStatesRepository) GetState(folderPath string) *persistence.ViewerState {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if s, ok := r.states[folderPath]; ok {
		cp := *s
		return &cp
	}

	return &persistence.ViewerState{
		CurrentIndex:   0,
		Mode:           "vertical",
		VerticalWidth:  0,
		ScrollPosition: 0,
	}
}

func (r *ViewerStatesRepository) SaveState(folderPath string, state *persistence.ViewerState) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	cp := *state
	r.states[folderPath] = &cp

	_, err := r.db.db.Exec(`INSERT OR REPLACE INTO viewer_states (folder_path, current_index, mode, vertical_width, scroll_position) VALUES (?, ?, ?, ?, ?)`,
		folderPath, state.CurrentIndex, state.Mode, state.VerticalWidth, state.ScrollPosition)
	return err
}

func (r *ViewerStatesRepository) UpdateState(folderPath string, currentIndex int, verticalWidth int, scrollPosition float64) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, hasExisting := r.states[folderPath]
	if !hasExisting {
		existing = &persistence.ViewerState{Mode: "vertical"}
	}

	existing.CurrentIndex = currentIndex
	existing.VerticalWidth = verticalWidth
	existing.ScrollPosition = scrollPosition
	r.states[folderPath] = existing

	_, err := r.db.db.Exec(`INSERT OR REPLACE INTO viewer_states (folder_path, current_index, mode, vertical_width, scroll_position) VALUES (?, ?, ?, ?, ?)`,
		folderPath, existing.CurrentIndex, existing.Mode, existing.VerticalWidth, existing.ScrollPosition)
	return err
}

func (r *ViewerStatesRepository) Load() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	rows, err := r.db.db.Query("SELECT folder_path, current_index, mode, vertical_width, scroll_position FROM viewer_states")
	if err != nil {
		return fmt.Errorf("query viewer states: %w", err)
	}
	defer rows.Close()

	r.states = make(map[string]*persistence.ViewerState)
	for rows.Next() {
		var folderPath string
		var s persistence.ViewerState
		if err := rows.Scan(&folderPath, &s.CurrentIndex, &s.Mode, &s.VerticalWidth, &s.ScrollPosition); err != nil {
			return fmt.Errorf("scan viewer state: %w", err)
		}
		cp := s
		r.states[folderPath] = &cp
	}
	if err := rows.Err(); err != nil {
		return err
	}

	return nil
}
