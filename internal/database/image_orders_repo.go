package database

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"log"
	"manga-visor/internal/persistence"
	"sync"
	"time"
)

type ImageOrdersRepository struct {
	db     *Database
	orders map[string]persistence.ImageOrder
	mu     sync.RWMutex
}

func (r *ImageOrdersRepository) SetDB(db *Database) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.db = db
}

func NewImageOrdersRepository(db *Database) *ImageOrdersRepository {
	r := &ImageOrdersRepository{db: db, orders: make(map[string]persistence.ImageOrder)}
	if err := r.Load(); err != nil {
		r.orders = make(map[string]persistence.ImageOrder)
	}
	return r
}

func (r *ImageOrdersRepository) Get(folderPath string) *persistence.ImageOrder {
	r.mu.RLock()
	defer r.mu.RUnlock()
	hash := imageOrderHash(folderPath)
	if o, ok := r.orders[hash]; ok {
		cp := o
		return &cp
	}
	return nil
}

func (r *ImageOrdersRepository) GetOrder(folderPath string) []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	hash := imageOrderHash(folderPath)
	if o, ok := r.orders[hash]; ok {
		if len(o.CustomOrder) > 0 {
			cp := make([]string, len(o.CustomOrder))
			copy(cp, o.CustomOrder)
			return cp
		}
		cp := make([]string, len(o.OriginalOrder))
		copy(cp, o.OriginalOrder)
		return cp
	}
	return nil
}

func (r *ImageOrdersRepository) HasCustomOrder(folderPath string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	hash := imageOrderHash(folderPath)
	if o, ok := r.orders[hash]; ok {
		return len(o.CustomOrder) > 0
	}
	return false
}

func (r *ImageOrdersRepository) Save(folderPath string, customOrder, originalOrder []string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	hash := imageOrderHash(folderPath)
	existing, hasExisting := r.orders[hash]

	order := persistence.ImageOrder{
		FolderPath:   folderPath,
		CustomOrder:  customOrder,
		OriginalOrder: originalOrder,
		ModifiedAt:   time.Now().UTC().Format(time.RFC3339),
	}
	if hasExisting {
		order.OriginalOrder = existing.OriginalOrder
		if len(customOrder) == 0 {
			order.CustomOrder = existing.CustomOrder
		}
	}
	if len(order.OriginalOrder) == 0 && len(originalOrder) > 0 {
		order.OriginalOrder = originalOrder
	}

	r.orders[hash] = order
	return r.writeAll()
}

func (r *ImageOrdersRepository) SetOriginalOrder(folderPath string, originalOrder []string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	hash := imageOrderHash(folderPath)
	existing, hasExisting := r.orders[hash]

	if hasExisting {
		existing.OriginalOrder = originalOrder
		existing.ModifiedAt = time.Now().UTC().Format(time.RFC3339)
		r.orders[hash] = existing
	} else {
		r.orders[hash] = persistence.ImageOrder{
			FolderPath:    folderPath,
			OriginalOrder: originalOrder,
			ModifiedAt:    time.Now().UTC().Format(time.RFC3339),
		}
	}

	return r.writeAll()
}

func (r *ImageOrdersRepository) Reset(folderPath string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	hash := imageOrderHash(folderPath)
	if o, ok := r.orders[hash]; ok {
		o.CustomOrder = nil
		o.ModifiedAt = time.Now().UTC().Format(time.RFC3339)
		r.orders[hash] = o
	}

	return r.writeAll()
}

func (r *ImageOrdersRepository) Remove(folderPath string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	hash := imageOrderHash(folderPath)
	delete(r.orders, hash)

	_, err := r.db.db.Exec("DELETE FROM image_orders WHERE folder_path = ?", folderPath)
	return err
}

func (r *ImageOrdersRepository) Load() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	alterStmts := []string{
		"ALTER TABLE image_orders ADD COLUMN pinned_name TEXT NOT NULL DEFAULT '[]'",
		"ALTER TABLE image_orders ADD COLUMN pinned_date TEXT NOT NULL DEFAULT '[]'",
	}
	for _, stmt := range alterStmts {
		r.db.db.Exec(stmt)
	}

	rows, err := r.db.db.Query("SELECT folder_path, custom_order, original_order, modified_at, pinned_name, pinned_date FROM image_orders")
	if err != nil {
		return fmt.Errorf("query image orders: %w", err)
	}
	defer rows.Close()

	r.orders = make(map[string]persistence.ImageOrder)
	for rows.Next() {
		var o persistence.ImageOrder
		var customJSON, originalJSON, pinnedNameJSON, pinnedDateJSON string
		if err := rows.Scan(&o.FolderPath, &customJSON, &originalJSON, &o.ModifiedAt, &pinnedNameJSON, &pinnedDateJSON); err != nil {
			return fmt.Errorf("scan image order: %w", err)
		}
		json.Unmarshal([]byte(customJSON), &o.CustomOrder)
		json.Unmarshal([]byte(originalJSON), &o.OriginalOrder)
		json.Unmarshal([]byte(pinnedNameJSON), &o.PinnedName)
		json.Unmarshal([]byte(pinnedDateJSON), &o.PinnedDate)
		if o.CustomOrder == nil {
			o.CustomOrder = []string{}
		}
		if o.OriginalOrder == nil {
			o.OriginalOrder = []string{}
		}
		if o.PinnedName == nil {
			o.PinnedName = []string{}
		}
		if o.PinnedDate == nil {
			o.PinnedDate = []string{}
		}
		hash := imageOrderHash(o.FolderPath)
		r.orders[hash] = o
	}
	if err := rows.Err(); err != nil {
		return err
	}

	return nil
}

func (r *ImageOrdersRepository) writeAll() error {
	tx, err := r.db.db.Begin()
	if err != nil {
		return fmt.Errorf("begin image orders tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM image_orders"); err != nil {
		return fmt.Errorf("clear image orders: %w", err)
	}

	stmt, err := tx.Prepare(`INSERT INTO image_orders (folder_path, custom_order, original_order, modified_at, pinned_name, pinned_date) VALUES (?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return fmt.Errorf("prepare image orders stmt: %w", err)
	}
	defer stmt.Close()

	for _, o := range r.orders {
		customJSON, _ := json.Marshal(o.CustomOrder)
		originalJSON, _ := json.Marshal(o.OriginalOrder)
		pinnedNameJSON, _ := json.Marshal(o.PinnedName)
		pinnedDateJSON, _ := json.Marshal(o.PinnedDate)
		if _, err := stmt.Exec(o.FolderPath, string(customJSON), string(originalJSON), o.ModifiedAt, string(pinnedNameJSON), string(pinnedDateJSON)); err != nil {
			return fmt.Errorf("insert image order: %w", err)
		}
	}

	return tx.Commit()
}

func imageOrderHash(folderPath string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(folderPath)))
}

func getPinnedImageField(o *persistence.ImageOrder, sortMode string) *[]string {
	switch sortMode {
	case "name":
		return &o.PinnedName
	case "date":
		return &o.PinnedDate
	default:
		return &o.PinnedName
	}
}

func (r *ImageOrdersRepository) GetPinnedImages(folderPath, sortMode string) []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	hash := imageOrderHash(folderPath)
	if o, ok := r.orders[hash]; ok {
		pinned := getPinnedImageField(&o, sortMode)
		if pinned != nil && len(*pinned) > 0 {
			cp := make([]string, len(*pinned))
			copy(cp, *pinned)
			log.Printf("[ImageOrders] GetPinnedImages: %s has %d pinned (sortMode=%s)", folderPath, len(cp), sortMode)
			return cp
		}
	}
	_, hasEntry := r.orders[hash]
	log.Printf("[ImageOrders] GetPinnedImages: %s has 0 pinned (sortMode=%s, hasEntry=%v)", folderPath, sortMode, hasEntry)
	return nil
}

func (r *ImageOrdersRepository) PinImage(folderPath, sortMode, imageName string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	hash := imageOrderHash(folderPath)
	o, hasExisting := r.orders[hash]
	if !hasExisting {
		o.FolderPath = folderPath
		o.CustomOrder = []string{}
		o.OriginalOrder = []string{}
		log.Printf("[ImageOrders] PinImage: new entry for %s, hash=%s", folderPath, hash)
	}

	pinned := getPinnedImageField(&o, sortMode)
	if pinned == nil {
		log.Printf("[ImageOrders] PinImage: no pinned field for sortMode=%s", sortMode)
		return nil
	}

	for _, name := range *pinned {
		if name == imageName {
			log.Printf("[ImageOrders] PinImage: already pinned %s", imageName)
			return nil
		}
	}

	*pinned = append(*pinned, imageName)
	o.ModifiedAt = time.Now().UTC().Format(time.RFC3339)
	r.orders[hash] = o

	log.Printf("[ImageOrders] PinImage: pinned %s in %s (sortMode=%s), now has %d pinned", imageName, folderPath, sortMode, len(*pinned))

	return r.writeAll()
}

func (r *ImageOrdersRepository) UnpinImage(folderPath, sortMode, imageName string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	hash := imageOrderHash(folderPath)
	o, hasExisting := r.orders[hash]
	if !hasExisting {
		return nil
	}

	pinned := getPinnedImageField(&o, sortMode)
	if pinned == nil {
		return nil
	}

	newPinned := make([]string, 0, len(*pinned))
	for _, name := range *pinned {
		if name != imageName {
			newPinned = append(newPinned, name)
		}
	}
	*pinned = newPinned
	o.ModifiedAt = time.Now().UTC().Format(time.RFC3339)
	r.orders[hash] = o

	return r.writeAll()
}

func (r *ImageOrdersRepository) ReorderPinnedImages(folderPath, sortMode string, newOrder []string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	hash := imageOrderHash(folderPath)
	o, hasExisting := r.orders[hash]
	if !hasExisting {
		return nil
	}

	pinned := getPinnedImageField(&o, sortMode)
	if pinned == nil {
		return nil
	}

	*pinned = newOrder
	o.ModifiedAt = time.Now().UTC().Format(time.RFC3339)
	r.orders[hash] = o

	return r.writeAll()
}
