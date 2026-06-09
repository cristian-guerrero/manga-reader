package database

import (
	"crypto/md5"
	"fmt"
	"sort"
	"sync"
	"time"
)

const maxRecentFolders = 50

type RecentFolder struct {
	FolderPath string `json:"folderPath"`
	FolderName string `json:"folderName"`
	VisitedAt  string `json:"visitedAt"`
}

type RecentlyVisitedRepository struct {
	db      *Database
	entries []RecentFolder
	mu      sync.RWMutex
}

func NewRecentlyVisitedRepository(db *Database) *RecentlyVisitedRepository {
	r := &RecentlyVisitedRepository{db: db}
	if err := r.Load(); err != nil {
		r.entries = []RecentFolder{}
	}
	return r
}

func (r *RecentlyVisitedRepository) GetAll() []RecentFolder {
	r.mu.RLock()
	defer r.mu.RUnlock()
	cp := make([]RecentFolder, len(r.entries))
	copy(cp, r.entries)
	return cp
}

func (r *RecentlyVisitedRepository) Add(folderPath, folderName string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now().UTC().Format(time.RFC3339)
	id := recentFolderID(folderPath)

	found := false
	for i, e := range r.entries {
		if recentFolderID(e.FolderPath) == id {
			r.entries[i].VisitedAt = now
			found = true
			break
		}
	}
	if !found {
		r.entries = append(r.entries, RecentFolder{
			FolderPath: folderPath,
			FolderName: folderName,
			VisitedAt:  now,
		})
	}

	sort.Slice(r.entries, func(i, j int) bool {
		return r.entries[i].VisitedAt > r.entries[j].VisitedAt
	})

	if len(r.entries) > maxRecentFolders {
		r.entries = r.entries[:maxRecentFolders]
	}

	return r.writeAll()
}

func (r *RecentlyVisitedRepository) Remove(folderPath string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	id := recentFolderID(folderPath)
	filtered := make([]RecentFolder, 0, len(r.entries))
	for _, e := range r.entries {
		if recentFolderID(e.FolderPath) != id {
			filtered = append(filtered, e)
		}
	}
	r.entries = filtered

	_, err := r.db.db.Exec("DELETE FROM recently_visited WHERE folder_path = ?", folderPath)
	return err
}

func (r *RecentlyVisitedRepository) Clear() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.entries = nil
	_, err := r.db.db.Exec("DELETE FROM recently_visited")
	return err
}

func (r *RecentlyVisitedRepository) SetDB(db *Database) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.db = db
}

func (r *RecentlyVisitedRepository) Load() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	rows, err := r.db.db.Query(`SELECT folder_path, folder_name, visited_at FROM recently_visited ORDER BY visited_at DESC`)
	if err != nil {
		return fmt.Errorf("query recently_visited: %w", err)
	}
	defer rows.Close()

	var entries []RecentFolder
	for rows.Next() {
		var e RecentFolder
		if err := rows.Scan(&e.FolderPath, &e.FolderName, &e.VisitedAt); err != nil {
			return fmt.Errorf("scan recently_visited: %w", err)
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if entries == nil {
		entries = []RecentFolder{}
	}
	r.entries = entries
	return nil
}

func (r *RecentlyVisitedRepository) writeAll() error {
	tx, err := r.db.db.Begin()
	if err != nil {
		return fmt.Errorf("begin recently_visited tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM recently_visited"); err != nil {
		return fmt.Errorf("clear recently_visited: %w", err)
	}

	stmt, err := tx.Prepare(`INSERT INTO recently_visited (folder_path, folder_name, visited_at) VALUES (?, ?, ?)`)
	if err != nil {
		return fmt.Errorf("prepare recently_visited stmt: %w", err)
	}
	defer stmt.Close()

	for _, e := range r.entries {
		if _, err := stmt.Exec(e.FolderPath, e.FolderName, e.VisitedAt); err != nil {
			return fmt.Errorf("insert recently_visited %s: %w", e.FolderPath, err)
		}
	}

	return tx.Commit()
}

func recentFolderID(folderPath string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(folderPath)))
}
