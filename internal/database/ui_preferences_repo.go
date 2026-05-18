package database

import (
	"encoding/json"
	"fmt"
	"sync"
)

type ExplorerSortPref struct {
	SortBy    string `json:"sortBy"`
	SortOrder string `json:"sortOrder"`
}

type SeriesDetailsSortPref struct {
	SortBy    string `json:"sortBy"`
	SortOrder string `json:"sortOrder"`
}

type UIPreferencesRepository struct {
	db *Database
	mu sync.RWMutex
}

func NewUIPreferencesRepository(db *Database) *UIPreferencesRepository {
	return &UIPreferencesRepository{db: db}
}

func (r *UIPreferencesRepository) GetString(key, fallback string) string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var value string
	err := r.db.db.QueryRow("SELECT value FROM ui_preferences WHERE key = ?", key).Scan(&value)
	if err != nil {
		return fallback
	}
	return value
}

func (r *UIPreferencesRepository) SetString(key, value string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	_, err := r.db.db.Exec("INSERT OR REPLACE INTO ui_preferences (key, value) VALUES (?, ?)", key, value)
	return err
}

func (r *UIPreferencesRepository) GetJSON(key string, target interface{}) error {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var value string
	err := r.db.db.QueryRow("SELECT value FROM ui_preferences WHERE key = ?", key).Scan(&value)
	if err != nil {
		return err
	}
	return json.Unmarshal([]byte(value), target)
}

func (r *UIPreferencesRepository) SetJSON(key string, value interface{}) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	b, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshal ui pref: %w", err)
	}
	_, err = r.db.db.Exec("INSERT OR REPLACE INTO ui_preferences (key, value) VALUES (?, ?)", key, string(b))
	return err
}

func (r *UIPreferencesRepository) Delete(key string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	_, err := r.db.db.Exec("DELETE FROM ui_preferences WHERE key = ?", key)
	return err
}

func (r *UIPreferencesRepository) GetExplorerSortPreferences() map[string]ExplorerSortPref {
	var result map[string]ExplorerSortPref
	if err := r.GetJSON("explorerSort", &result); err != nil {
		return make(map[string]ExplorerSortPref)
	}
	return result
}

func (r *UIPreferencesRepository) GetExplorerSortPreference(path string) ExplorerSortPref {
	prefs := r.GetExplorerSortPreferences()
	if p, ok := prefs[path]; ok {
		return p
	}
	return ExplorerSortPref{SortBy: "name", SortOrder: "asc"}
}

func (r *UIPreferencesRepository) SetExplorerSortPreference(path string, sortBy, sortOrder string) error {
	prefs := r.GetExplorerSortPreferences()
	prefs[path] = ExplorerSortPref{SortBy: sortBy, SortOrder: sortOrder}
	return r.SetJSON("explorerSort", prefs)
}

func (r *UIPreferencesRepository) GetSeriesSortBy() string {
	return r.GetString("seriesSortBy", "name")
}

func (r *UIPreferencesRepository) SetSeriesSortBy(value string) error {
	return r.SetString("seriesSortBy", value)
}

func (r *UIPreferencesRepository) GetSeriesSortOrder() string {
	return r.GetString("seriesSortOrder", "asc")
}

func (r *UIPreferencesRepository) SetSeriesSortOrder(value string) error {
	return r.SetString("seriesSortOrder", value)
}

func (r *UIPreferencesRepository) GetOneShotSortBy() string {
	return r.GetString("oneShotSortBy", "name")
}

func (r *UIPreferencesRepository) SetOneShotSortBy(value string) error {
	return r.SetString("oneShotSortBy", value)
}

func (r *UIPreferencesRepository) GetOneShotSortOrder() string {
	return r.GetString("oneShotSortOrder", "asc")
}

func (r *UIPreferencesRepository) SetOneShotSortOrder(value string) error {
	return r.SetString("oneShotSortOrder", value)
}

func (r *UIPreferencesRepository) GetSeriesDetailsSortPreferences() map[string]SeriesDetailsSortPref {
	var result map[string]SeriesDetailsSortPref
	if err := r.GetJSON("seriesDetailsSort", &result); err != nil {
		return make(map[string]SeriesDetailsSortPref)
	}
	return result
}

func (r *UIPreferencesRepository) GetSeriesDetailsSortPreference(seriesPath string) SeriesDetailsSortPref {
	prefs := r.GetSeriesDetailsSortPreferences()
	if p, ok := prefs[seriesPath]; ok {
		return p
	}
	return SeriesDetailsSortPref{SortBy: "name", SortOrder: "asc"}
}

func (r *UIPreferencesRepository) SetSeriesDetailsSortPreference(seriesPath, sortBy, sortOrder string) error {
	prefs := r.GetSeriesDetailsSortPreferences()
	prefs[seriesPath] = SeriesDetailsSortPref{SortBy: sortBy, SortOrder: sortOrder}
	return r.SetJSON("seriesDetailsSort", prefs)
}

func (r *UIPreferencesRepository) GetHistoryViewMode() string {
	return r.GetString("historyViewMode", "list")
}

func (r *UIPreferencesRepository) SetHistoryViewMode(value string) error {
	return r.SetString("historyViewMode", value)
}

func (r *UIPreferencesRepository) GetExplorerRootViewMode() string {
	return r.GetString("explorerRootViewMode", "grid")
}

func (r *UIPreferencesRepository) SetExplorerRootViewMode(value string) error {
	return r.SetString("explorerRootViewMode", value)
}
