package fileloader

import (
	"embed"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

const embedPrefix = "frontend/dist"

// ExtractAssets extracts all files from the embedded frontend/dist to the target directory.
// Always cleans the target directory first to ensure a fresh extraction.
func ExtractAssets(assets embed.FS, targetDir string) error {
	// Always delete old extraction to ensure clean state
	if err := os.RemoveAll(targetDir); err != nil {
		return fmt.Errorf("remove old extraction: %w", err)
	}

	// Create target directory
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return fmt.Errorf("create target directory: %w", err)
	}

	// Walk embedded files and extract them
	err := fs.WalkDir(assets, embedPrefix, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			return nil
		}

		// Strip the embed prefix to get the relative path within dist
		relPath, err := filepath.Rel(embedPrefix, path)
		if err != nil {
			return fmt.Errorf("compute relative path for %s: %w", path, err)
		}

		// Read embedded file
		data, err := assets.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read embedded file %s: %w", path, err)
		}

		// Write to target directory
		targetPath := filepath.Join(targetDir, relPath)
		if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
			return fmt.Errorf("create directory for %s: %w", targetPath, err)
		}

		if err := os.WriteFile(targetPath, data, 0644); err != nil {
			return fmt.Errorf("write file %s: %w", targetPath, err)
		}

		return nil
	})
	if err != nil {
		return fmt.Errorf("walk embedded assets: %w", err)
	}

	return nil
}

// InjectShimIntoHTML reads index.html from targetDir, adds <script src="shim.js"></script>
// before </head>, and writes it back.
func InjectShimIntoHTML(targetDir string) error {
	indexHTML := filepath.Join(targetDir, "index.html")

	data, err := os.ReadFile(indexHTML)
	if err != nil {
		return fmt.Errorf("read index.html: %w", err)
	}

	content := string(data)

	// Only inject if not already present
	if strings.Contains(content, `<script src="shim.js">`) {
		return nil
	}

	// Inject before </head>
	content = strings.Replace(content, "</head>", `<script src="shim.js"></script>
</head>`, 1)

	if err := os.WriteFile(indexHTML, []byte(content), 0644); err != nil {
		return fmt.Errorf("write index.html: %w", err)
	}

	return nil
}

// WriteFile writes a file to the target directory.
func WriteFile(targetDir, filename string, content []byte) error {
	targetPath := filepath.Join(targetDir, filename)
	if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
		return fmt.Errorf("create directory: %w", err)
	}
	return os.WriteFile(targetPath, content, 0644)
}

// ReadFile reads a file from the target directory.
func ReadFile(targetDir, filename string) ([]byte, error) {
	targetPath := filepath.Join(targetDir, filename)
	return os.ReadFile(targetPath)
}

// GetWebDir returns the web assets directory path.
func GetWebDir() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}
	return filepath.Join(homeDir, ".manga-visor", "web")
}
