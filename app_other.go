//go:build !windows

package main

// findWindowHandle is a stub for non-Windows platforms
func (a *App) findWindowHandle() uintptr {
	return 0
}

// updateTaskbarIconImpl is a stub for non-Windows platforms
func updateTaskbarIconImpl(a *App, base64Data string) {
	// No-op on non-Windows platforms
}

