//go:build windows

package updater

import (
	"fmt"
	"os"
	"path/filepath"
	"syscall"
	"unsafe"
)

func (s *Service) applyUpdateWindows(exe, newBinary string) error {
	oldBinary := exe + ".old"

	// Clean up any leftover .old from a previous failed update
	_ = os.Remove(oldBinary)

	// Step 1: Rename current exe to .old (works on Windows even while running)
	if err := os.Rename(exe, oldBinary); err != nil {
		return fmt.Errorf("rename current -> old: %w", err)
	}

	// Step 2: Rename new binary to original exe path
	if err := os.Rename(newBinary, exe); err != nil {
		// Rollback: restore old binary
		if rbErr := os.Rename(oldBinary, exe); rbErr != nil {
			return fmt.Errorf("rename new -> exe: %w (rollback also failed: %v)", err, rbErr)
		}
		return fmt.Errorf("rename new -> exe: %w", err)
	}

	// Step 3: Try to remove .old (will fail on Windows since process holds handle)
	// If it fails, hide it instead using SetFileAttributesW
	if err := os.Remove(oldBinary); err != nil {
		_ = hideFile(oldBinary)
	}

	s.logUpdate()
	if s.pendingVersion != "" {
		markerPath := filepath.Join(s.dataDir, ".updated-marker")
		os.WriteFile(markerPath, []byte(s.pendingVersion), 0644)
	}
	return nil
}

// hideFile sets the FILE_ATTRIBUTE_HIDDEN flag on the file using Windows API
func hideFile(path string) error {
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	setFileAttributes := kernel32.NewProc("SetFileAttributesW")

	utf16Str, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return err
	}

	r1, _, err := setFileAttributes.Call(uintptr(unsafe.Pointer(utf16Str)), 2) // FILE_ATTRIBUTE_HIDDEN = 2
	if r1 == 0 {
		return err
	}
	return nil
}
