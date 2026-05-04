package colorizer

import (
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

func setupHiddenCommand(cmd *exec.Cmd) {
	cmd.SysProcAttr = getSysProcAttr()
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
	cmd.SysProcAttr = getSysProcAttr()
	cmd.Env = hideEnv()
	out, err := cmd.CombinedOutput()
	return string(out), err
}

func runHiddenCommandDir(dir, name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	cmd.SysProcAttr = getSysProcAttr()
	cmd.Env = hideEnv()
	out, err := cmd.CombinedOutput()
	return string(out), err
}
