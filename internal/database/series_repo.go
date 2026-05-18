package database

import (
	"crypto/md5"
	"fmt"
	"manga-visor/internal/persistence"
	"sort"
	"sync"
)

type SeriesRepository struct {
	db      *Database
	entries []persistence.SeriesEntry
	mu      sync.RWMutex
}

func NewSeriesRepository(db *Database) *SeriesRepository {
	r := &SeriesRepository{db: db}
	if err := r.Load(); err != nil {
		r.entries = []persistence.SeriesEntry{}
	}
	return r
}

func (r *SeriesRepository) GetAll() []persistence.SeriesEntry {
	r.mu.RLock()
	defer r.mu.RUnlock()
	cp := make([]persistence.SeriesEntry, len(r.entries))
	copy(cp, r.entries)
	return cp
}

func (r *SeriesRepository) Get(path string) *persistence.SeriesEntry {
	r.mu.RLock()
	defer r.mu.RUnlock()
	id := seriesID(path)
	for _, e := range r.entries {
		if e.ID == id {
			cp := e
			return &cp
		}
	}
	return nil
}

func (r *SeriesRepository) Add(entry persistence.SeriesEntry) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if entry.ID == "" {
		entry.ID = seriesID(entry.Path)
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
		return r.entries[i].Name < r.entries[j].Name
	})

	return r.writeAll()
}

func (r *SeriesRepository) Remove(path string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	id := seriesID(path)
	filtered := make([]persistence.SeriesEntry, 0, len(r.entries))
	for _, e := range r.entries {
		if e.ID != id {
			filtered = append(filtered, e)
		}
	}
	r.entries = filtered

	_, err := r.db.db.Exec("DELETE FROM series_entries WHERE id = ?", id)
	return err
}

func (r *SeriesRepository) Clear() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.entries = nil
	_, err := r.db.db.Exec("DELETE FROM series_entries")
	return err
}

func (r *SeriesRepository) Load() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	rows, err := r.db.db.Query(`SELECT id, path, name, cover_image, added_at, is_temporary FROM series_entries ORDER BY name`)
	if err != nil {
		return fmt.Errorf("query series: %w", err)
	}
	defer rows.Close()

	entriesMap := make(map[string]*persistence.SeriesEntry)
	var orderedIDs []string

	for rows.Next() {
		var e persistence.SeriesEntry
		if err := rows.Scan(&e.ID, &e.Path, &e.Name, &e.CoverImage, &e.AddedAt, &e.IsTemporary); err != nil {
			return fmt.Errorf("scan series: %w", err)
		}
		e.Chapters = []persistence.ChapterInfo{}
		entriesMap[e.ID] = &e
		orderedIDs = append(orderedIDs, e.ID)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	chapterRows, err := r.db.db.Query(`SELECT series_id, path, name, cover_image, image_count FROM series_chapters ORDER BY id`)
	if err != nil {
		return fmt.Errorf("query chapters: %w", err)
	}
	defer chapterRows.Close()

	for chapterRows.Next() {
		var seriesID string
		var ch persistence.ChapterInfo
		if err := chapterRows.Scan(&seriesID, &ch.Path, &ch.Name, &ch.CoverImage, &ch.ImageCount); err != nil {
			return fmt.Errorf("scan chapter: %w", err)
		}
		if entry, ok := entriesMap[seriesID]; ok {
			entry.Chapters = append(entry.Chapters, ch)
		}
	}
	if err := chapterRows.Err(); err != nil {
		return err
	}

	var entries []persistence.SeriesEntry
	for _, id := range orderedIDs {
		if e, ok := entriesMap[id]; ok {
			entries = append(entries, *e)
		}
	}
	if entries == nil {
		entries = []persistence.SeriesEntry{}
	}
	r.entries = entries
	return nil
}

func (r *SeriesRepository) writeAll() error {
	tx, err := r.db.db.Begin()
	if err != nil {
		return fmt.Errorf("begin series tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM series_chapters"); err != nil {
		return fmt.Errorf("clear chapters: %w", err)
	}
	if _, err := tx.Exec("DELETE FROM series_entries"); err != nil {
		return fmt.Errorf("clear series: %w", err)
	}

	entryStmt, err := tx.Prepare(`INSERT INTO series_entries (id, path, name, cover_image, added_at, is_temporary) VALUES (?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return fmt.Errorf("prepare series stmt: %w", err)
	}
	defer entryStmt.Close()

	chapterStmt, err := tx.Prepare(`INSERT INTO series_chapters (series_id, path, name, cover_image, image_count) VALUES (?, ?, ?, ?, ?)`)
	if err != nil {
		return fmt.Errorf("prepare chapter stmt: %w", err)
	}
	defer chapterStmt.Close()

	for _, e := range r.entries {
		if _, err := entryStmt.Exec(e.ID, e.Path, e.Name, e.CoverImage, e.AddedAt, e.IsTemporary); err != nil {
			return fmt.Errorf("insert series %s: %w", e.ID, err)
		}
		for _, ch := range e.Chapters {
			if _, err := chapterStmt.Exec(e.ID, ch.Path, ch.Name, ch.CoverImage, ch.ImageCount); err != nil {
				return fmt.Errorf("insert chapter: %w", err)
			}
		}
	}

	return tx.Commit()
}

func seriesID(path string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(path)))
}
