package database

import (
	"testing"
)

func TestNewUIPreferencesRepository(t *testing.T) {
	db := newTestDB(t)
	r := NewUIPreferencesRepository(db)
	if r == nil {
		t.Fatal("NewUIPreferencesRepository returned nil")
	}
}

func TestUIPreferencesRepository_GetString_Default(t *testing.T) {
	db := newTestDB(t)
	r := NewUIPreferencesRepository(db)

	got := r.GetString("nonexistent", "defaultVal")
	if got != "defaultVal" {
		t.Errorf("GetString() = %q, want %q", got, "defaultVal")
	}
}

func TestUIPreferencesRepository_SetAndGetString(t *testing.T) {
	db := newTestDB(t)
	r := NewUIPreferencesRepository(db)

	if err := r.SetString("theme", "dark"); err != nil {
		t.Fatalf("SetString() error = %v", err)
	}

	got := r.GetString("theme", "light")
	if got != "dark" {
		t.Errorf("GetString() = %q, want %q", got, "dark")
	}
}

func TestUIPreferencesRepository_SetAndGetJSON(t *testing.T) {
	db := newTestDB(t)
	r := NewUIPreferencesRepository(db)

	type prefs struct {
		Order string `json:"order"`
	}
	input := prefs{Order: "custom"}

	if err := r.SetJSON("sortPrefs", input); err != nil {
		t.Fatalf("SetJSON() error = %v", err)
	}

	var result prefs
	if err := r.GetJSON("sortPrefs", &result); err != nil {
		t.Fatalf("GetJSON() error = %v", err)
	}
	if result.Order != "custom" {
		t.Errorf("order = %q, want %q", result.Order, "custom")
	}
}

func TestUIPreferencesRepository_Delete(t *testing.T) {
	db := newTestDB(t)
	r := NewUIPreferencesRepository(db)

	r.SetString("theme", "dark")
	r.Delete("theme")

	got := r.GetString("theme", "fallback")
	if got != "fallback" {
		t.Errorf("after Delete, GetString() = %q, want %q", got, "fallback")
	}
}

func TestUIPreferencesRepository_ExplorerSortPreferences(t *testing.T) {
	db := newTestDB(t)
	r := NewUIPreferencesRepository(db)

	pref := r.GetExplorerSortPreference("/manga")
	if pref.SortBy != "name" || pref.SortOrder != "asc" {
		t.Errorf("default = %+v, want {name asc}", pref)
	}

	if err := r.SetExplorerSortPreference("/manga", "date", "desc"); err != nil {
		t.Fatalf("SetExplorerSortPreference() error = %v", err)
	}

	pref = r.GetExplorerSortPreference("/manga")
	if pref.SortBy != "date" || pref.SortOrder != "desc" {
		t.Errorf("after set = %+v, want {date desc}", pref)
	}
}

func TestUIPreferencesRepository_SeriesSort(t *testing.T) {
	db := newTestDB(t)
	r := NewUIPreferencesRepository(db)

	if got := r.GetSeriesSortBy(); got != "name" {
		t.Errorf("default SeriesSortBy = %q, want %q", got, "name")
	}
	if got := r.GetSeriesSortOrder(); got != "asc" {
		t.Errorf("default SeriesSortOrder = %q, want %q", got, "asc")
	}

	r.SetSeriesSortBy("date")
	r.SetSeriesSortOrder("desc")

	if got := r.GetSeriesSortBy(); got != "date" {
		t.Errorf("SeriesSortBy = %q, want %q", got, "date")
	}
	if got := r.GetSeriesSortOrder(); got != "desc" {
		t.Errorf("SeriesSortOrder = %q, want %q", got, "desc")
	}
}

func TestUIPreferencesRepository_OneShotSort(t *testing.T) {
	db := newTestDB(t)
	r := NewUIPreferencesRepository(db)

	if got := r.GetOneShotSortBy(); got != "name" {
		t.Errorf("default = %q", got)
	}

	r.SetOneShotSortBy("date")
	r.SetOneShotSortOrder("desc")

	if got := r.GetOneShotSortBy(); got != "date" {
		t.Errorf("OneShotSortBy = %q", got)
	}
	if got := r.GetOneShotSortOrder(); got != "desc" {
		t.Errorf("OneShotSortOrder = %q", got)
	}
}

func TestUIPreferencesRepository_SeriesDetailsSort(t *testing.T) {
	db := newTestDB(t)
	r := NewUIPreferencesRepository(db)

	pref := r.GetSeriesDetailsSortPreference("/series/test")
	if pref.SortBy != "name" || pref.SortOrder != "asc" {
		t.Errorf("default = %+v", pref)
	}

	r.SetSeriesDetailsSortPreference("/series/test", "date", "desc")
	pref = r.GetSeriesDetailsSortPreference("/series/test")
	if pref.SortBy != "date" || pref.SortOrder != "desc" {
		t.Errorf("after set = %+v", pref)
	}
}

func TestUIPreferencesRepository_HistoryViewMode(t *testing.T) {
	db := newTestDB(t)
	r := NewUIPreferencesRepository(db)

	if got := r.GetHistoryViewMode(); got != "list" {
		t.Errorf("default = %q", got)
	}

	r.SetHistoryViewMode("grid")
	if got := r.GetHistoryViewMode(); got != "grid" {
		t.Errorf("after set = %q", got)
	}
}

func TestUIPreferencesRepository_ExplorerRootViewMode(t *testing.T) {
	db := newTestDB(t)
	r := NewUIPreferencesRepository(db)

	if got := r.GetExplorerRootViewMode(); got != "grid" {
		t.Errorf("default = %q", got)
	}

	r.SetExplorerRootViewMode("list")
	if got := r.GetExplorerRootViewMode(); got != "list" {
		t.Errorf("after set = %q", got)
	}
}

func TestUIPreferencesRepository_SetDB(t *testing.T) {
	db1 := newTestDB(t)
	db2 := newTestDB(t)

	r := NewUIPreferencesRepository(db1)
	r.SetString("theme", "dark")

	r.SetDB(db2)
	got := r.GetString("theme", "fallback")
	if got != "fallback" {
		t.Error("after SetDB, should read from new DB")
	}
}
