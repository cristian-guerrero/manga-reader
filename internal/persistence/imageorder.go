package persistence

import (
	"crypto/md5"
	"fmt"
	"sync"
	"time"
)

const ordersFile = "orders.json"

// ImageOrder represents a custom image order for a folder
type ImageOrder struct {
	// Folder path
	FolderPath string `json:"folderPath"`
	// Custom order (array of filenames)
	CustomOrder []string `json:"customOrder"`
	// Original order for reset
	OriginalOrder []string `json:"originalOrder"`
	// When the order was modified
	ModifiedAt string `json:"modifiedAt"`
}

// Orders represents all custom image orders
type Orders struct {
	// Map of folder hash to image order
	Data map[string]ImageOrder `json:"data"`
}

// OrdersManager handles image order persistence
type OrdersManager struct {
	orders *Orders
	mu     sync.RWMutex
}

// NewOrdersManager creates a new orders manager
func NewOrdersManager() *OrdersManager {
	om := &OrdersManager{
		orders: &Orders{
			Data: make(map[string]ImageOrder),
		},
	}
	om.Load()
	return om
}

// generateFolderHash generates a hash for a folder path
func generateFolderHash(folderPath string) string {
	hash := md5.Sum([]byte(folderPath))
	return fmt.Sprintf("%x", hash)
}

// Get returns the image order for a folder
func (om *OrdersManager) Get(folderPath string) *ImageOrder {
	om.mu.RLock()
	defer om.mu.RUnlock()

	hash := generateFolderHash(folderPath)
	if order, exists := om.orders.Data[hash]; exists {
		copy := order
		return &copy
	}
	return nil
}

// GetOrder returns just the order array for a folder
// If custom order exists, returns custom order; otherwise returns original order
func (om *OrdersManager) GetOrder(folderPath string) []string {
	om.mu.RLock()
	defer om.mu.RUnlock()

	hash := generateFolderHash(folderPath)
	if order, exists := om.orders.Data[hash]; exists {
		if len(order.CustomOrder) > 0 {
			return order.CustomOrder
		}
		return order.OriginalOrder
	}
	return nil
}

// HasCustomOrder checks if a folder has a custom order
func (om *OrdersManager) HasCustomOrder(folderPath string) bool {
	om.mu.RLock()
	defer om.mu.RUnlock()

	hash := generateFolderHash(folderPath)
	if order, exists := om.orders.Data[hash]; exists {
		return len(order.CustomOrder) > 0
	}
	return false
}

// Save saves a custom order for a folder
func (om *OrdersManager) Save(folderPath string, customOrder []string, originalOrder []string) error {
	om.mu.Lock()
	defer om.mu.Unlock()

	hash := generateFolderHash(folderPath)

	// If we already have an entry, preserve the original order
	if existing, exists := om.orders.Data[hash]; exists && len(existing.OriginalOrder) > 0 {
		originalOrder = existing.OriginalOrder
	}

	om.orders.Data[hash] = ImageOrder{
		FolderPath:    folderPath,
		CustomOrder:   customOrder,
		OriginalOrder: originalOrder,
		ModifiedAt:    time.Now().Format(time.RFC3339),
	}

	return saveJSON(ordersFile, om.orders)
}

// SetOriginalOrder sets the original order for a folder (without custom order)
func (om *OrdersManager) SetOriginalOrder(folderPath string, originalOrder []string) error {
	om.mu.Lock()
	defer om.mu.Unlock()

	hash := generateFolderHash(folderPath)

	// If entry doesn't exist, create it
	if existing, exists := om.orders.Data[hash]; !exists {
		om.orders.Data[hash] = ImageOrder{
			FolderPath:    folderPath,
			CustomOrder:   nil,
			OriginalOrder: originalOrder,
			ModifiedAt:    time.Now().Format(time.RFC3339),
		}
		return saveJSON(ordersFile, om.orders)
	} else if len(existing.OriginalOrder) == 0 {
		// If entry exists but has no original order, update it
		existing.OriginalOrder = originalOrder
		existing.ModifiedAt = time.Now().Format(time.RFC3339)
		om.orders.Data[hash] = existing
		return saveJSON(ordersFile, om.orders)
	}

	return nil
}

// Reset resets the order for a folder to the original order
func (om *OrdersManager) Reset(folderPath string) error {
	om.mu.Lock()
	defer om.mu.Unlock()

	hash := generateFolderHash(folderPath)

	if order, exists := om.orders.Data[hash]; exists {
		// Clear custom order but keep original
		order.CustomOrder = nil
		order.ModifiedAt = time.Now().Format(time.RFC3339)
		om.orders.Data[hash] = order
		return saveJSON(ordersFile, om.orders)
	}

	return nil
}

// Remove removes the order entry for a folder
func (om *OrdersManager) Remove(folderPath string) error {
	om.mu.Lock()
	defer om.mu.Unlock()

	hash := generateFolderHash(folderPath)
	delete(om.orders.Data, hash)

	return saveJSON(ordersFile, om.orders)
}

// Load loads orders from disk
func (om *OrdersManager) Load() error {
	om.mu.Lock()
	defer om.mu.Unlock()

	if !fileExists(ordersFile) {
		return saveJSON(ordersFile, om.orders)
	}

	orders := &Orders{Data: make(map[string]ImageOrder)}
	if err := loadJSON(ordersFile, orders); err != nil {
		return err
	}

	om.orders = orders
	return nil
}
