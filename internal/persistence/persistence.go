// Package persistence provides data persistence for the manga viewer.
// It handles saving and loading of settings, history, and image order data.
package persistence

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

// dataDir is the directory where all persistent data is stored
var (
	dataDir     string
	dataDirOnce sync.Once
)

// getDataDir returns the data directory for the application
func getDataDir() string {
	dataDirOnce.Do(func() {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			homeDir = "."
		}
		dataDir = filepath.Join(homeDir, ".manga-visor")

		// Create directory if it doesn't exist
		if err := os.MkdirAll(dataDir, 0755); err != nil {
			// Use current directory as fallback
			dataDir = "."
		}
	})
	return dataDir
}

// saveJSON saves data as JSON to the specified file
func saveJSON(filename string, data interface{}) error {
	filePath := filepath.Join(getDataDir(), filename)

	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filePath, jsonData, 0644)
}

// loadJSON loads JSON data from the specified file
func loadJSON(filename string, target interface{}) error {
	filePath := filepath.Join(getDataDir(), filename)

	data, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, target)
}

// fileExists checks if a file exists
func fileExists(filename string) bool {
	filePath := filepath.Join(getDataDir(), filename)
	_, err := os.Stat(filePath)
	return err == nil
}

// GetTempDir returns the temporary directory for archives
func GetTempDir() string {
	tempDir := filepath.Join(getDataDir(), "temp")
	os.MkdirAll(tempDir, 0755)
	return tempDir
}
