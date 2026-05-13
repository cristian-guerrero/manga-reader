package persistence

import (
	"crypto/md5"
	"fmt"
	"sync"
	"time"
)

const folderViewModesFile = "folder_viewmodes.json"

type FolderViewMode struct {
	ParentPath string `json:"parentPath"`
	ViewMode   string `json:"viewMode"`
	ModifiedAt string `json:"modifiedAt"`
}

type FolderViewModes struct {
	Data map[string]FolderViewMode `json:"data"`
}

type FolderViewModeManager struct {
	modes *FolderViewModes
	mu    sync.RWMutex
}

func NewFolderViewModeManager() *FolderViewModeManager {
	fm := &FolderViewModeManager{
		modes: &FolderViewModes{
			Data: make(map[string]FolderViewMode),
		},
	}
	fm.Load()
	return fm
}

func generateFolderViewModeHash(path string) string {
	hash := md5.Sum([]byte(path))
	return fmt.Sprintf("%x", hash)
}

func (fm *FolderViewModeManager) Get(parentPath string) *string {
	fm.mu.RLock()
	defer fm.mu.RUnlock()

	hash := generateFolderViewModeHash(parentPath)
	if mode, exists := fm.modes.Data[hash]; exists {
		return &mode.ViewMode
	}
	return nil
}

func (fm *FolderViewModeManager) Set(parentPath string, viewMode string) error {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	hash := generateFolderViewModeHash(parentPath)

	fm.modes.Data[hash] = FolderViewMode{
		ParentPath: parentPath,
		ViewMode:   viewMode,
		ModifiedAt: time.Now().Format(time.RFC3339),
	}

	return saveJSON(folderViewModesFile, fm.modes)
}

func (fm *FolderViewModeManager) Remove(parentPath string) error {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	hash := generateFolderViewModeHash(parentPath)
	delete(fm.modes.Data, hash)
	return saveJSON(folderViewModesFile, fm.modes)
}

func (fm *FolderViewModeManager) Load() error {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	if !fileExists(folderViewModesFile) {
		return saveJSON(folderViewModesFile, fm.modes)
	}

	modes := &FolderViewModes{Data: make(map[string]FolderViewMode)}
	if err := loadJSON(folderViewModesFile, modes); err != nil {
		return err
	}

	fm.modes = modes
	return nil
}
