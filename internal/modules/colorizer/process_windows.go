//go:build windows

package colorizer

import (
	"fmt"
	"os/exec"
	"syscall"

	"golang.org/x/sys/windows"
)

func getSysProcAttr() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{
		CreationFlags: windows.CREATE_NO_WINDOW,
	}
}

func (p *managedProcess) stop() {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.cmd != nil && p.cmd.Process != nil {
		taskkill := exec.Command("taskkill", "/F", "/T", "/PID", fmt.Sprintf("%d", p.cmd.Process.Pid))
		taskkill.SysProcAttr = getSysProcAttr()
		taskkill.Run()
		p.cmd.Process.Kill()
		p.running = false
	}
}

func CleanupOrphanedPython() {
	taskkillAll := exec.Command("taskkill", "/F", "/IM", "python.exe")
	taskkillAll.SysProcAttr = getSysProcAttr()
	taskkillAll.Run()
}
