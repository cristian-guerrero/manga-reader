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
	api             *GitHubAPI
	dataDir         string
	lastCheck       time.Time
	lastErr         error
	lastResult      *UpdateInfo
	pendingVersion  string
	pendingChannel  string
}

func NewService(dataDir string) *Service {
	return &Service{
		api:     NewGitHubAPI(),
		dataDir: dataDir,
	}
}

func (s *Service) CheckForUpdate(channel string) *UpdateInfo {
	if time.Since(s.lastCheck) < CheckInterval && s.lastResult != nil {
		return s.lastResult
	}
	s.lastCheck = time.Now()

	ch := Channel(channel)
	if ch != ChannelDev {
		ch = ChannelStable
	}

	release, err := s.api.getLatestRelease(ch)
	if err != nil {
		s.lastErr = fmt.Errorf("check update: %w", err)
		s.lastResult = &UpdateInfo{Available: false}
		return s.lastResult
	}
	if release == nil {
		s.lastResult = &UpdateInfo{Available: false}
		return s.lastResult
	}

	current := strings.TrimPrefix(version.Version, "v")
	latest := strings.TrimPrefix(release.TagName, "v")

	if latest == "" || latest == current {
		s.lastResult = &UpdateInfo{Available: false}
		return s.lastResult
	}

	if !isNewer(latest, current) {
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
		Channel:   string(ch),
	}
	s.lastErr = nil
	return s.lastResult
}

func (s *Service) DownloadUpdate(info *UpdateInfo) error {
	s.pendingVersion = info.Version
	s.pendingChannel = info.Channel

	asset := &Asset{
		Name:        filepath.Base(info.URL),
		DownloadURL: info.URL,
	}

	tmpDir := filepath.Join(s.dataDir, "updates")
	path, err := s.api.DownloadAsset(asset, tmpDir)
	if err != nil {
		return fmt.Errorf("download: %w", err)
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

	return nil
}

func (s *Service) ApplyUpdate() error {
	exe, err := os.Executable()
	if err != nil {
		return fmt.Errorf("get executable: %w", err)
	}

	tmpDir := filepath.Join(s.dataDir, "updates")
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

	oldBinary := exe + ".old"
	if err := os.Rename(exe, oldBinary); err != nil {
		return fmt.Errorf("rename current -> old: %w", err)
	}

	data, err := os.ReadFile(newBinary)
	if err != nil {
		os.Rename(oldBinary, exe)
		return fmt.Errorf("read new binary: %w", err)
	}

	if err := os.WriteFile(exe, data, 0755); err != nil {
		os.Rename(oldBinary, exe)
		return fmt.Errorf("write new binary: %w", err)
	}

	os.Remove(oldBinary)
	os.RemoveAll(tmpDir)

	s.logUpdate()

	return nil
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
	ch := s.pendingChannel
	if ch == "" {
		ch = "stable"
	}

	line := fmt.Sprintf("%s | %s | %s\n", time.Now().Format(time.RFC3339), tag, ch)

	logPath := filepath.Join(s.dataDir, "update-log.txt")
	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer f.Close()
	f.WriteString(line)
}
