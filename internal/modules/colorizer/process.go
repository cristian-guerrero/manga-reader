package colorizer

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
)

type managedProcess struct {
	cmd     *exec.Cmd
	mu      sync.Mutex
	running bool
}

func (p *managedProcess) isRunning() bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.running
}

func (p *managedProcess) stop() {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.cmd != nil && p.cmd.Process != nil {
		// Try to kill the process tree
		taskkill := exec.Command("taskkill", "/F", "/T", "/PID", fmt.Sprintf("%d", p.cmd.Process.Pid))
		taskkill.Run()
		p.cmd.Process.Kill()
		p.running = false
	}
}

// CleanupOrphanedPython kills all python.exe processes left over from the app
func CleanupOrphanedPython() {
	taskkillAll := exec.Command("taskkill", "/F", "/IM", "python.exe")
	taskkillAll.Run()
}

func getExecutableName() string {
	if _, err := exec.LookPath("python"); err == nil {
		return "python"
	}
	if _, err := exec.LookPath("python3"); err == nil {
		return "python3"
	}
	return "python"
}

func detectCUDA() bool {
	cmd := exec.Command("nvidia-smi")
	if err := cmd.Run(); err == nil {
		return true
	}
	return false
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return info.IsDir()
}

func sanitizePath(path string) string {
	return strings.TrimSpace(path)
}

func getDefaultDataDir() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(homeDir, ".manga-visor", "colorizer"), nil
}
