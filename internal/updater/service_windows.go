//go:build windows

package updater

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
)

func (s *Service) applyUpdateWindows(exe, newBinary string) error {
	oldBinary := exe + ".old"

	// Strategy: rename current exe to .old (works even while running),
	// then copy new binary to original path, then launch it.
	// Properly escape paths for Windows batch commands
	exe = strings.ReplaceAll(exe, `"`, `""`)
	oldBinary = strings.ReplaceAll(oldBinary, `"`, `""`)
	newBinary = strings.ReplaceAll(newBinary, `"`, `""`)

	cmdLine := fmt.Sprintf(
		`@echo off & timeout /t 2 /nobreak >nul & `+
			`move /y "%s" "%s" >nul 2>&1 & `+
			`copy /y "%s" "%s" >nul 2>&1 & `+
			`start "" "%s"`,
		exe, oldBinary,
		newBinary, exe,
		exe)

	cmd := exec.Command("cmd", "/c", cmdLine)
	cmd.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: 0x08000000, // CREATE_NO_WINDOW
	}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start update process: %w", err)
	}

	s.logUpdate()
	if s.pendingVersion != "" {
		markerPath := filepath.Join(s.dataDir, ".updated-marker")
		os.WriteFile(markerPath, []byte(s.pendingVersion), 0644)
	}
	return nil
}
