package history

import (
	"context"
	"manga-visor/internal/persistence"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Module handles History logic
type Module struct {
	ctx      context.Context
	history  *persistence.HistoryManager
	settings *persistence.SettingsManager
}

// NewModule creates a new History module
func NewModule(history *persistence.HistoryManager, settings *persistence.SettingsManager) *Module {
	return &Module{
		history:  history,
		settings: settings,
	}
}

// SetContext sets the Wails context
func (m *Module) SetContext(ctx context.Context) {
	m.ctx = ctx
}

// GetHistory returns all history entries
func (m *Module) GetHistory() []persistence.HistoryEntry {
	return m.history.GetAll()
}

// GetHistoryEntry returns a specific history entry
func (m *Module) GetHistoryEntry(folderPath string) *persistence.HistoryEntry {
	return m.history.Get(folderPath)
}

// AddHistory adds or updates a history entry
func (m *Module) AddHistory(entry persistence.HistoryEntry) error {
	// Check if history is enabled
	settings := m.settings.Get()
	if !settings.EnableHistory {
		return nil
	}

	// Check for "Anonymous Mode" (All menus disabled)
	if len(settings.EnabledMenuItems) > 0 {
		allDisabled := true
		for _, v := range settings.EnabledMenuItems {
			if v {
				allDisabled = false
				break
			}
		}
		if allDisabled {
			return nil
		}
	}

	if err := m.history.Add(entry); err != nil {
		return err
	}
	runtime.EventsEmit(m.ctx, "history_updated")
	return nil
}

// RemoveHistory removes a history entry
func (m *Module) RemoveHistory(folderPath string) error {
	err := m.history.Remove(folderPath)
	if err == nil {
		runtime.EventsEmit(m.ctx, "history_updated")
	}
	return err
}

// ClearHistory clears all history
func (m *Module) ClearHistory() error {
	err := m.history.Clear()
	if err == nil {
		runtime.EventsEmit(m.ctx, "history_updated")
	}
	return err
}
