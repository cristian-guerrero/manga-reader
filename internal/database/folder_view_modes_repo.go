package database

import (
	"crypto/md5"
	"fmt"
	"manga-visor/internal/persistence"
	"sync"
	"time"
)

type FolderViewModeRepository struct {
	db    *Database
	modes map[string]persistence.FolderViewMode
	mu    sync.RWMutex
}

func (r *FolderViewModeRepository) SetDB(db *Database) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.db = db
}

func NewFolderViewModeRepository(db *Database) *FolderViewModeRepository {
	r := &FolderViewModeRepository{db: db, modes: make(map[string]persistence.FolderViewMode)}
	if err := r.Load(); err != nil {
		r.modes = make(map[string]persistence.FolderViewMode)
	}
	return r
}

func (r *FolderViewModeRepository) Get(parentPath string) *string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	hash := folderViewModeHash(parentPath)
	if m, ok := r.modes[hash]; ok {
		return &m.ViewMode
	}
	return nil
}

func (r *FolderViewModeRepository) Set(parentPath, viewMode string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	hash := folderViewModeHash(parentPath)
	r.modes[hash] = persistence.FolderViewMode{
		ParentPath: parentPath,
		ViewMode:   viewMode,
		ModifiedAt: time.Now().UTC().Format(time.RFC3339),
	}

	_, err := r.db.db.Exec(`INSERT OR REPLACE INTO folder_view_modes (parent_path, view_mode, modified_at) VALUES (?, ?, ?)`, parentPath, viewMode, r.modes[hash].ModifiedAt)
	return err
}

func (r *FolderViewModeRepository) Remove(parentPath string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	hash := folderViewModeHash(parentPath)
	delete(r.modes, hash)

	_, err := r.db.db.Exec("DELETE FROM folder_view_modes WHERE parent_path = ?", parentPath)
	return err
}

func (r *FolderViewModeRepository) Load() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	rows, err := r.db.db.Query("SELECT parent_path, view_mode, modified_at FROM folder_view_modes")
	if err != nil {
		return fmt.Errorf("query folder view modes: %w", err)
	}
	defer rows.Close()

	r.modes = make(map[string]persistence.FolderViewMode)
	for rows.Next() {
		var m persistence.FolderViewMode
		if err := rows.Scan(&m.ParentPath, &m.ViewMode, &m.ModifiedAt); err != nil {
			return fmt.Errorf("scan folder view mode: %w", err)
		}
		hash := folderViewModeHash(m.ParentPath)
		r.modes[hash] = m
	}
	if err := rows.Err(); err != nil {
		return err
	}

	return nil
}

func folderViewModeHash(path string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(path)))
}
