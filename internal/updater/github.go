package updater

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"
)

var buildTagRegex = regexp.MustCompile(`^b(\d+)$`)

type GitHubAPI struct {
	client *http.Client
	owner  string
	repo   string
}

func NewGitHubAPI() *GitHubAPI {
	return &GitHubAPI{
		client: &http.Client{Timeout: 10 * time.Second},
		owner:  repoOwner,
		repo:   repoName,
	}
}

func (g *GitHubAPI) getLatestRelease() (*Release, error) {
	releases, err := g.listReleases()
	if err != nil {
		return nil, err
	}

	var buildReleases []Release
	for _, r := range releases {
		if !buildTagRegex.MatchString(r.TagName) {
			continue
		}
		buildReleases = append(buildReleases, r)
	}

	if len(buildReleases) == 0 {
		return nil, nil
	}

	sort.Slice(buildReleases, func(i, j int) bool {
		a := parseBuildNumber(buildReleases[i].TagName)
		b := parseBuildNumber(buildReleases[j].TagName)
		return a > b
	})

	return &buildReleases[0], nil
}

func parseBuildNumber(tag string) int {
	matches := buildTagRegex.FindStringSubmatch(tag)
	if matches == nil {
		return 0
	}
	n, _ := strconv.Atoi(matches[1])
	return n
}

func (g *GitHubAPI) listReleases() ([]Release, error) {
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

	return releases, nil
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
