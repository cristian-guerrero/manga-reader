package thumbnails

import (
	"os"
	"path/filepath"
	"testing"
)

func newTestBoltStore(t *testing.T) *BoltStore {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "thumbnails.db")
	s, err := NewBoltStore(dbPath)
	if err != nil {
		t.Fatalf("NewBoltStore error = %v", err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

func TestNewBoltStore(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test.db")
	s, err := NewBoltStore(dbPath)

	if err != nil {
		t.Fatalf("NewBoltStore error = %v", err)
	}
	defer s.Close()

	if s.Path() != dbPath {
		t.Errorf("Path() = %q, want %q", s.Path(), dbPath)
	}
}

func TestBoltStore_PutAndGet(t *testing.T) {
	s := newTestBoltStore(t)

	if err := s.Put("key1", []byte("value1")); err != nil {
		t.Fatalf("Put error = %v", err)
	}

	data, err := s.Get("key1")
	if err != nil {
		t.Fatalf("Get error = %v", err)
	}
	if string(data) != "value1" {
		t.Errorf("Get = %q, want %q", string(data), "value1")
	}
}

func TestBoltStore_Get_NotFound(t *testing.T) {
	s := newTestBoltStore(t)

	data, err := s.Get("nonexistent")
	if err != nil {
		t.Fatalf("Get error = %v", err)
	}
	if data != nil {
		t.Errorf("Get for nonexistent key returned %v, want nil", data)
	}
}

func TestBoltStore_Put_Overwrite(t *testing.T) {
	s := newTestBoltStore(t)

	if err := s.Put("key1", []byte("value1")); err != nil {
		t.Fatal(err)
	}
	if err := s.Put("key1", []byte("value2")); err != nil {
		t.Fatal(err)
	}

	data, _ := s.Get("key1")
	if string(data) != "value2" {
		t.Errorf("after overwrite, Get = %q, want %q", string(data), "value2")
	}
}

func TestBoltStore_Delete(t *testing.T) {
	s := newTestBoltStore(t)

	s.Put("key1", []byte("value1"))
	if err := s.Delete("key1"); err != nil {
		t.Fatalf("Delete error = %v", err)
	}

	data, _ := s.Get("key1")
	if data != nil {
		t.Error("key should be deleted")
	}
}

func TestBoltStore_Delete_Nonexistent(t *testing.T) {
	s := newTestBoltStore(t)
	if err := s.Delete("nonexistent"); err != nil {
		t.Errorf("Delete nonexistent key should not error, got %v", err)
	}
}

func TestBoltStore_Exists(t *testing.T) {
	s := newTestBoltStore(t)

	if s.Exists("key1") {
		t.Error("Exists should be false for missing key")
	}

	s.Put("key1", []byte("value1"))
	if !s.Exists("key1") {
		t.Error("Exists should be true after Put")
	}

	s.Delete("key1")
	if s.Exists("key1") {
		t.Error("Exists should be false after Delete")
	}
}

func TestBoltStore_Clear(t *testing.T) {
	s := newTestBoltStore(t)

	s.Put("key1", []byte("value1"))
	s.Put("key2", []byte("value2"))

	if err := s.Clear(); err != nil {
		t.Fatalf("Clear error = %v", err)
	}

	data1, _ := s.Get("key1")
	data2, _ := s.Get("key2")
	if data1 != nil || data2 != nil {
		t.Error("all keys should be cleared")
	}
}

func TestBoltStore_Clear_Empty(t *testing.T) {
	s := newTestBoltStore(t)
	if err := s.Clear(); err != nil {
		t.Errorf("Clear on empty store should not error, got %v", err)
	}
}

func TestBoltStore_DeleteByFolder(t *testing.T) {
	s := newTestBoltStore(t)

	// Use platform paths (filepath.Join uses \ on Windows)
	folder1 := filepath.Join("some", "folder")
	folder2 := filepath.Join("other", "folder")

	s.Put(filepath.Join(folder1, "img1.png"), []byte("data1"))
	s.Put(filepath.Join(folder1, "img2.png"), []byte("data2"))
	s.Put(filepath.Join(folder2, "img1.png"), []byte("data3"))

	if err := s.DeleteByFolder(folder1); err != nil {
		t.Fatalf("DeleteByFolder error = %v", err)
	}

	if s.Exists(filepath.Join(folder1, "img1.png")) {
		t.Error("key in deleted folder should not exist")
	}
	if s.Exists(filepath.Join(folder1, "img2.png")) {
		t.Error("key in deleted folder should not exist")
	}
	if !s.Exists(filepath.Join(folder2, "img1.png")) {
		t.Error("key in other folder should still exist")
	}
}

func TestBoltStore_DeleteByFolder_NoMatch(t *testing.T) {
	s := newTestBoltStore(t)
	folder1 := filepath.Join("some", "folder")
	s.Put(filepath.Join(folder1, "img1.png"), []byte("data"))

	if err := s.DeleteByFolder("nonexistent"); err != nil {
		t.Errorf("DeleteByFolder with no match should not error, got %v", err)
	}

	if !s.Exists(filepath.Join(folder1, "img1.png")) {
		t.Error("existing key should not be affected")
	}
}

func TestBoltStore_Concurrent(t *testing.T) {
	s := newTestBoltStore(t)

	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func(n int) {
			key := string(rune('0' + n))
			s.Put(key, []byte("value"))
			s.Get(key)
			s.Exists(key)
			done <- true
		}(i)
	}
	for i := 0; i < 10; i++ {
		<-done
	}
}

func TestBoltStore_EmptyData(t *testing.T) {
	s := newTestBoltStore(t)

	if err := s.Put("empty", []byte{}); err != nil {
		t.Fatalf("Put empty data error = %v", err)
	}

	data, err := s.Get("empty")
	if err != nil {
		t.Fatalf("Get error = %v", err)
	}
	if data == nil || len(data) != 0 {
		t.Errorf("Get empty data = %v (len=%d), want empty slice", data, len(data))
	}
}

func TestNewBoltStore_InvalidPath(t *testing.T) {
	_, err := NewBoltStore("")
	if err == nil {
		t.Error("expected error for empty path")
	}
}

func TestNewBoltStore_CreatesDir(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "sub", "dir")
	dbPath := filepath.Join(dir, "test.db")

	s, err := NewBoltStore(dbPath)
	if err != nil {
		t.Fatalf("NewBoltStore error = %v", err)
	}
	s.Close()

	if _, err := os.Stat(dir); os.IsNotExist(err) {
		t.Error("NewBoltStore should create parent directories")
	}
}
