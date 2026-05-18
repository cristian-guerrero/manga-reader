package database

import (
	"fmt"
	"manga-visor/internal/persistence"
	"sync"
)

type ExplorerRepository struct {
	db      *Database
	folders []persistence.BaseFolder
	mu      sync.RWMutex
}

func NewExplorerRepository(db *Database) *ExplorerRepository {
	r := &ExplorerRepository{db: db}
	if err := r.Load(); err != nil {
		r.folders = []persistence.BaseFolder{}
	}
	return r
}

func (r *ExplorerRepository) GetAll() []persistence.BaseFolder {
	r.mu.RLock()
	defer r.mu.RUnlock()
	cp := make([]persistence.BaseFolder, len(r.folders))
	copy(cp, r.folders)
	return cp
}

func (r *ExplorerRepository) Add(folder persistence.BaseFolder) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, f := range r.folders {
		if f.Path == folder.Path {
			return nil
		}
	}
	r.folders = append(r.folders, folder)

	return r.writeAll()
}

func (r *ExplorerRepository) Remove(path string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	filtered := make([]persistence.BaseFolder, 0, len(r.folders))
	for _, f := range r.folders {
		if f.Path != path {
			filtered = append(filtered, f)
		}
	}
	r.folders = filtered

	_, err := r.db.db.Exec("DELETE FROM explorer_folders WHERE path = ?", path)
	return err
}

func (r *ExplorerRepository) UpdateCoverImage(path string, coverImage string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for i, f := range r.folders {
		if f.Path == path {
			r.folders[i].CoverImage = coverImage
			break
		}
	}

	_, err := r.db.db.Exec("UPDATE explorer_folders SET cover_image = ? WHERE path = ?", coverImage, path)
	return err
}

func (r *ExplorerRepository) Load() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	rows, err := r.db.db.Query(`SELECT path, name, added_at, is_visible, cover_image FROM explorer_folders`)
	if err != nil {
		return fmt.Errorf("query explorer folders: %w", err)
	}
	defer rows.Close()

	var folders []persistence.BaseFolder
	for rows.Next() {
		var f persistence.BaseFolder
		if err := rows.Scan(&f.Path, &f.Name, &f.AddedAt, &f.IsVisible, &f.CoverImage); err != nil {
			return fmt.Errorf("scan explorer folder: %w", err)
		}
		folders = append(folders, f)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if folders == nil {
		folders = []persistence.BaseFolder{}
	}
	r.folders = folders
	return nil
}

func (r *ExplorerRepository) writeAll() error {
	tx, err := r.db.db.Begin()
	if err != nil {
		return fmt.Errorf("begin explorer tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM explorer_folders"); err != nil {
		return fmt.Errorf("clear explorer: %w", err)
	}

	stmt, err := tx.Prepare(`INSERT INTO explorer_folders (path, name, added_at, is_visible, cover_image) VALUES (?, ?, ?, ?, ?)`)
	if err != nil {
		return fmt.Errorf("prepare explorer stmt: %w", err)
	}
	defer stmt.Close()

	for _, f := range r.folders {
		visible := 0
		if f.IsVisible {
			visible = 1
		}
		if _, err := stmt.Exec(f.Path, f.Name, f.AddedAt, visible, f.CoverImage); err != nil {
			return fmt.Errorf("insert explorer folder: %w", err)
		}
	}

	return tx.Commit()
}
