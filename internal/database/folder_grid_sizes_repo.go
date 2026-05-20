package database

import (
	"crypto/md5"
	"fmt"
	"manga-visor/internal/persistence"
	"sync"
	"time"
)

type FolderGridSizeRepository struct {
	db   *Database
	sizes map[string]persistence.FolderGridSize
	mu   sync.RWMutex
}

func (r *FolderGridSizeRepository) SetDB(db *Database) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.db = db
}

func NewFolderGridSizeRepository(db *Database) *FolderGridSizeRepository {
	r := &FolderGridSizeRepository{db: db, sizes: make(map[string]persistence.FolderGridSize)}
	if err := r.Load(); err != nil {
		r.sizes = make(map[string]persistence.FolderGridSize)
	}
	return r
}

func (r *FolderGridSizeRepository) Get(parentPath string) *int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	hash := folderGridSizeHash(parentPath)
	if s, ok := r.sizes[hash]; ok {
		return &s.GridSize
	}
	return nil
}

func (r *FolderGridSizeRepository) Set(parentPath string, gridSize int) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	hash := folderGridSizeHash(parentPath)
	r.sizes[hash] = persistence.FolderGridSize{
		ParentPath: parentPath,
		GridSize:   gridSize,
		ModifiedAt: time.Now().UTC().Format(time.RFC3339),
	}

	_, err := r.db.db.Exec(`INSERT OR REPLACE INTO folder_grid_sizes (parent_path, grid_size, modified_at) VALUES (?, ?, ?)`, parentPath, gridSize, r.sizes[hash].ModifiedAt)
	return err
}

func (r *FolderGridSizeRepository) Remove(parentPath string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	hash := folderGridSizeHash(parentPath)
	delete(r.sizes, hash)

	_, err := r.db.db.Exec("DELETE FROM folder_grid_sizes WHERE parent_path = ?", parentPath)
	return err
}

func (r *FolderGridSizeRepository) Load() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	rows, err := r.db.db.Query("SELECT parent_path, grid_size, modified_at FROM folder_grid_sizes")
	if err != nil {
		return fmt.Errorf("query folder grid sizes: %w", err)
	}
	defer rows.Close()

	r.sizes = make(map[string]persistence.FolderGridSize)
	for rows.Next() {
		var s persistence.FolderGridSize
		if err := rows.Scan(&s.ParentPath, &s.GridSize, &s.ModifiedAt); err != nil {
			return fmt.Errorf("scan folder grid size: %w", err)
		}
		hash := folderGridSizeHash(s.ParentPath)
		r.sizes[hash] = s
	}
	if err := rows.Err(); err != nil {
		return err
	}

	return nil
}

func folderGridSizeHash(path string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(path)))
}
