package database

import (
	"encoding/json"
	"fmt"
	"manga-visor/internal/persistence"
	"sync"
)

type TabsRepository struct {
	db   *Database
	data *persistence.TabsData
	mu   sync.RWMutex
}

func (r *TabsRepository) SetDB(db *Database) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.db = db
}

func NewTabsRepository(db *Database) *TabsRepository {
	r := &TabsRepository{db: db}
	if err := r.Load(); err != nil {
		r.data = &persistence.TabsData{Tabs: []persistence.Tab{}}
	}
	return r
}

func (r *TabsRepository) GetTabs() *persistence.TabsData {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if r.data == nil {
		return &persistence.TabsData{Tabs: []persistence.Tab{}}
	}
	cp := &persistence.TabsData{
		ActiveTabID: r.data.ActiveTabID,
		Tabs:        make([]persistence.Tab, len(r.data.Tabs)),
	}
	copy(cp.Tabs, r.data.Tabs)
	return cp
}

func (r *TabsRepository) SaveTabs(data *persistence.TabsData) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.data = data
	return r.writeAll()
}

func (r *TabsRepository) Load() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	row := r.db.db.QueryRow("SELECT id, active_tab_id, data FROM tabs LIMIT 1")
	var id, activeTabID, dataStr string
	if err := row.Scan(&id, &activeTabID, &dataStr); err != nil {
		r.data = &persistence.TabsData{Tabs: []persistence.Tab{}}
		return nil
	}

	data := &persistence.TabsData{
		ActiveTabID: activeTabID,
		Tabs:        []persistence.Tab{},
	}

	if dataStr != "" {
		var tabs []persistence.Tab
		if err := json.Unmarshal([]byte(dataStr), &tabs); err == nil {
			data.Tabs = tabs
		}
	}

	if data.Tabs == nil {
		data.Tabs = []persistence.Tab{}
	}

	r.data = data
	return nil
}

func (r *TabsRepository) writeAll() error {
	if r.data == nil {
		return nil
	}

	tabsJSON := "[]"
	if len(r.data.Tabs) > 0 {
		b, err := json.Marshal(r.data.Tabs)
		if err != nil {
			return fmt.Errorf("marshal tabs: %w", err)
		}
		tabsJSON = string(b)
	}

	_, err := r.db.db.Exec(`INSERT OR REPLACE INTO tabs (id, active_tab_id, data) VALUES ('tabs', ?, ?)`, r.data.ActiveTabID, tabsJSON)
	return err
}
