package updater

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

type GitHubAPI struct {
	client    *http.Client
	owner     string
	repo      string
	baseOwner string
	baseRepo  string
}

func NewGitHubAPI() *GitHubAPI {
	return &GitHubAPI{
		client: &http.Client{Timeout: 10 * time.Second},
		owner:  repoOwner,
		repo:   repoName,
	}
}

func (g *GitHubAPI) getLatestRelease(channel Channel) (*Release, error) {
	switch channel {
	case ChannelDev:
		return g.getDevRelease()
	default:
		return g.getStableRelease()
	}
}

func (g *GitHubAPI) getStableRelease() (*Release, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", g.owner, g.repo)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := g.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 256))
		return nil, fmt.Errorf("GitHub API %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var release Release
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, fmt.Errorf("decode release: %w", err)
	}

	return &release, nil
}

func (g *GitHubAPI) getDevRelease() (*Release, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases?per_page=30", g.owner, g.repo)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := g.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 256))
		return nil, fmt.Errorf("GitHub API %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var releases []Release
	if err := json.NewDecoder(resp.Body).Decode(&releases); err != nil {
		return nil, fmt.Errorf("decode releases: %w", err)
	}

	var latest *Release
	for i := range releases {
		if strings.HasPrefix(releases[i].TagName, "latest-") {
			latest = &releases[i]
			break
		}
	}

	return latest, nil
}

func (g *GitHubAPI) findAsset(release *Release) *Asset {
	suffix := platformAssetSuffix()
	for i := range release.Assets {
		if strings.HasSuffix(release.Assets[i].Name, suffix) {
			return &release.Assets[i]
		}
	}
	return nil
}

func platformAssetSuffix() string {
	switch runtime.GOOS {
	case "windows":
		return ".exe"
	case "darwin":
		return "-macos.zip"
	default:
		return ""
	}
}

func (g *GitHubAPI) DownloadAsset(asset *Asset, destDir string) (string, error) {
	resp, err := g.client.Get(asset.DownloadURL)
	if err != nil {
		return "", fmt.Errorf("download: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download failed with status %d", resp.StatusCode)
	}

	if err := os.MkdirAll(destDir, 0755); err != nil {
		return "", fmt.Errorf("create temp dir: %w", err)
	}

	tmpFile := filepath.Join(destDir, asset.Name)
	f, err := os.Create(tmpFile)
	if err != nil {
		return "", fmt.Errorf("create file: %w", err)
	}

	written, err := io.Copy(f, resp.Body)
	f.Close()
	if err != nil {
		os.Remove(tmpFile)
		return "", fmt.Errorf("write file: %w", err)
	}
	if written == 0 {
		os.Remove(tmpFile)
		return "", fmt.Errorf("downloaded file is empty")
	}

	return tmpFile, nil
}
