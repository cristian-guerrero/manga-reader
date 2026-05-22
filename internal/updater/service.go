package updater

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"manga-visor/internal/version"
)

type Service struct {
	api            *GitHubAPI
	dataDir        string
	lastCheck      time.Time
	lastErr        error
	lastResult     *UpdateInfo
	pendingVersion string
}

func NewService(dataDir string) *Service {
	return &Service{
		api:     NewGitHubAPI(),
		dataDir: dataDir,
	}
}

func (s *Service) CheckForUpdate() *UpdateInfo {
	if time.Since(s.lastCheck) < CheckInterval && s.lastResult != nil {
		return s.lastResult
	}
	s.lastCheck = time.Now()

	if version.Version == "dev" {
		s.lastResult = &UpdateInfo{Available: false}
		return s.lastResult
	}

	release, err := s.api.getLatestRelease()
	if err != nil {
		s.lastErr = fmt.Errorf("check update: %w", err)
		s.lastResult = &UpdateInfo{Available: false}
		return s.lastResult
	}
	if release == nil {
		s.lastResult = &UpdateInfo{Available: false}
		return s.lastResult
	}

	currentBuild := parseBuildNumber(version.Version)
	latestBuild := parseBuildNumber(release.TagName)

	if latestBuild == 0 || latestBuild <= currentBuild {
		s.lastResult = &UpdateInfo{Available: false}
		return s.lastResult
	}

	asset := s.api.findAsset(release)
	if asset == nil {
		s.lastErr = fmt.Errorf("no asset found for platform %s/%s", runtime.GOOS, runtime.GOARCH)
		s.lastResult = &UpdateInfo{Available: false}
		return s.lastResult
	}

	s.lastResult = &UpdateInfo{
		Available: true,
		Version:   release.TagName,
		URL:       asset.DownloadURL,
	}

	s.lastErr = nil
	return s.lastResult
}

func (s *Service) DownloadUpdate(info *UpdateInfo) error {
	s.pendingVersion = info.Version

	asset := &Asset{
		Name:        filepath.Base(info.URL),
		DownloadURL: info.URL,
	}

	tmpDir := filepath.Join(s.dataDir, "updates")
	path, err := s.api.DownloadAsset(asset, tmpDir)
	if err != nil {
		return fmt.Errorf("download: %w", err)
	}

	if runtime.GOOS == "windows" {
		dest := filepath.Join(tmpDir, "manga-visor2-updated")
		if err := copyFile(path, dest); err != nil {
			return fmt.Errorf("copy windows binary: %w", err)
		}
		os.Remove(path)
		path = dest
	}

	if runtime.GOOS == "darwin" {
		extractDir := filepath.Join(tmpDir, "extracted")
		if err := extractZip(path, extractDir); err != nil {
			return fmt.Errorf("extract macos: %w", err)
		}
		appBundle := filepath.Join(extractDir, "Manga Visor.app")
		entries, _ := os.ReadDir(extractDir)
		for _, e := range entries {
			if e.IsDir() && strings.HasSuffix(e.Name(), ".app") {
				appBundle = filepath.Join(extractDir, e.Name())
				break
			}
		}
		binDir := filepath.Join(appBundle, "Contents", "MacOS")
		entries2, _ := os.ReadDir(binDir)
		var binPath string
		for _, e := range entries2 {
			if !e.IsDir() {
				binPath = filepath.Join(binDir, e.Name())
				break
			}
		}
		if binPath == "" {
			return fmt.Errorf("no binary found in macos bundle")
		}
		dest := filepath.Join(tmpDir, "manga-visor2-macos-updated")
		if err := copyFile(binPath, dest); err != nil {
			return fmt.Errorf("copy macos binary: %w", err)
		}
		path = dest
	}

	if runtime.GOOS == "darwin" || strings.HasSuffix(path, ".zip") {
		extractDir := filepath.Join(tmpDir, "extracted")
		if err := extractZip(path, extractDir); err != nil {
			return fmt.Errorf("extract: %w", err)
		}
		entries, _ := os.ReadDir(extractDir)
		for _, e := range entries {
			if !e.IsDir() {
				dest := filepath.Join(tmpDir, "manga-visor2-updated")
				if err := copyFile(filepath.Join(extractDir, e.Name()), dest); err != nil {
					return fmt.Errorf("move extracted binary: %w", err)
				}
				path = dest
				break
			}
		}
	}

	// Persist version for ApplyUpdate to read from a fresh process
	versionPath := filepath.Join(tmpDir, "manga-visor2-version")
	os.WriteFile(versionPath, []byte(info.Version), 0644)

	return nil
}

func (s *Service) PendingVersion() string {
	return s.pendingVersion
}

func (s *Service) WasJustUpdated() bool {
	markerPath := filepath.Join(s.dataDir, ".updated-marker")
	data, err := os.ReadFile(markerPath)
	if err != nil {
		return false
	}
	os.Remove(markerPath)

	// Clean up old binary from previous update
	exe, _ := os.Executable()
	oldBinary := exe + ".old"
	os.Remove(oldBinary)

	return strings.TrimSpace(string(data)) == version.Version
}

func (s *Service) ApplyUpdate() error {
	exe, err := os.Executable()
	if err != nil {
		return fmt.Errorf("get executable: %w", err)
	}

	tmpDir := filepath.Join(s.dataDir, "updates")

	// If pendingVersion is not set (fresh process), load from the version file
	if s.pendingVersion == "" {
		versionPath := filepath.Join(tmpDir, "manga-visor2-version")
		if data, err := os.ReadFile(versionPath); err == nil {
			s.pendingVersion = strings.TrimSpace(string(data))
		}
	}

	// Without a version file we can't validate the binary — clean up stale files
	if s.pendingVersion == "" {
		os.RemoveAll(tmpDir)
		return fmt.Errorf("no version file for pending update, cleaned up stale files")
	}

	// Version guard: only apply if the pending version is actually newer
	currentBuild := parseBuildNumber(version.Version)
	pendingBuild := parseBuildNumber(s.pendingVersion)
	if pendingBuild <= currentBuild {
		os.RemoveAll(tmpDir)
		return fmt.Errorf("pending version %s is not newer than current version %s", s.pendingVersion, version.Version)
	}

	entries, err := os.ReadDir(tmpDir)
	if err != nil {
		return fmt.Errorf("read updates dir: %w", err)
	}

	var newBinary string
	for _, e := range entries {
		if !e.IsDir() && (e.Name() == "manga-visor2-updated" || e.Name() == "manga-visor2-macos-updated") {
			newBinary = filepath.Join(tmpDir, e.Name())
			break
		}
	}
	if newBinary == "" {
		return fmt.Errorf("no downloaded binary found")
	}

	if runtime.GOOS == "windows" {
		return s.applyUpdateWindows(exe, newBinary)
	}

	oldBinary := exe + ".old"

	// Clean up any leftover .old from a previous failed update
	os.Remove(oldBinary)

	if err := os.Rename(exe, oldBinary); err != nil {
		return fmt.Errorf("rename current -> old: %w", err)
	}

	data, err := os.ReadFile(newBinary)
	if err != nil {
		// Rollback: restore from .old
		if rbErr := os.Rename(oldBinary, exe); rbErr != nil {
			return fmt.Errorf("read new binary: %w (rollback also failed: %v)", err, rbErr)
		}
		return fmt.Errorf("read new binary: %w", err)
	}

	if err := os.WriteFile(exe, data, 0755); err != nil {
		// Rollback: restore from .old
		if rbErr := os.Rename(oldBinary, exe); rbErr != nil {
			return fmt.Errorf("write new binary: %w (rollback also failed: %v)", err, rbErr)
		}
		return fmt.Errorf("write new binary: %w", err)
	}

	// Don't remove .old here — let WasJustUpdated() clean it on next startup
	// This way if the new binary fails to launch, the old one is still available
	os.RemoveAll(tmpDir)

	s.logUpdate()
	if s.pendingVersion != "" {
		markerPath := filepath.Join(s.dataDir, ".updated-marker")
		os.WriteFile(markerPath, []byte(s.pendingVersion), 0644)
	}

	return nil
}

func (s *Service) GetState() UpdateState {
	tmpDir := filepath.Join(s.dataDir, "updates")
	entries, err := os.ReadDir(tmpDir)
	if err != nil {
		return UpdateState{Pending: false}
	}

	for _, e := range entries {
		if !e.IsDir() && (e.Name() == "manga-visor2-updated" || e.Name() == "manga-visor2-macos-updated") {
			info, err := e.Info()
			downloadedAt := ""
			if err == nil {
				downloadedAt = info.ModTime().Format(time.RFC3339)
			}
			return UpdateState{
				Pending:        true,
				PendingVersion: s.pendingVersion,
				DownloadedAt:   downloadedAt,
			}
		}
	}

	return UpdateState{Pending: false}
}

func (s *Service) LastError() error {
	return s.lastErr
}

func (s *Service) GetCurrentVersion() string {
	return version.Version
}

func (s *Service) logUpdate() {
	tag := s.pendingVersion
	if tag == "" {
		tag = version.Version
	}

	line := fmt.Sprintf("%s | %s\n", time.Now().Format(time.RFC3339), tag)

	logPath := filepath.Join(s.dataDir, "update-log.txt")
	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer f.Close()
	f.WriteString(line)
}
