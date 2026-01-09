//go:build windows

package main

import (
	"encoding/base64"
	"fmt"
	"strings"
	"syscall"
	"unsafe"
)

var (
	user32                       = syscall.NewLazyDLL("user32.dll")
	procSendMessage              = user32.NewProc("SendMessageW")
	procFindWindow               = user32.NewProc("FindWindowW")
	procEnumWindows              = user32.NewProc("EnumWindows")
	procGetWindowThreadProcessId = user32.NewProc("GetWindowThreadProcessId")
	procCreateIconFromResourceEx = user32.NewProc("CreateIconFromResourceEx")
)

const (
	WM_SETICON = 0x0080
	ICON_SMALL = 0
	ICON_BIG   = 1
)

// findWindowHandle searches for the application's window handle
func (a *App) findWindowHandle() uintptr {
	var hwnd uintptr
	cb := syscall.NewCallback(func(h uintptr, l uintptr) uintptr {
		var pid uint32
		procGetWindowThreadProcessId.Call(h, uintptr(unsafe.Pointer(&pid)))
		if pid == uint32(syscall.Getpid()) {
			hwnd = h
			return 0 // stop enumeration
		}
		return 1 // continue enumeration
	})
	procEnumWindows.Call(cb, 0)
	return hwnd
}

// updateTaskbarIconImpl implements UpdateTaskbarIcon for Windows
func updateTaskbarIconImpl(a *App, base64Data string) {
	// Remove prefix if present
	if strings.Contains(base64Data, ",") {
		parts := strings.Split(base64Data, ",")
		if len(parts) > 1 {
			base64Data = parts[1]
		}
	}

	iconBytes, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil || len(iconBytes) == 0 {
		if err != nil {
			fmt.Printf("Error decoding icon data: %v\n", err)
		}
		return
	}

	// Find the window handle
	hwnd := a.findWindowHandle()
	if hwnd == 0 {
		return
	}

	// Create icon from bytes
	hIcon, _, _ := procCreateIconFromResourceEx.Call(
		uintptr(unsafe.Pointer(&iconBytes[0])),
		uintptr(len(iconBytes)),
		1,          // fIcon = TRUE
		0x00030000, // dwVer = 0x00030000
		0, 0,       // cx, cy (0 means default)
		0, // Flags
	)

	if hIcon != 0 {
		procSendMessage.Call(hwnd, WM_SETICON, ICON_BIG, hIcon)
		procSendMessage.Call(hwnd, WM_SETICON, ICON_SMALL, hIcon)
	}
}

