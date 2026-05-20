package database

import (
	"crypto/md5"
	"fmt"
	"manga-visor/internal/persistence"
	"sort"
	"sync"
)

type LibraryRepository struct {
	db      *Database
	entries []persistence.LibraryEntry
	mu      sync.RWMutex
}

func NewLibraryRepository(db *Database) *LibraryRepository {
	r := &LibraryRepository{db: db}
	if err := r.Load(); err != nil {
		r.entries = []persistence.LibraryEntry{}
	}
	return r
}

func (r *LibraryRepository) GetAll() []persistence.LibraryEntry {
	r.mu.RLock()
	defer r.mu.RUnlock()
	cp := make([]persistence.LibraryEntry, len(r.entries))
	copy(cp, r.entries)
	return cp
}

func (r *LibraryRepository) Get(folderPath string) *persistence.LibraryEntry {
	r.mu.RLock()
	defer r.mu.RUnlock()
	id := libraryID(folderPath)
	for _, e := range r.entries {
		if e.ID == id {
			cp := e
			return &cp
		}
	}
	return nil
}

func (r *LibraryRepository) Add(entry persistence.LibraryEntry) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if entry.ID == "" {
		entry.ID = libraryID(entry.FolderPath)
	}

	found := false
	for i, e := range r.entries {
		if e.ID == entry.ID {
			r.entries[i] = entry
			found = true
			break
		}
	}
	if !found {
		r.entries = append(r.entries, entry)
	}

	sort.Slice(r.entries, func(i, j int) bool {
		return r.entries[i].FolderName < r.entries[j].FolderName
	})

	return r.writeAll()
}

func (r *LibraryRepository) Remove(folderPath string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	id := libraryID(folderPath)
	filtered := make([]persistence.LibraryEntry, 0, len(r.entries))
	for _, e := range r.entries {
		if e.ID != id {
			filtered = append(filtered, e)
		}
	}
	r.entries = filtered

	_, err := r.db.db.Exec("DELETE FROM library_entries WHERE id = ?", id)
	return err
}

func (r *LibraryRepository) Clear() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.entries = nil
	_, err := r.db.db.Exec("DELETE FROM library_entries")
	return err
}

func (r *LibraryRepository) SetDB(db *Database) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.db = db
}

func (r *LibraryRepository) Load() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	rows, err := r.db.db.Query(`SELECT id, folder_path, folder_name, total_images, added_at, cover_image, is_temporary FROM library_entries ORDER BY folder_name`)
	if err != nil {
		return fmt.Errorf("query library: %w", err)
	}
	defer rows.Close()

	var entries []persistence.LibraryEntry
	for rows.Next() {
		var e persistence.LibraryEntry
		if err := rows.Scan(&e.ID, &e.FolderPath, &e.FolderName, &e.TotalImages, &e.AddedAt, &e.CoverImage, &e.IsTemporary); err != nil {
			return fmt.Errorf("scan library: %w", err)
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if entries == nil {
		entries = []persistence.LibraryEntry{}
	}
	r.entries = entries
	return nil
}

func (r *LibraryRepository) writeAll() error {
	tx, err := r.db.db.Begin()
	if err != nil {
		return fmt.Errorf("begin library tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM library_entries"); err != nil {
		return fmt.Errorf("clear library: %w", err)
	}

	stmt, err := tx.Prepare(`INSERT INTO library_entries (id, folder_path, folder_name, total_images, added_at, cover_image, is_temporary) VALUES (?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return fmt.Errorf("prepare library stmt: %w", err)
	}
	defer stmt.Close()

	for _, e := range r.entries {
		if _, err := stmt.Exec(e.ID, e.FolderPath, e.FolderName, e.TotalImages, e.AddedAt, e.CoverImage, e.IsTemporary); err != nil {
			return fmt.Errorf("insert library %s: %w", e.ID, err)
		}
	}

	return tx.Commit()
}

func libraryID(folderPath string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(folderPath)))
}
