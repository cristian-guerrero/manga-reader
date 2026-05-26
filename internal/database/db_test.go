package database

import (
	"testing"
)

// newTestDB creates a Database in a temporary directory and returns it
// with a cleanup function that closes the DB and removes the temp dir.
func newTestDB(t *testing.T) *Database {
	t.Helper()
	db, err := New(t.TempDir())
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func TestNew_ValidDir(t *testing.T) {
	db := newTestDB(t)
	if db == nil {
		t.Fatal("New() returned nil")
	}
}

func TestNew_InvalidDir(t *testing.T) {
	_, err := New("")
	if err == nil {
		t.Error("New() with empty dir should return error")
	}
}

func TestNew_CreatesSchema(t *testing.T) {
	db := newTestDB(t)

	tables := []string{
		"settings", "ui_preferences", "explorer_folders",
		"library_entries", "series_entries", "series_chapters",
		"history", "download_jobs", "tabs", "image_orders",
		"folder_orders", "folder_view_modes", "viewer_states",
		"folder_grid_sizes", "schema_version",
	}

	for _, table := range tables {
		var count int
		err := db.db.QueryRow("SELECT COUNT(*) FROM " + table).Scan(&count)
		if err != nil {
			t.Errorf("table %s should exist: %v", table, err)
		}
	}
}

func TestSQLDB_ReturnsDB(t *testing.T) {
	db := newTestDB(t)
	if db.SQLDB() == nil {
		t.Error("SQLDB() returned nil")
	}
}

func TestDataDir_ReturnsDir(t *testing.T) {
	db := newTestDB(t)
	if db.DataDir() == "" {
		t.Error("DataDir() returned empty")
	}
}

func TestClose(t *testing.T) {
	db := newTestDB(t)
	if err := db.Close(); err != nil {
		t.Errorf("Close() error = %v", err)
	}
}

func TestNewLibraryDB(t *testing.T) {
	dir := t.TempDir()
	db, err := NewLibraryDB(dir, "test_library.db")
	if err != nil {
		t.Fatalf("NewLibraryDB() error = %v", err)
	}
	defer db.Close()

	var count int
	db.db.QueryRow("SELECT COUNT(*) FROM settings").Scan(&count)
}

func TestMigrateFromJSON_NoFiles(t *testing.T) {
	db := newTestDB(t)
	err := db.migrateFromJSON()
	if err != nil {
		t.Errorf("migrateFromJSON() with no JSON files error = %v", err)
	}
}
