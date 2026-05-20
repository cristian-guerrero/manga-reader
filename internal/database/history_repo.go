package database

import (
	"crypto/md5"
	"fmt"
	"manga-visor/internal/persistence"
	"sort"
	"sync"
	"time"
)

const maxHistoryEntries = 100

type HistoryRepository struct {
	db      *Database
	entries []persistence.HistoryEntry
	mu      sync.RWMutex
}

func NewHistoryRepository(db *Database) *HistoryRepository {
	r := &HistoryRepository{db: db}
	if err := r.Load(); err != nil {
		r.entries = []persistence.HistoryEntry{}
	}
	return r
}

func (r *HistoryRepository) GetAll() []persistence.HistoryEntry {
	r.mu.RLock()
	defer r.mu.RUnlock()
	cp := make([]persistence.HistoryEntry, len(r.entries))
	copy(cp, r.entries)
	return cp
}

func (r *HistoryRepository) Get(folderPath string) *persistence.HistoryEntry {
	r.mu.RLock()
	defer r.mu.RUnlock()
	id := historyID(folderPath)
	for _, e := range r.entries {
		if e.ID == id {
			cp := e
			return &cp
		}
	}
	return nil
}

func (r *HistoryRepository) Add(entry persistence.HistoryEntry) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if entry.ID == "" {
		entry.ID = historyID(entry.FolderPath)
	}
	if entry.LastRead == "" {
		entry.LastRead = time.Now().UTC().Format(time.RFC3339)
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
		return r.entries[i].LastRead > r.entries[j].LastRead
	})

	if len(r.entries) > maxHistoryEntries {
		r.entries = r.entries[:maxHistoryEntries]
	}

	return r.writeAll()
}

func (r *HistoryRepository) Remove(folderPath string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	id := historyID(folderPath)
	filtered := make([]persistence.HistoryEntry, 0, len(r.entries))
	for _, e := range r.entries {
		if e.ID != id {
			filtered = append(filtered, e)
		}
	}
	r.entries = filtered

	_, err := r.db.db.Exec("DELETE FROM history WHERE id = ?", id)
	return err
}

func (r *HistoryRepository) Clear() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.entries = nil
	_, err := r.db.db.Exec("DELETE FROM history")
	return err
}

func (r *HistoryRepository) SetDB(db *Database) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.db = db
}

func (r *HistoryRepository) Load() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	rows, err := r.db.db.Query(`SELECT id, folder_path, folder_name, last_image, last_image_index, scroll_position, total_images, last_read FROM history ORDER BY last_read DESC`)
	if err != nil {
		return fmt.Errorf("query history: %w", err)
	}
	defer rows.Close()

	var entries []persistence.HistoryEntry
	for rows.Next() {
		var e persistence.HistoryEntry
		if err := rows.Scan(&e.ID, &e.FolderPath, &e.FolderName, &e.LastImage, &e.LastImageIndex, &e.ScrollPosition, &e.TotalImages, &e.LastRead); err != nil {
			return fmt.Errorf("scan history: %w", err)
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if entries == nil {
		entries = []persistence.HistoryEntry{}
	}
	r.entries = entries
	return nil
}

func (r *HistoryRepository) writeAll() error {
	tx, err := r.db.db.Begin()
	if err != nil {
		return fmt.Errorf("begin history tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM history"); err != nil {
		return fmt.Errorf("clear history: %w", err)
	}

	stmt, err := tx.Prepare(`INSERT INTO history (id, folder_path, folder_name, last_image, last_image_index, scroll_position, total_images, last_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return fmt.Errorf("prepare history stmt: %w", err)
	}
	defer stmt.Close()

	for _, e := range r.entries {
		if _, err := stmt.Exec(e.ID, e.FolderPath, e.FolderName, e.LastImage, e.LastImageIndex, e.ScrollPosition, e.TotalImages, e.LastRead); err != nil {
			return fmt.Errorf("insert history %s: %w", e.ID, err)
		}
	}

	return tx.Commit()
}

func historyID(folderPath string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(folderPath)))
}
