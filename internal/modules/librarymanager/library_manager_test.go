package librarymanager

import (
	"os"
	"path/filepath"
	"testing"

	"manga-visor/internal/database"
)

func newTestModule(t *testing.T) *Module {
	t.Helper()
	m := NewModule(t.TempDir())
	if m == nil {
		t.Fatal("NewModule returned nil")
	}
	return m
}

func TestNewModule(t *testing.T) {
	m := NewModule(t.TempDir())
	if m == nil {
		t.Fatal("NewModule returned nil")
	}
	list := m.List()
	if list == nil {
		t.Fatal("List() returned nil")
	}
	if len(list) != 0 {
		t.Errorf("expected empty list, got %d items", len(list))
	}
}

func TestEnsureDefault_CreatesDefault(t *testing.T) {
	dir := t.TempDir()
	m := NewModule(dir)

	if err := m.EnsureDefault(); err != nil {
		t.Fatalf("EnsureDefault error = %v", err)
	}

	defaultLib := m.GetDefault()
	if defaultLib == nil {
		t.Fatal("GetDefault returned nil")
	}
	if defaultLib.ID != "default" {
		t.Errorf("default ID = %q, want %q", defaultLib.ID, "default")
	}
	if !defaultLib.IsDefault {
		t.Error("default library should have IsDefault = true")
	}

	list := m.List()
	if len(list) != 1 {
		t.Errorf("expected 1 library, got %d", len(list))
	}

	if m.GetActiveID() != "default" {
		t.Errorf("ActiveID = %q, want %q", m.GetActiveID(), "default")
	}
}

func TestEnsureDefault_Idempotent(t *testing.T) {
	m := newTestModule(t)
	if err := m.EnsureDefault(); err != nil {
		t.Fatal(err)
	}
	if err := m.EnsureDefault(); err != nil {
		t.Fatal(err)
	}

	list := m.List()
	if len(list) != 1 {
		t.Errorf("EnsureDefault should be idempotent, got %d libraries", len(list))
	}
}

func TestEnsureDefault_LegacyDBExists(t *testing.T) {
	dir := t.TempDir()
	legacyPath := filepath.Join(dir, "manga-visor.db")
	os.WriteFile(legacyPath, []byte("not a real db"), 0644)

	m := NewModule(dir)
	if err := m.EnsureDefault(); err != nil {
		t.Fatalf("EnsureDefault with legacy file error = %v", err)
	}

	defaultLib := m.GetDefault()
	if defaultLib == nil {
		t.Fatal("GetDefault returned nil")
	}
	if defaultLib.Filename != "manga-visor.db" {
		t.Errorf("filename = %q, want %q", defaultLib.Filename, "manga-visor.db")
	}
}

func TestGetActiveID_Default(t *testing.T) {
	m := newTestModule(t)
	if id := m.GetActiveID(); id != "" {
		t.Errorf("ActiveID = %q, want empty", id)
	}
}

func TestSetActiveID(t *testing.T) {
	m := newTestModule(t)
	m.EnsureDefault()

	if err := m.SetActiveID("default"); err != nil {
		t.Fatalf("SetActiveID error = %v", err)
	}
	if id := m.GetActiveID(); id != "default" {
		t.Errorf("ActiveID = %q, want %q", id, "default")
	}
}

func TestGet_Found(t *testing.T) {
	m := newTestModule(t)
	m.EnsureDefault()

	lib := m.Get("default")
	if lib == nil {
		t.Fatal("Get('default') returned nil")
	}
	if lib.Name != "Default" {
		t.Errorf("Name = %q, want %q", lib.Name, "Default")
	}
}

func TestGet_NotFound(t *testing.T) {
	m := newTestModule(t)
	if lib := m.Get("nonexistent"); lib != nil {
		t.Errorf("Get for nonexistent returned %+v", lib)
	}
}

func TestGetDefault_NoDefault(t *testing.T) {
	m := newTestModule(t)
	if lib := m.GetDefault(); lib != nil {
		t.Errorf("GetDefault on empty module returned %+v", lib)
	}
}

func TestList_ReturnsCopy(t *testing.T) {
	m := newTestModule(t)
	m.EnsureDefault()

	list1 := m.List()
	list2 := m.List()
	if len(list1) != len(list2) {
		t.Fatal("lists should have same length")
	}
	if &list1[0] == &list2[0] {
		t.Error("List should return copies, not references")
	}
}

func TestCreate(t *testing.T) {
	m := newTestModule(t)
	m.EnsureDefault()

	libDB, err := database.New(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer libDB.Close()

	lib, err := m.Create("my_library", libDB)
	if err != nil {
		t.Fatalf("Create error = %v", err)
	}
	if lib == nil {
		t.Fatal("Create returned nil")
	}
	if lib.ID != "my_library" {
		t.Errorf("ID = %q, want %q", lib.ID, "my_library")
	}
	if lib.Name != "my_library" {
		t.Errorf("Name = %q, want %q", lib.Name, "my_library")
	}

	list := m.List()
	if len(list) != 2 {
		t.Errorf("expected 2 libraries, got %d", len(list))
	}
}

func TestCreate_EmptyName(t *testing.T) {
	m := newTestModule(t)
	_, err := m.Create("", nil)
	if err == nil {
		t.Fatal("expected error for empty name")
	}
}

func TestCreate_DuplicateName(t *testing.T) {
	m := newTestModule(t)
	m.EnsureDefault()

	libDB, err := database.New(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer libDB.Close()

	m.Create("test", libDB)
	// Should succeed since IDs are stored by name
	_, err = m.Create("test", libDB)
	if err != nil {
		t.Fatalf("Create duplicate name error = %v", err)
	}
}

func TestDelete(t *testing.T) {
	m := newTestModule(t)
	m.EnsureDefault()

	libDB, err := database.New(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer libDB.Close()

	m.Create("extra", libDB)

	if err := m.Delete("extra"); err != nil {
		t.Fatalf("Delete error = %v", err)
	}

	list := m.List()
	if len(list) != 1 {
		t.Errorf("expected 1 library after delete, got %d", len(list))
	}
}

func TestDelete_NotFound(t *testing.T) {
	m := newTestModule(t)
	if err := m.Delete("nonexistent"); err == nil {
		t.Error("expected error for nonexistent library")
	}
}

func TestDelete_Default(t *testing.T) {
	m := newTestModule(t)
	m.EnsureDefault()

	err := m.Delete("default")
	if err == nil {
		t.Error("expected error when deleting default library")
	}
}

func TestDelete_FallbackActive(t *testing.T) {
	m := newTestModule(t)
	m.EnsureDefault()

	libDB, err := database.New(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer libDB.Close()

	m.Create("extra", libDB)
	m.SetActiveID("extra")
	m.Delete("extra")

	if id := m.GetActiveID(); id != "default" {
		t.Errorf("ActiveID after deleting current should fall back to default, got %q", id)
	}
}

func TestOpenLibrary_CopyFile(t *testing.T) {
	m := newTestModule(t)

	srcDir := t.TempDir()
	srcDB, err := database.NewLibraryDB(srcDir, "external.db")
	if err != nil {
		t.Fatal(err)
	}
	srcDB.Close()

	srcPath := filepath.Join(srcDir, "external.db")
	lib, err := m.OpenLibrary(srcPath)
	if err != nil {
		t.Fatalf("OpenLibrary error = %v", err)
	}
	if lib == nil {
		t.Fatal("OpenLibrary returned nil")
	}

	list := m.List()
	if len(list) != 1 {
		t.Errorf("expected 1 library, got %d", len(list))
	}
}

func TestOpenLibrary_Directory(t *testing.T) {
	m := newTestModule(t)
	_, err := m.OpenLibrary(t.TempDir())
	if err == nil {
		t.Error("expected error when opening a directory")
	}
}

func TestOpenLibrary_NotFound(t *testing.T) {
	m := newTestModule(t)
	_, err := m.OpenLibrary("/nonexistent/file.db")
	if err == nil {
		t.Error("expected error for nonexistent file")
	}
}

func TestOpenLibrary_Duplicate(t *testing.T) {
	m := newTestModule(t)
	srcDir := t.TempDir()
	srcDB, err := database.NewLibraryDB(srcDir, "ext.db")
	if err != nil {
		t.Fatal(err)
	}
	srcDB.Close()

	m.OpenLibrary(filepath.Join(srcDir, "ext.db"))
	_, err = m.OpenLibrary(filepath.Join(srcDir, "ext.db"))
	if err == nil {
		t.Error("expected error for duplicate filename")
	}
}

func TestOpenLibrary_SameDir(t *testing.T) {
	m := newTestModule(t)
	libDB, err := database.NewLibraryDB(m.dataDir, "local.db")
	if err != nil {
		t.Fatal(err)
	}
	libDB.Close()

	path := filepath.Join(m.dataDir, "local.db")
	lib, err := m.OpenLibrary(path)
	if err != nil {
		t.Fatalf("OpenLibrary from same dir error = %v", err)
	}
	if lib == nil {
		t.Fatal("OpenLibrary returned nil")
	}
}

func TestGetLibraryPath(t *testing.T) {
	dir := t.TempDir()
	m := NewModule(dir)
	m.EnsureDefault()

	info := m.GetDefault()
	if info == nil {
		t.Fatal("GetDefault returned nil")
	}

	path := m.GetLibraryPath(info)
	if path == "" {
		t.Fatal("GetLibraryPath returned empty")
	}
	if !filepath.IsAbs(path) {
		t.Errorf("expected absolute path, got %q", path)
	}
}

func TestSaveAndLoad_Persistence(t *testing.T) {
	dir := t.TempDir()

	m1 := NewModule(dir)
	m1.EnsureDefault()

	// Create a second module pointing to same dir
	m2 := NewModule(dir)
	list := m2.List()
	if len(list) != 1 {
		t.Errorf("data should persist across Module instances, got %d libraries", len(list))
	}

	defaultLib := m2.GetDefault()
	if defaultLib == nil || defaultLib.ID != "default" {
		t.Errorf("default library should persist, got %+v", defaultLib)
	}
}

func TestCreate_CopiesSettings(t *testing.T) {
	dir := t.TempDir()
	m := NewModule(dir)
	m.EnsureDefault()

	// Create source DB with settings
	srcDB, err := database.New(dir)
	if err != nil {
		t.Fatal(err)
	}
	defer srcDB.Close()

	// Set a setting
	_, err = srcDB.SQLDB().Exec("INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', 'dark')")
	if err != nil {
		t.Fatal(err)
	}

	// Create new library from source
	lib, err := m.Create("with_settings", srcDB)
	if err != nil {
		t.Fatalf("Create error = %v", err)
	}

	// Open the new library DB and check the setting was copied
	destDB, err := database.NewLibraryDB(dir, lib.Filename)
	if err != nil {
		t.Fatal(err)
	}
	defer destDB.Close()

	var value string
	err = destDB.SQLDB().QueryRow("SELECT value FROM settings WHERE key = 'theme'").Scan(&value)
	if err != nil {
		t.Fatalf("setting 'theme' should be copied: %v", err)
	}
	if value != "dark" {
		t.Errorf("copied setting value = %q, want %q", value, "dark")
	}
}

func TestLoad_InvalidRegistryJSON(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "libraries.json"), []byte("{invalid json}"), 0644)

	// Should not panic, just log a warning
	m := NewModule(dir)
	if m == nil {
		t.Fatal("NewModule should not panic on invalid JSON")
	}
}

func TestLoad_EmptyRegistryFile(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "libraries.json"), []byte("{}"), 0644)

	m := NewModule(dir)
	list := m.List()
	if len(list) != 0 {
		t.Errorf("expected empty list for empty registry, got %d", len(list))
	}
}

func TestCopySettingsFrom(t *testing.T) {
	srcDir := t.TempDir()
	dstDir := t.TempDir()

	srcDB, err := database.New(srcDir)
	if err != nil {
		t.Fatal(err)
	}
	defer srcDB.Close()

	dstDB, err := database.New(dstDir)
	if err != nil {
		t.Fatal(err)
	}
	defer dstDB.Close()

	_, err = srcDB.SQLDB().Exec("INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', 'dark')")
	if err != nil {
		t.Fatal(err)
	}

	if err := copySettingsFrom(srcDB.SQLDB(), dstDB.SQLDB()); err != nil {
		t.Fatalf("copySettingsFrom error = %v", err)
	}

	var value string
	err = dstDB.SQLDB().QueryRow("SELECT value FROM settings WHERE key = 'theme'").Scan(&value)
	if err != nil {
		t.Fatalf("setting should exist in destination: %v", err)
	}
	if value != "dark" {
		t.Errorf("value = %q, want %q", value, "dark")
	}
}

func TestCopyUIPrefsFrom(t *testing.T) {
	srcDir := t.TempDir()
	dstDir := t.TempDir()

	srcDB, err := database.New(srcDir)
	if err != nil {
		t.Fatal(err)
	}
	defer srcDB.Close()

	dstDB, err := database.New(dstDir)
	if err != nil {
		t.Fatal(err)
	}
	defer dstDB.Close()

	_, err = srcDB.SQLDB().Exec("INSERT OR REPLACE INTO ui_preferences (key, value) VALUES ('sidebar_visible', 'true')")
	if err != nil {
		t.Fatal(err)
	}

	if err := copyUIPrefsFrom(srcDB.SQLDB(), dstDB.SQLDB()); err != nil {
		t.Fatalf("copyUIPrefsFrom error = %v", err)
	}

	var value string
	err = dstDB.SQLDB().QueryRow("SELECT value FROM ui_preferences WHERE key = 'sidebar_visible'").Scan(&value)
	if err != nil {
		t.Fatalf("ui_preference should exist in destination: %v", err)
	}
	if value != "true" {
		t.Errorf("value = %q, want %q", value, "true")
	}
}

func TestCopyUIPrefsFrom_SrcNoPrefs(t *testing.T) {
	srcDir := t.TempDir()
	dstDir := t.TempDir()

	srcDB, err := database.New(srcDir)
	if err != nil {
		t.Fatal(err)
	}
	defer srcDB.Close()

	dstDB, err := database.New(dstDir)
	if err != nil {
		t.Fatal(err)
	}
	defer dstDB.Close()

	// Should not error if src has no ui_preferences
	err = copyUIPrefsFrom(srcDB.SQLDB(), dstDB.SQLDB())
	if err != nil {
		t.Errorf("copyUIPrefsFrom with no source prefs should not error, got %v", err)
	}
}
