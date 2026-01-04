package main

import (
	"context"
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Load settings to get window dimensions
	settings := app.GetSettings()
	width := settings.WindowWidth
	height := settings.WindowHeight
	if width < 800 {
		width = 1280
	}
	if height < 600 {
		height = 800
	}

	windowState := options.Normal
	if settings.WindowMaximized {
		windowState = options.Maximised
	}

	// Create application with options
	opts := &options.App{
		Title:             "Manga Visor",
		Width:             width,
		Height:            height,
		MinWidth:          800,
		MinHeight:         600,
		WindowStartState:  windowState,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		// Dark theme background color
		BackgroundColour: &options.RGBA{R: 10, G: 10, B: 15, A: 255},
		// Frameless window for custom title bar
		Frameless: true,
		// Start hidden if we need to position it manually or just show
		StartHidden: false,
		// Windows specific options
		Windows: &windows.Options{
			WebviewIsTransparent:              false,
			WindowIsTranslucent:               false,
			DisableWindowIcon:                 false,
			DisableFramelessWindowDecorations: false,
			WebviewUserDataPath:               "",
			WebviewBrowserPath:                "",
			Theme:                             windows.Dark,
		},
		// Linux specific options - enable GPU acceleration
		Linux: &linux.Options{
			WebviewGpuPolicy: linux.WebviewGpuPolicyAlways,
		},
		OnStartup:     app.startup,
		OnDomReady:    app.domReady,
		OnShutdown:    app.shutdown,
		OnBeforeClose: func(ctx context.Context) bool { app.SaveWindowState(); return false },
		DragAndDrop: &options.DragAndDrop{
			EnableFileDrop: true,
		},
		Bind: []interface{}{
			app,
		},
	}

	err := wails.Run(opts)

	if err != nil {
		println("Error:", err.Error())
	}
}
