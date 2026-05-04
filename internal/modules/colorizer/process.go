package colorizer

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"

	"golang.org/x/sys/windows"
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
		taskkill := exec.Command("taskkill", "/F", "/T", "/PID", fmt.Sprintf("%d", p.cmd.Process.Pid))
		taskkill.SysProcAttr = hideConsoleAttr()
		taskkill.Run()
		p.cmd.Process.Kill()
		p.running = false
	}
}

// CleanupOrphanedPython kills all python.exe processes left over from the app
func CleanupOrphanedPython() {
	taskkillAll := exec.Command("taskkill", "/F", "/IM", "python.exe")
	taskkillAll.SysProcAttr = hideConsoleAttr()
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
	cmd.SysProcAttr = hideConsoleAttr()
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

func hideConsoleAttr() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{
		CreationFlags: windows.CREATE_NO_WINDOW,
	}
}

func setupHiddenCommand(cmd *exec.Cmd) {
	cmd.SysProcAttr = hideConsoleAttr()
	if cmd.Env == nil {
		cmd.Env = os.Environ()
	}
	cmd.Env = append(cmd.Env, "PYTHONUNBUFFERED=1", "PYTHONDONTWRITEBYTECODE=1")
}

func hideEnv() []string {
	env := os.Environ()
	env = append(env, "PYTHONUNBUFFERED=1", "PYTHONDONTWRITEBYTECODE=1")
	return env
}

func runHiddenPythonDir(dir, pythonPath string, args ...string) (string, error) {
	cmd := exec.Command(pythonPath, args...)
	cmd.Dir = dir
	cmd.SysProcAttr = hideConsoleAttr()
	cmd.Env = hideEnv()
	out, err := cmd.CombinedOutput()
	return string(out), err
}

func runHiddenCommandDir(dir, name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	cmd.SysProcAttr = hideConsoleAttr()
	cmd.Env = hideEnv()
	out, err := cmd.CombinedOutput()
	return string(out), err
}
