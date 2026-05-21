package thumbnails

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"

	"go.etcd.io/bbolt"
)

const bucketName = "thumbnails"

// BoltStore provides a bbolt-backed key-value store for thumbnail caching.
// Keys are full image paths, values are raw JPEG bytes.
type BoltStore struct {
	db     *bbolt.DB
	dbPath string
}

// NewBoltStore opens or creates a bbolt database at the given path.
func NewBoltStore(dbPath string) (*BoltStore, error) {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}

	db, err := bbolt.Open(dbPath, 0600, bbolt.DefaultOptions)
	if err != nil {
		return nil, err
	}

	// Ensure the bucket exists
	if err := db.Update(func(tx *bbolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists([]byte(bucketName))
		return err
	}); err != nil {
		db.Close()
		return nil, err
	}

	return &BoltStore{
		db:     db,
		dbPath: dbPath,
	}, nil
}

// Path returns the database file path.
func (s *BoltStore) Path() string {
	return s.dbPath
}

// Get retrieves thumbnail bytes by image path key.
func (s *BoltStore) Get(imagePath string) ([]byte, error) {
	var data []byte
	err := s.db.View(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(bucketName))
		val := b.Get([]byte(imagePath))
		if val == nil {
			return nil
		}
		// bbolt returns a slice backed by mmap; copy it so it's safe after the transaction
		data = make([]byte, len(val))
		copy(data, val)
		return nil
	})
	return data, err
}

// Put stores thumbnail bytes under the given image path key.
func (s *BoltStore) Put(imagePath string, data []byte) error {
	return s.db.Update(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(bucketName))
		return b.Put([]byte(imagePath), data)
	})
}

// Delete removes a single thumbnail by image path key.
func (s *BoltStore) Delete(imagePath string) error {
	return s.db.Update(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(bucketName))
		return b.Delete([]byte(imagePath))
	})
}

// Exists checks if a thumbnail exists for the given image path.
func (s *BoltStore) Exists(imagePath string) bool {
	var exists bool
	s.db.View(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(bucketName))
		exists = b.Get([]byte(imagePath)) != nil
		return nil
	})
	return exists
}

// DeleteByFolder removes all thumbnails whose image path starts with the given folder path.
// Uses bbolt's cursor Seek for efficient prefix scan.
func (s *BoltStore) DeleteByFolder(folderPath string) error {
	prefix := folderPath
	if !strings.HasSuffix(prefix, string(filepath.Separator)) {
		prefix += string(filepath.Separator)
	}
	prefixBytes := []byte(prefix)

	return s.db.Update(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(bucketName))
		c := b.Cursor()
		for k, _ := c.Seek(prefixBytes); k != nil && bytes.HasPrefix(k, prefixBytes); k, _ = c.Next() {
			if err := b.Delete(k); err != nil {
				return err
			}
		}
		return nil
	})
}

// Clear removes all thumbnails from the store.
func (s *BoltStore) Clear() error {
	return s.db.Update(func(tx *bbolt.Tx) error {
		// Delete and recreate the bucket to clear all data efficiently
		if err := tx.DeleteBucket([]byte(bucketName)); err != nil {
			return err
		}
		_, err := tx.CreateBucket([]byte(bucketName))
		return err
	})
}

// Close closes the underlying database.
func (s *BoltStore) Close() error {
	return s.db.Close()
}
