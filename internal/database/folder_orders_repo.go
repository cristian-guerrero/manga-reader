package database

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"manga-visor/internal/persistence"
	"sync"
	"time"
)

type FolderOrdersRepository struct {
	db     *Database
	orders map[string]persistence.FolderOrder
	mu     sync.RWMutex
}

func (r *FolderOrdersRepository) SetDB(db *Database) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.db = db
}

func NewFolderOrdersRepository(db *Database) *FolderOrdersRepository {
	r := &FolderOrdersRepository{db: db, orders: make(map[string]persistence.FolderOrder)}
	if err := r.Load(); err != nil {
		r.orders = make(map[string]persistence.FolderOrder)
	}
	return r
}

func (r *FolderOrdersRepository) Get(parentPath string) *persistence.FolderOrder {
	r.mu.RLock()
	defer r.mu.RUnlock()
	hash := folderOrderHash(parentPath)
	if o, ok := r.orders[hash]; ok {
		cp := o
		return &cp
	}
	return nil
}

func (r *FolderOrdersRepository) GetOrder(parentPath string) []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	hash := folderOrderHash(parentPath)
	if o, ok := r.orders[hash]; ok {
		if len(o.CustomOrder) > 0 {
			cp := make([]string, len(o.CustomOrder))
			copy(cp, o.CustomOrder)
			return cp
		}
	}
	return nil
}

func (r *FolderOrdersRepository) HasCustomOrder(parentPath string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	hash := folderOrderHash(parentPath)
	if o, ok := r.orders[hash]; ok {
		return len(o.CustomOrder) > 0
	}
	return false
}

func (r *FolderOrdersRepository) GetAutoOrder(parentPath string) []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	hash := folderOrderHash(parentPath)
	if o, ok := r.orders[hash]; ok {
		if len(o.AutoOrder) > 0 {
			cp := make([]string, len(o.AutoOrder))
			copy(cp, o.AutoOrder)
			return cp
		}
	}
	return nil
}

func (r *FolderOrdersRepository) HasAutoOrder(parentPath string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	hash := folderOrderHash(parentPath)
	if o, ok := r.orders[hash]; ok {
		return len(o.AutoOrder) > 0
	}
	return false
}

func (r *FolderOrdersRepository) SetAutoOrder(parentPath string, autoOrder, originalOrder []string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	hash := folderOrderHash(parentPath)
	existing, _ := r.orders[hash]

	existing.ParentPath = parentPath
	existing.AutoOrder = autoOrder
	if len(originalOrder) > 0 {
		existing.OriginalOrder = originalOrder
	} else if len(existing.OriginalOrder) == 0 {
		existing.OriginalOrder = originalOrder
	}
	existing.ModifiedAt = time.Now().UTC().Format(time.RFC3339)
	r.orders[hash] = existing

	return r.writeAll()
}

func (r *FolderOrdersRepository) PromoteToFront(parentPath, entryName string, allEntries []string) ([]string, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	hash := folderOrderHash(parentPath)
	o, hasExisting := r.orders[hash]

	originalOrder := allEntries
	if hasExisting && len(o.OriginalOrder) > 0 {
		originalOrder = o.OriginalOrder
	}

	newAuto := make([]string, 0, len(allEntries))

	if hasExisting && len(o.AutoOrder) > 0 {
		newAuto = append(newAuto, entryName)
		for _, name := range o.AutoOrder {
			if name != entryName {
				newAuto = append(newAuto, name)
			}
		}
		for _, name := range allEntries {
			found := false
			for _, n := range newAuto {
				if n == name {
					found = true
					break
				}
			}
			if !found {
				newAuto = append(newAuto, name)
			}
		}
	} else {
		newAuto = append([]string{entryName}, allEntries...)
	}

	o.ParentPath = parentPath
	o.AutoOrder = newAuto
	o.OriginalOrder = originalOrder
	if !hasExisting {
		o.CustomOrder = []string{}
	}
	o.ModifiedAt = time.Now().UTC().Format(time.RFC3339)
	r.orders[hash] = o

	if err := r.writeAll(); err != nil {
		return nil, err
	}

	result := make([]string, len(newAuto))
	copy(result, newAuto)
	return result, nil
}

func (r *FolderOrdersRepository) ResetAutoOrder(parentPath string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	hash := folderOrderHash(parentPath)
	if o, ok := r.orders[hash]; ok {
		o.AutoOrder = nil
		o.ModifiedAt = time.Now().UTC().Format(time.RFC3339)
		r.orders[hash] = o
	}

	return r.writeAll()
}

func (r *FolderOrdersRepository) Save(parentPath string, customOrder, originalOrder []string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	hash := folderOrderHash(parentPath)
	existing, hasExisting := r.orders[hash]

	order := persistence.FolderOrder{
		ParentPath:   parentPath,
		CustomOrder:  customOrder,
		OriginalOrder: originalOrder,
		ModifiedAt:   time.Now().UTC().Format(time.RFC3339),
	}
	if hasExisting {
		if len(customOrder) == 0 {
			order.CustomOrder = existing.CustomOrder
		}
		if len(originalOrder) == 0 && len(existing.OriginalOrder) > 0 {
			order.OriginalOrder = existing.OriginalOrder
		}
		order.AutoOrder = existing.AutoOrder
	}
	if len(order.OriginalOrder) == 0 {
		order.OriginalOrder = originalOrder
	}

	r.orders[hash] = order
	return r.writeAll()
}

func (r *FolderOrdersRepository) SetOriginalOrder(parentPath string, originalOrder []string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	hash := folderOrderHash(parentPath)
	existing, hasExisting := r.orders[hash]

	if hasExisting {
		existing.OriginalOrder = originalOrder
		existing.ModifiedAt = time.Now().UTC().Format(time.RFC3339)
		r.orders[hash] = existing
	} else {
		r.orders[hash] = persistence.FolderOrder{
			ParentPath:    parentPath,
			OriginalOrder: originalOrder,
			ModifiedAt:    time.Now().UTC().Format(time.RFC3339),
		}
	}

	return r.writeAll()
}

func (r *FolderOrdersRepository) Reset(parentPath string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	hash := folderOrderHash(parentPath)
	if o, ok := r.orders[hash]; ok {
		o.CustomOrder = nil
		o.ModifiedAt = time.Now().UTC().Format(time.RFC3339)
		r.orders[hash] = o
	}

	return r.writeAll()
}

func (r *FolderOrdersRepository) Remove(parentPath string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	hash := folderOrderHash(parentPath)
	delete(r.orders, hash)

	_, err := r.db.db.Exec("DELETE FROM folder_orders WHERE parent_path = ?", parentPath)
	return err
}

func (r *FolderOrdersRepository) Load() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	rows, err := r.db.db.Query("SELECT parent_path, custom_order, auto_order, original_order, modified_at FROM folder_orders")
	if err != nil {
		return fmt.Errorf("query folder orders: %w", err)
	}
	defer rows.Close()

	r.orders = make(map[string]persistence.FolderOrder)
	for rows.Next() {
		var o persistence.FolderOrder
		var customJSON, autoJSON, originalJSON string
		if err := rows.Scan(&o.ParentPath, &customJSON, &autoJSON, &originalJSON, &o.ModifiedAt); err != nil {
			return fmt.Errorf("scan folder order: %w", err)
		}
		json.Unmarshal([]byte(customJSON), &o.CustomOrder)
		json.Unmarshal([]byte(autoJSON), &o.AutoOrder)
		json.Unmarshal([]byte(originalJSON), &o.OriginalOrder)
		if o.CustomOrder == nil {
			o.CustomOrder = []string{}
		}
		if o.AutoOrder == nil {
			o.AutoOrder = []string{}
		}
		if o.OriginalOrder == nil {
			o.OriginalOrder = []string{}
		}
		hash := folderOrderHash(o.ParentPath)
		r.orders[hash] = o
	}
	if err := rows.Err(); err != nil {
		return err
	}

	return nil
}

func (r *FolderOrdersRepository) writeAll() error {
	tx, err := r.db.db.Begin()
	if err != nil {
		return fmt.Errorf("begin folder orders tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM folder_orders"); err != nil {
		return fmt.Errorf("clear folder orders: %w", err)
	}

	stmt, err := tx.Prepare(`INSERT INTO folder_orders (parent_path, custom_order, auto_order, original_order, modified_at) VALUES (?, ?, ?, ?, ?)`)
	if err != nil {
		return fmt.Errorf("prepare folder orders stmt: %w", err)
	}
	defer stmt.Close()

	for _, o := range r.orders {
		customJSON, _ := json.Marshal(o.CustomOrder)
		autoJSON, _ := json.Marshal(o.AutoOrder)
		originalJSON, _ := json.Marshal(o.OriginalOrder)
		if _, err := stmt.Exec(o.ParentPath, string(customJSON), string(autoJSON), string(originalJSON), o.ModifiedAt); err != nil {
			return fmt.Errorf("insert folder order: %w", err)
		}
	}

	return tx.Commit()
}

func folderOrderHash(path string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(path)))
}
