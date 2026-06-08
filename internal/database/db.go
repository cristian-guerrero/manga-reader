package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"manga-visor/internal/persistence"

	_ "modernc.org/sqlite"
)

var (
	dbInstance     *Database
	dbInstanceOnce sync.Once
)

type Database struct {
	db      *sql.DB
	dataDir string
	mu      sync.RWMutex
}

func New(dataDir string) (*Database, error) {
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}

	dbPath := filepath.Join(dataDir, "manga-visor.db")
	sqlDB, err := sql.Open("sqlite", dbPath+"?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)")
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	sqlDB.SetMaxOpenConns(1)

	d := &Database{
		db:      sqlDB,
		dataDir: dataDir,
	}

	if err := d.migrate(); err != nil {
		sqlDB.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}

	return d, nil
}

func (d *Database) SQLDB() *sql.DB {
	return d.db
}

func (d *Database) DataDir() string {
	return d.dataDir
}

func (d *Database) Close() error {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.db.Close()
}

func (d *Database) migrate() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	tx, err := d.db.Begin()
	if err != nil {
		return fmt.Errorf("begin migration tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec(fullSchema); err != nil {
		return fmt.Errorf("create schema: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit migration: %w", err)
	}

	if err := d.migrateFromJSON(); err != nil {
		fmt.Printf("Warning: JSON migration error: %v\n", err)
	}

	return nil
}

func (d *Database) migrateFromJSON() error {
	var count int
	if err := d.db.QueryRow("SELECT COUNT(*) FROM settings").Scan(&count); err != nil {
		return fmt.Errorf("check settings count: %w", err)
	}
	if count > 0 {
		return nil
	}

	jsonFiles := map[string]struct {
		file    string
		migrate func(data []byte) error
	}{
		"settings":        {"settings.json", d.migrateSettingsJSON},
		"history":         {"history.json", d.migrateHistoryJSON},
		"library":         {"library.json", d.migrateLibraryJSON},
		"series":          {"series.json", d.migrateSeriesJSON},
		"explorer":        {"explorer.json", d.migrateExplorerJSON},
		"downloader":      {"downloader.json", d.migrateDownloaderJSON},
		"tabs":            {"tabs.json", d.migrateTabsJSON},
		"orders":          {"orders.json", d.migrateImageOrdersJSON},
		"folder_orders":   {"folder_orders.json", d.migrateFolderOrdersJSON},
		"folder_viewmodes": {"folder_viewmodes.json", d.migrateFolderViewModesJSON},
		"viewer_states":   {"viewer_states.json", d.migrateViewerStatesJSON},
	}

	anyMigrated := false
	for _, jf := range jsonFiles {
		path := filepath.Join(d.dataDir, jf.file)
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		if len(data) < 2 {
			continue
		}
		if err := jf.migrate(data); err != nil {
			fmt.Printf("Warning: migrate %s: %v\n", jf.file, err)
			continue
		}
		anyMigrated = true
	}

	if anyMigrated {
		fmt.Println("Successfully migrated JSON data to SQLite")
	}

	return nil
}

func (d *Database) migrateSettingsJSON(data []byte) error {
	var settings map[string]interface{}
	if err := json.Unmarshal(data, &settings); err != nil {
		return err
	}

	tx, err := d.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
	if err != nil {
		return err
	}
	defer stmt.Close()

	for key, value := range settings {
		var strVal string
		switch v := value.(type) {
		case string:
			strVal = v
		case float64:
			strVal = fmt.Sprintf("%v", v)
		case bool:
			strVal = fmt.Sprintf("%t", v)
		case map[string]interface{}:
			b, _ := json.Marshal(v)
			strVal = string(b)
		default:
			b, _ := json.Marshal(v)
			strVal = string(b)
		}
		if _, err := stmt.Exec(key, strVal); err != nil {
			return fmt.Errorf("insert setting %s: %w", key, err)
		}
	}

	return tx.Commit()
}

func (d *Database) migrateHistoryJSON(data []byte) error {
	var wrapper struct {
		Entries []persistence.HistoryEntry `json:"entries"`
	}
	if err := json.Unmarshal(data, &wrapper); err != nil {
		return err
	}

	tx, err := d.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT OR REPLACE INTO history (id, folder_path, folder_name, last_image, last_image_index, scroll_position, total_images, last_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, e := range wrapper.Entries {
		if _, err := stmt.Exec(e.ID, e.FolderPath, e.FolderName, e.LastImage, e.LastImageIndex, e.ScrollPosition, e.TotalImages, e.LastRead); err != nil {
			return fmt.Errorf("insert history: %w", err)
		}
	}

	return tx.Commit()
}

func (d *Database) migrateLibraryJSON(data []byte) error {
	var wrapper struct {
		Entries []persistence.LibraryEntry `json:"entries"`
	}
	if err := json.Unmarshal(data, &wrapper); err != nil {
		return err
	}

	tx, err := d.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT OR REPLACE INTO library_entries (id, folder_path, folder_name, total_images, added_at, cover_image, is_temporary) VALUES (?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, e := range wrapper.Entries {
		temp := 0
		if e.IsTemporary {
			temp = 1
		}
		if _, err := stmt.Exec(e.ID, e.FolderPath, e.FolderName, e.TotalImages, e.AddedAt, e.CoverImage, temp); err != nil {
			return fmt.Errorf("insert library: %w", err)
		}
	}

	return tx.Commit()
}

func (d *Database) migrateSeriesJSON(data []byte) error {
	var wrapper struct {
		Entries []persistence.SeriesEntry `json:"entries"`
	}
	if err := json.Unmarshal(data, &wrapper); err != nil {
		return err
	}

	tx, err := d.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	entryStmt, err := tx.Prepare(`INSERT OR REPLACE INTO series_entries (id, path, name, cover_image, added_at, is_temporary) VALUES (?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer entryStmt.Close()

	chapterStmt, err := tx.Prepare(`INSERT INTO series_chapters (series_id, path, name, cover_image, image_count) VALUES (?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer chapterStmt.Close()

	for _, e := range wrapper.Entries {
		temp := 0
		if e.IsTemporary {
			temp = 1
		}
		if _, err := entryStmt.Exec(e.ID, e.Path, e.Name, e.CoverImage, e.AddedAt, temp); err != nil {
			return fmt.Errorf("insert series: %w", err)
		}
		for _, ch := range e.Chapters {
			if _, err := chapterStmt.Exec(e.ID, ch.Path, ch.Name, ch.CoverImage, ch.ImageCount); err != nil {
				return fmt.Errorf("insert chapter: %w", err)
			}
		}
	}

	return tx.Commit()
}

func (d *Database) migrateExplorerJSON(data []byte) error {
	var folders []persistence.BaseFolder
	if err := json.Unmarshal(data, &folders); err != nil {
		return err
	}

	tx, err := d.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT OR REPLACE INTO explorer_folders (path, name, added_at, is_visible, cover_image) VALUES (?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, f := range folders {
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

func (d *Database) migrateDownloaderJSON(data []byte) error {
	var wrapper struct {
		Jobs []persistence.DownloadJob `json:"jobs"`
	}
	if err := json.Unmarshal(data, &wrapper); err != nil {
		return err
	}

	tx, err := d.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT OR REPLACE INTO download_jobs (id, url, site, series_name, chapter_name, status, progress, total_pages, error, created_at, completed_at, path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, j := range wrapper.Jobs {
		if _, err := stmt.Exec(j.ID, j.URL, j.Site, j.SeriesName, j.ChapterName, string(j.Status), j.Progress, j.TotalPages, j.Error, j.CreatedAt, j.CompletedAt, j.Path); err != nil {
			return fmt.Errorf("insert download job: %w", err)
		}
	}

	return tx.Commit()
}

func (d *Database) migrateTabsJSON(data []byte) error {
	var tabs persistence.TabsData
	if err := json.Unmarshal(data, &tabs); err != nil {
		return err
	}

	tabsJSON := "[]"
	if len(tabs.Tabs) > 0 {
		b, _ := json.Marshal(tabs.Tabs)
		tabsJSON = string(b)
	}

	_, err := d.db.Exec(`INSERT OR REPLACE INTO tabs (id, active_tab_id, data) VALUES ('tabs', ?, ?)`, tabs.ActiveTabID, tabsJSON)
	return err
}

func (d *Database) migrateImageOrdersJSON(data []byte) error {
	var wrapper struct {
		Data map[string]persistence.ImageOrder `json:"data"`
	}
	if err := json.Unmarshal(data, &wrapper); err != nil {
		return err
	}

	tx, err := d.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT OR REPLACE INTO image_orders (folder_path, custom_order, original_order, modified_at) VALUES (?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, o := range wrapper.Data {
		customJSON, _ := json.Marshal(o.CustomOrder)
		originalJSON, _ := json.Marshal(o.OriginalOrder)
		if _, err := stmt.Exec(o.FolderPath, string(customJSON), string(originalJSON), o.ModifiedAt); err != nil {
			return fmt.Errorf("insert image order: %w", err)
		}
	}

	return tx.Commit()
}

func (d *Database) migrateFolderOrdersJSON(data []byte) error {
	var wrapper struct {
		Data map[string]persistence.FolderOrder `json:"data"`
	}
	if err := json.Unmarshal(data, &wrapper); err != nil {
		return err
	}

	tx, err := d.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT OR REPLACE INTO folder_orders (parent_path, custom_order, auto_order, original_order, modified_at) VALUES (?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, o := range wrapper.Data {
		customJSON, _ := json.Marshal(o.CustomOrder)
		autoJSON, _ := json.Marshal(o.AutoOrder)
		originalJSON, _ := json.Marshal(o.OriginalOrder)
		if _, err := stmt.Exec(o.ParentPath, string(customJSON), string(autoJSON), string(originalJSON), o.ModifiedAt); err != nil {
			return fmt.Errorf("insert folder order: %w", err)
		}
	}

	return tx.Commit()
}

func (d *Database) migrateFolderViewModesJSON(data []byte) error {
	var wrapper struct {
		Data map[string]persistence.FolderViewMode `json:"data"`
	}
	if err := json.Unmarshal(data, &wrapper); err != nil {
		return err
	}

	tx, err := d.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT OR REPLACE INTO folder_view_modes (parent_path, view_mode, modified_at) VALUES (?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, m := range wrapper.Data {
		if _, err := stmt.Exec(m.ParentPath, m.ViewMode, m.ModifiedAt); err != nil {
			return fmt.Errorf("insert folder view mode: %w", err)
		}
	}

	return tx.Commit()
}

func (d *Database) migrateViewerStatesJSON(data []byte) error {
	var states map[string]*persistence.ViewerState
	if err := json.Unmarshal(data, &states); err != nil {
		return err
	}

	tx, err := d.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT OR REPLACE INTO viewer_states (folder_path, current_index, mode, vertical_width, scroll_position) VALUES (?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for path, s := range states {
		if _, err := stmt.Exec(path, s.CurrentIndex, s.Mode, s.VerticalWidth, s.ScrollPosition); err != nil {
			return fmt.Errorf("insert viewer state: %w", err)
		}
	}

	return tx.Commit()
}

// fullSchema creates ALL tables for a library database (including settings and ui_preferences)
var fullSchema = `
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ui_preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS explorer_folders (
    path TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    added_at TEXT NOT NULL,
    is_visible INTEGER NOT NULL DEFAULT 1,
    cover_image TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS library_entries (
    id TEXT PRIMARY KEY,
    folder_path TEXT UNIQUE NOT NULL,
    folder_name TEXT NOT NULL,
    total_images INTEGER NOT NULL DEFAULT 0,
    added_at TEXT NOT NULL,
    cover_image TEXT NOT NULL DEFAULT '',
    is_temporary INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS series_entries (
    id TEXT PRIMARY KEY,
    path TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    cover_image TEXT NOT NULL DEFAULT '',
    added_at TEXT NOT NULL,
    is_temporary INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS series_chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_id TEXT NOT NULL REFERENCES series_entries(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    name TEXT NOT NULL,
    cover_image TEXT NOT NULL DEFAULT '',
    image_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    folder_path TEXT UNIQUE NOT NULL,
    folder_name TEXT NOT NULL,
    last_image TEXT NOT NULL DEFAULT '',
    last_image_index INTEGER NOT NULL DEFAULT 0,
    scroll_position REAL NOT NULL DEFAULT 0,
    total_images INTEGER NOT NULL DEFAULT 0,
    last_read TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS download_jobs (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    site TEXT NOT NULL DEFAULT '',
    series_name TEXT NOT NULL DEFAULT '',
    chapter_name TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    progress INTEGER NOT NULL DEFAULT 0,
    total_pages INTEGER NOT NULL DEFAULT 0,
    error TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    completed_at TEXT,
    path TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tabs (
    id TEXT PRIMARY KEY,
    active_tab_id TEXT NOT NULL DEFAULT '',
    data TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS image_orders (
    folder_path TEXT PRIMARY KEY,
    custom_order TEXT NOT NULL DEFAULT '[]',
    original_order TEXT NOT NULL DEFAULT '[]',
    modified_at TEXT NOT NULL DEFAULT '',
    pinned_name TEXT NOT NULL DEFAULT '[]',
    pinned_date TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS folder_orders (
    parent_path TEXT PRIMARY KEY,
    custom_order TEXT NOT NULL DEFAULT '[]',
    auto_order TEXT NOT NULL DEFAULT '[]',
    original_order TEXT NOT NULL DEFAULT '[]',
    modified_at TEXT NOT NULL DEFAULT '',
    pinned_name TEXT NOT NULL DEFAULT '[]',
    pinned_date TEXT NOT NULL DEFAULT '[]',
    pinned_auto TEXT NOT NULL DEFAULT '[]',
    pinned_custom TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS folder_view_modes (
    parent_path TEXT PRIMARY KEY,
    view_mode TEXT NOT NULL,
    modified_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS viewer_states (
    folder_path TEXT PRIMARY KEY,
    current_index INTEGER NOT NULL DEFAULT 0,
    mode TEXT NOT NULL DEFAULT 'vertical',
    vertical_width INTEGER NOT NULL DEFAULT 0,
    scroll_position REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS folder_grid_sizes (
    parent_path TEXT PRIMARY KEY,
    grid_size INTEGER NOT NULL DEFAULT 200,
    modified_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS recently_visited (
    folder_path TEXT PRIMARY KEY,
    folder_name TEXT NOT NULL,
    visited_at TEXT NOT NULL
);
`

// NewLibraryDB creates or opens a library-specific database with ALL tables
func NewLibraryDB(dataDir, filename string) (*Database, error) {
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}

	dbPath := filepath.Join(dataDir, filename)
	sqlDB, err := sql.Open("sqlite", dbPath+"?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)")
	if err != nil {
		return nil, fmt.Errorf("open library database: %w", err)
	}

	sqlDB.SetMaxOpenConns(1)

	d := &Database{
		db:      sqlDB,
		dataDir: dataDir,
	}

	if err := d.migrateLibrarySchema(); err != nil {
		sqlDB.Close()
		return nil, fmt.Errorf("migrate library schema: %w", err)
	}

	return d, nil
}

func (d *Database) migrateLibrarySchema() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	tx, err := d.db.Begin()
	if err != nil {
		return fmt.Errorf("begin library migration tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec(fullSchema); err != nil {
		return fmt.Errorf("create library schema: %w", err)
	}

	return tx.Commit()
}
