package librarymanager

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"manga-visor/internal/database"
	"manga-visor/internal/persistence"
	"os"
	"path/filepath"
	"sync"
)

const registryFile = "libraries.json"

type Module struct {
	mu      sync.RWMutex
	data    persistence.LibraryRegistryData
	dataDir string
}

func NewModule(dataDir string) *Module {
	m := &Module{
		dataDir: dataDir,
	}
	if err := m.load(); err != nil {
		log.Printf("Warning: could not load library registry: %v", err)
	}
	return m
}

func (m *Module) load() error {
	path := filepath.Join(m.dataDir, registryFile)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("read registry: %w", err)
	}
	if len(data) < 2 {
		return nil
	}
	return json.Unmarshal(data, &m.data)
}

func (m *Module) save() error {
	path := filepath.Join(m.dataDir, registryFile)
	data, err := json.MarshalIndent(m.data, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal registry: %w", err)
	}
	return os.WriteFile(path, data, 0644)
}

// EnsureDefault ensures the default library entry exists in the registry.
// If manga-visor.db exists (legacy), use it as the default. Otherwise create one.
func (m *Module) EnsureDefault() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if len(m.data.Libraries) > 0 {
		return nil
	}

	defaultPath := filepath.Join(m.dataDir, "manga-visor.db")
	_, err := os.Stat(defaultPath)
	legacyExists := err == nil

	filename := "manga-visor.db"
	if !legacyExists {
		libDB, err := database.NewLibraryDB(m.dataDir, filename)
		if err != nil {
			return fmt.Errorf("create default library: %w", err)
		}
		libDB.Close()
	}

	m.data.Libraries = []persistence.LibraryInfo{
		{ID: "default", Name: "Default", Filename: filename, IsDefault: true},
	}
	m.data.ActiveLibraryID = "default"

	return m.save()
}

func (m *Module) GetActiveID() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.data.ActiveLibraryID
}

func (m *Module) SetActiveID(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.data.ActiveLibraryID = id
	return m.save()
}

func (m *Module) List() []persistence.LibraryInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()
	cp := make([]persistence.LibraryInfo, len(m.data.Libraries))
	copy(cp, m.data.Libraries)
	return cp
}

func (m *Module) Get(id string) *persistence.LibraryInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, l := range m.data.Libraries {
		if l.ID == id {
			cp := l
			return &cp
		}
	}
	return nil
}

func (m *Module) GetDefault() *persistence.LibraryInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, l := range m.data.Libraries {
		if l.IsDefault {
			cp := l
			return &cp
		}
	}
	return nil
}

// Create creates a new library DB, copies settings/ui_preferences from the current DB
func (m *Module) Create(name string, currentDB *database.Database) (*persistence.LibraryInfo, error) {
	if name == "" {
		return nil, fmt.Errorf("library name is required")
	}

	filename := fmt.Sprintf("library__%s.db", name)
	newDB, err := database.NewLibraryDB(m.dataDir, filename)
	if err != nil {
		return nil, fmt.Errorf("create library database: %w", err)
	}

	// Copy settings and ui_preferences from current DB
	if currentDB != nil {
		if err := copySettingsFrom(currentDB.SQLDB(), newDB.SQLDB()); err != nil {
			newDB.Close()
			os.Remove(filepath.Join(m.dataDir, filename))
			return nil, fmt.Errorf("copy settings: %w", err)
		}
		if err := copyUIPrefsFrom(currentDB.SQLDB(), newDB.SQLDB()); err != nil {
			newDB.Close()
			os.Remove(filepath.Join(m.dataDir, filename))
			return nil, fmt.Errorf("copy settings: %w", err)
		}
	}
	newDB.Close()

	id := name

	m.mu.Lock()
	m.data.Libraries = append(m.data.Libraries, persistence.LibraryInfo{
		ID: id, Name: name, Filename: filename,
	})
	if err := m.save(); err != nil {
		m.mu.Unlock()
		os.Remove(filepath.Join(m.dataDir, filename))
		return nil, fmt.Errorf("save registry: %w", err)
	}
	m.mu.Unlock()

	return m.Get(id), nil
}

func (m *Module) Delete(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	var found bool
	filtered := make([]persistence.LibraryInfo, 0, len(m.data.Libraries))
	for _, l := range m.data.Libraries {
		if l.ID == id {
			if l.IsDefault {
				return fmt.Errorf("cannot delete the default library")
			}
			found = true
			continue
		}
		filtered = append(filtered, l)
	}
	if !found {
		return fmt.Errorf("library not found: %s", id)
	}

	m.data.Libraries = filtered

	// If active library was deleted, fall back to default
	if m.data.ActiveLibraryID == id {
		for _, l := range m.data.Libraries {
			if l.IsDefault {
				m.data.ActiveLibraryID = l.ID
				break
			}
		}
	}

	return m.save()
}

// OpenLibrary copies a library DB file to the data directory and registers it
func (m *Module) OpenLibrary(filePath string) (*persistence.LibraryInfo, error) {
	stat, err := os.Stat(filePath)
	if err != nil {
		return nil, fmt.Errorf("cannot access file: %w", err)
	}
	if stat.IsDir() {
		return nil, fmt.Errorf("path is a directory, not a database file")
	}

	srcName := filepath.Base(filePath)
	destPath := filepath.Join(m.dataDir, srcName)

	m.mu.Lock()
	for _, l := range m.data.Libraries {
		if l.Filename == srcName {
			m.mu.Unlock()
			return nil, fmt.Errorf("library with filename '%s' is already registered", srcName)
		}
	}
	m.mu.Unlock()

	if filepath.Dir(filePath) != m.dataDir {
		input, err := os.ReadFile(filePath)
		if err != nil {
			return nil, fmt.Errorf("read library file: %w", err)
		}
		if err := os.WriteFile(destPath, input, 0644); err != nil {
			return nil, fmt.Errorf("copy library file: %w", err)
		}
	}

	name := srcName
	if ext := filepath.Ext(srcName); ext != "" {
		name = srcName[:len(srcName)-len(ext)]
	}
	id := name

	m.mu.Lock()
	m.data.Libraries = append(m.data.Libraries, persistence.LibraryInfo{
		ID: id, Name: name, Filename: srcName,
	})
	if err := m.save(); err != nil {
		m.mu.Unlock()
		return nil, fmt.Errorf("save registry: %w", err)
	}
	m.mu.Unlock()

	return m.Get(id), nil
}

func (m *Module) GetLibraryPath(lib *persistence.LibraryInfo) string {
	return filepath.Join(m.dataDir, lib.Filename)
}

// copySettingsFrom copies settings from src to dst DB
func copySettingsFrom(srcDB, dstDB *sql.DB) error {
	rows, err := srcDB.Query("SELECT key, value FROM settings")
	if err != nil {
		return fmt.Errorf("query source settings: %w", err)
	}
	defer rows.Close()

	tx, err := dstDB.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
	if err != nil {
		return fmt.Errorf("prepare: %w", err)
	}
	defer stmt.Close()

	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return fmt.Errorf("scan: %w", err)
		}
		if _, err := stmt.Exec(k, v); err != nil {
			return fmt.Errorf("insert: %w", err)
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}

	return nil
}

// copyUIPrefsFrom copies ui_preferences from src to dst DB
func copyUIPrefsFrom(srcDB, dstDB *sql.DB) error {
	rows, err := srcDB.Query("SELECT key, value FROM ui_preferences")
	if err != nil {
		return nil
	}
	defer rows.Close()

	tx, err := dstDB.Begin()
	if err != nil {
		return nil
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare("INSERT OR REPLACE INTO ui_preferences (key, value) VALUES (?, ?)")
	if err != nil {
		return nil
	}
	defer stmt.Close()

	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			continue
		}
		stmt.Exec(k, v)
	}

	tx.Commit()
	return nil
}
