//go:build windows

package updater

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

func (s *Service) applyUpdateWindows(exe, newBinary string) error {
	cmdLine := fmt.Sprintf(
		`timeout /t 2 /nobreak >nul & copy /y "%s" "%s" >nul & start "" "%s"`,
		newBinary, exe, exe)

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
