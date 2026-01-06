package downloader

import (
	"context"
	"fmt"
	"io"
	"manga-visor/internal/persistence"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type Module struct {
	ctx        context.Context
	pm         *persistence.DownloaderManager
	sm         *persistence.SettingsManager
	algorithms []DownloaderInterface
	activeJobs sync.Map // map[string]*activeJob
}

type activeJob struct {
	cancel context.CancelFunc
}

func NewModule(pm *persistence.DownloaderManager, sm *persistence.SettingsManager) *Module {
	return &Module{
		pm: pm,
		sm: sm,
		algorithms: []DownloaderInterface{
			&HitomiDownloader{},
			&ManhwaWebDownloader{},
			&ZonaTMODownloader{},
			&MangaDexDownloader{},
			&NHentaiDownloader{},
		},
	}
}

func (m *Module) SetContext(ctx context.Context) {
	m.ctx = ctx
}

func (m *Module) GetHistory() []persistence.DownloadJob {
	return m.pm.GetJobs()
}

func (m *Module) ClearHistory() {
	m.pm.ClearJobs()
}

func (m *Module) RemoveJob(id string) {
	m.pm.RemoveJob(id)
}

func (m *Module) StartDownload(url string) (string, error) {
	var algo DownloaderInterface
	for _, a := range m.algorithms {
		if a.CanHandle(url) {
			algo = a
			break
		}
	}

	if algo == nil {
		return "", fmt.Errorf("no algorithm found for this URL")
	}

	info, err := algo.GetImages(url)
	if err != nil {
		return "", err
	}

	jobID := fmt.Sprintf("%d", time.Now().UnixNano())

	// Create job in persistence
	job := persistence.DownloadJob{
		ID:          jobID,
		URL:         url,
		Site:        algo.GetSiteID(),
		SeriesName:  info.SeriesName,
		ChapterName: info.ChapterName,
		Status:      persistence.StatusPending,
		Progress:    0,
		TotalPages:  len(info.Images),
		CreatedAt:   time.Now(),
	}
	m.pm.AddJob(job)

	// Start async download
	go m.runDownload(job, info)

	return jobID, nil
}

func (m *Module) runDownload(job persistence.DownloadJob, info *SiteInfo) {
	ctx, cancel := context.WithCancel(context.Background())
	m.activeJobs.Store(job.ID, &activeJob{cancel: cancel})
	defer m.activeJobs.Delete(job.ID)

	m.pm.UpdateJob(job.ID, map[string]interface{}{"status": persistence.StatusRunning})
	m.notifyUpdate()

	settings := m.sm.Get()
	basePath := settings.DownloadPath
	if basePath == "" {
		// Use app data dir / downloads
		homeDir, _ := os.UserHomeDir()
		basePath = filepath.Join(homeDir, ".manga-visor", "downloads")
	}

	// Folder structure: Site / Series / Chapter
	safeSeries := sanitizeFilename(info.SeriesName)
	safeChapter := sanitizeFilename(info.ChapterName)
	downloadDir := filepath.Join(basePath, info.SiteID, safeSeries, safeChapter)

	if err := os.MkdirAll(downloadDir, 0755); err != nil {
		m.failJob(job.ID, err.Error())
		return
	}

	m.pm.UpdateJob(job.ID, map[string]interface{}{"path": downloadDir})

	for i, img := range info.Images {
		select {
		case <-ctx.Done():
			m.pm.UpdateJob(job.ID, map[string]interface{}{"status": persistence.StatusCancelled})
			m.notifyUpdate()
			return
		default:
			// Add a small delay between requests to avoid rate limiting
			if i > 0 && info.DownloadDelay > 0 {
				time.Sleep(info.DownloadDelay)
			}

			err := downloadFile(img.URL, filepath.Join(downloadDir, img.Filename), img.Headers)
			if err != nil {
				// Retry is handled inside downloadFile, if it still fails, we fail the job
				m.failJob(job.ID, fmt.Sprintf("Failed to download page %d: %v", i+1, err))
				return
			}
			m.pm.UpdateJob(job.ID, map[string]interface{}{"progress": i + 1})
			m.notifyUpdate()
		}
	}

	now := time.Now()
	m.pm.UpdateJob(job.ID, map[string]interface{}{
		"status":      persistence.StatusCompleted,
		"completedAt": now,
	})
	m.notifyUpdate()
}

func (m *Module) failJob(id string, err string) {
	m.pm.UpdateJob(id, map[string]interface{}{
		"status": persistence.StatusFailed,
		"error":  err,
	})
	m.notifyUpdate()
}

func (m *Module) notifyUpdate() {
	if m.ctx != nil {
		runtime.EventsEmit(m.ctx, "download_updated")
	}
}

func sanitizeFilename(name string) string {
	// Simple sanitization
	invalid := []string{"/", "\\", ":", "*", "?", "\"", "<", ">", "|"}
	res := name
	for _, char := range invalid {
		res = strings.ReplaceAll(res, char, "_")
	}
	return strings.TrimSpace(res)
}

func downloadFile(url string, path string, headers map[string]string) error {
	client := &http.Client{}
	var lastErr error

	// Retry configuration
	maxRetries := 3
	baseDelay := 2 * time.Second

	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff: 2s, 4s, 8s
			sleepDuration := baseDelay * time.Duration(1<<uint(attempt-1))
			time.Sleep(sleepDuration)
		}

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return err // Fatal error building request
		}

		// Add headers
		if headers != nil {
			for k, v := range headers {
				req.Header.Set(k, v)
			}
		} else {
			req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
		}

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			continue // Network error, retry
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			// Success
			out, err := os.Create(path)
			if err != nil {
				return err // File system error
			}
			defer out.Close()

			_, err = io.Copy(out, resp.Body)
			return err
		}

		// Handle non-200 status codes
		lastErr = fmt.Errorf("bad status: %s", resp.Status)

		// If it's a 503 or 429, we definitely want to retry.
		// For others (like 404), maybe not, but simple retry mechanism for now covers transient issues.
		// If 404, usually retrying won't help, but keeping it simple.
		if resp.StatusCode != http.StatusServiceUnavailable && resp.StatusCode != http.StatusTooManyRequests {
			// Optional: break here if we strictly don't want to retry 404s
		}
	}

	return fmt.Errorf("failed after %d retries: %v", maxRetries, lastErr)
}
