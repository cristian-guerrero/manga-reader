package persistence

import (
	"crypto/md5"
	"fmt"
	"sync"
	"time"
)

const folderOrdersFile = "folder_orders.json"

type FolderOrder struct {
	ParentPath    string   `json:"parentPath"`
	CustomOrder   []string `json:"customOrder"`
	AutoOrder     []string `json:"autoOrder,omitempty"`
	OriginalOrder []string `json:"originalOrder"`
	ModifiedAt    string   `json:"modifiedAt"`
	PinnedName    []string `json:"pinnedName,omitempty"`
	PinnedDate    []string `json:"pinnedDate,omitempty"`
	PinnedAuto    []string `json:"pinnedAuto,omitempty"`
	PinnedCustom  []string `json:"pinnedCustom,omitempty"`
}

type FolderOrders struct {
	Data map[string]FolderOrder `json:"data"`
}

type FolderOrdersManager struct {
	orders *FolderOrders
	mu     sync.RWMutex
}

func NewFolderOrdersManager() *FolderOrdersManager {
	fm := &FolderOrdersManager{
		orders: &FolderOrders{
			Data: make(map[string]FolderOrder),
		},
	}
	fm.Load()
	return fm
}

func generateFolderOrderHash(path string) string {
	hash := md5.Sum([]byte(path))
	return fmt.Sprintf("%x", hash)
}

func (fm *FolderOrdersManager) Get(parentPath string) *FolderOrder {
	fm.mu.RLock()
	defer fm.mu.RUnlock()

	hash := generateFolderOrderHash(parentPath)
	if order, exists := fm.orders.Data[hash]; exists {
		copy := order
		return &copy
	}
	return nil
}

func (fm *FolderOrdersManager) GetOrder(parentPath string) []string {
	fm.mu.RLock()
	defer fm.mu.RUnlock()

	hash := generateFolderOrderHash(parentPath)
	if order, exists := fm.orders.Data[hash]; exists {
		if len(order.CustomOrder) > 0 {
			return order.CustomOrder
		}
		return order.OriginalOrder
	}
	return nil
}

func (fm *FolderOrdersManager) HasCustomOrder(parentPath string) bool {
	fm.mu.RLock()
	defer fm.mu.RUnlock()

	hash := generateFolderOrderHash(parentPath)
	if order, exists := fm.orders.Data[hash]; exists {
		return len(order.CustomOrder) > 0
	}
	return false
}

func (fm *FolderOrdersManager) GetAutoOrder(parentPath string) []string {
	fm.mu.RLock()
	defer fm.mu.RUnlock()

	hash := generateFolderOrderHash(parentPath)
	if order, exists := fm.orders.Data[hash]; exists {
		if len(order.AutoOrder) > 0 {
			return order.AutoOrder
		}
	}
	return nil
}

func (fm *FolderOrdersManager) HasAutoOrder(parentPath string) bool {
	fm.mu.RLock()
	defer fm.mu.RUnlock()

	hash := generateFolderOrderHash(parentPath)
	if order, exists := fm.orders.Data[hash]; exists {
		return len(order.AutoOrder) > 0
	}
	return false
}

func (fm *FolderOrdersManager) SetAutoOrder(parentPath string, autoOrder []string, originalOrder []string) error {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	hash := generateFolderOrderHash(parentPath)

	if existing, exists := fm.orders.Data[hash]; exists {
		if len(existing.OriginalOrder) > 0 {
			originalOrder = existing.OriginalOrder
		}
		existing.AutoOrder = autoOrder
		existing.OriginalOrder = originalOrder
		existing.ModifiedAt = time.Now().Format(time.RFC3339)
		fm.orders.Data[hash] = existing
	} else {
		fm.orders.Data[hash] = FolderOrder{
			ParentPath:    parentPath,
			AutoOrder:     autoOrder,
			OriginalOrder: originalOrder,
			ModifiedAt:    time.Now().Format(time.RFC3339),
		}
	}

	return saveJSON(folderOrdersFile, fm.orders)
}

func (fm *FolderOrdersManager) PromoteToFront(parentPath string, entryName string, allEntries []string) ([]string, error) {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	hash := generateFolderOrderHash(parentPath)

	var autoOrder []string
	var originalOrder []string

	if existing, exists := fm.orders.Data[hash]; exists {
		autoOrder = existing.AutoOrder
		originalOrder = existing.OriginalOrder
	} else {
		originalOrder = make([]string, len(allEntries))
		copy(originalOrder, allEntries)
	}

	if autoOrder == nil {
		autoOrder = make([]string, len(allEntries))
		copy(autoOrder, allEntries)
	}

	// Remove entryName from current position
	for i, name := range autoOrder {
		if name == entryName {
			autoOrder = append(autoOrder[:i], autoOrder[i+1:]...)
			break
		}
	}

	// Prepend to front
	autoOrder = append([]string{entryName}, autoOrder...)

	// Maintain same length by trimming excess
	if len(autoOrder) > len(allEntries) {
		autoOrder = autoOrder[:len(allEntries)]
	}

	entity := FolderOrder{
		ParentPath:    parentPath,
		AutoOrder:     autoOrder,
		OriginalOrder: originalOrder,
		ModifiedAt:    time.Now().Format(time.RFC3339),
	}
	if existing, exists := fm.orders.Data[hash]; exists && len(existing.CustomOrder) > 0 {
		entity.CustomOrder = existing.CustomOrder
	}
	fm.orders.Data[hash] = entity

	return autoOrder, saveJSON(folderOrdersFile, fm.orders)
}

func (fm *FolderOrdersManager) ResetAutoOrder(parentPath string) error {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	hash := generateFolderOrderHash(parentPath)

	if order, exists := fm.orders.Data[hash]; exists {
		order.AutoOrder = nil
		order.ModifiedAt = time.Now().Format(time.RFC3339)
		fm.orders.Data[hash] = order
		return saveJSON(folderOrdersFile, fm.orders)
	}

	return nil
}

func (fm *FolderOrdersManager) Save(parentPath string, customOrder []string, originalOrder []string) error {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	hash := generateFolderOrderHash(parentPath)

	if existing, exists := fm.orders.Data[hash]; exists && len(existing.OriginalOrder) > 0 {
		originalOrder = existing.OriginalOrder
	}

	fm.orders.Data[hash] = FolderOrder{
		ParentPath:    parentPath,
		CustomOrder:   customOrder,
		OriginalOrder: originalOrder,
		ModifiedAt:    time.Now().Format(time.RFC3339),
	}

	return saveJSON(folderOrdersFile, fm.orders)
}

func (fm *FolderOrdersManager) SetOriginalOrder(parentPath string, originalOrder []string) error {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	hash := generateFolderOrderHash(parentPath)

	if existing, exists := fm.orders.Data[hash]; !exists {
		fm.orders.Data[hash] = FolderOrder{
			ParentPath:    parentPath,
			CustomOrder:   nil,
			OriginalOrder: originalOrder,
			ModifiedAt:    time.Now().Format(time.RFC3339),
		}
		return saveJSON(folderOrdersFile, fm.orders)
	} else if len(existing.OriginalOrder) == 0 {
		existing.OriginalOrder = originalOrder
		existing.ModifiedAt = time.Now().Format(time.RFC3339)
		fm.orders.Data[hash] = existing
		return saveJSON(folderOrdersFile, fm.orders)
	}

	return nil
}

func (fm *FolderOrdersManager) Reset(parentPath string) error {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	hash := generateFolderOrderHash(parentPath)

	if order, exists := fm.orders.Data[hash]; exists {
		order.CustomOrder = nil
		order.ModifiedAt = time.Now().Format(time.RFC3339)
		fm.orders.Data[hash] = order
		return saveJSON(folderOrdersFile, fm.orders)
	}

	return nil
}

func (fm *FolderOrdersManager) Remove(parentPath string) error {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	hash := generateFolderOrderHash(parentPath)
	delete(fm.orders.Data, hash)
	return saveJSON(folderOrdersFile, fm.orders)
}

func (fm *FolderOrdersManager) Load() error {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	if !fileExists(folderOrdersFile) {
		return saveJSON(folderOrdersFile, fm.orders)
	}

	orders := &FolderOrders{Data: make(map[string]FolderOrder)}
	if err := loadJSON(folderOrdersFile, orders); err != nil {
		return err
	}

	fm.orders = orders
	return nil
}
