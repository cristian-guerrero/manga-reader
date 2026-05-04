//go:build !windows

package colorizer

import (
	"fmt"
	"os/exec"
	"syscall"
)

func getSysProcAttr() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{
		Setsid: true,
	}
}

func (p *managedProcess) stop() {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.cmd != nil && p.cmd.Process != nil {
		p.cmd.Process.Signal(syscall.SIGTERM)
		p.running = false
	}
}

func CleanupOrphanedPython() {
	killAll := exec.Command("killall", "python3", "python")
	killAll.Run()
}
