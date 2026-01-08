package downloader

import (
	"context"
	"fmt"
	"io"
	"manga-visor/internal/persistence"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type Module struct {
	ctx        context.Context
	pm         *persistence.DownloaderManager
	sm         *persistence.SettingsManager
	algorithms []DownloaderInterface
	activeJobs sync.Map // map[string]*activeJob

	// Queue management
	queueLock      sync.Mutex
	queues         map[string][]*queuedJob // map[siteID]queue
	activeCounts   map[string]int          // map[siteID]count
	maxConcurrency map[string]int          // map[siteID]limit (0 = unlimited)
}

type activeJob struct {
	cancel context.CancelFunc
}

type queuedJob struct {
	job  persistence.DownloadJob
	info *SiteInfo
}

func NewModule(pm *persistence.DownloaderManager, sm *persistence.SettingsManager) *Module {
	return &Module{
		pm:           pm,
		sm:           sm,
		queues:       make(map[string][]*queuedJob),
		activeCounts: make(map[string]int),
		maxConcurrency: map[string]int{
			"hitomi.la": 2, // modificado a 2 para probar
		},
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
	m.StartClipboardMonitor()
}

func (m *Module) GetHistory() []persistence.DownloadJob {
	return m.pm.GetJobs()
}

func (m *Module) ClearHistory() {
	m.pm.ClearJobs()
}

func (m *Module) ClearDownloadsData() error {
	// 1. Clear jobs history
	m.pm.ClearJobs()
	m.notifyUpdate()

	// 2. Delete actual files
	settings := m.sm.Get()
	basePath := settings.DownloadPath
	if basePath == "" {
		homeDir, _ := os.UserHomeDir()
		basePath = filepath.Join(homeDir, ".manga-visor", "downloads")
	}

	// Safety check: ensure basePath is not empty or root
	if basePath == "" || basePath == "/" || basePath == "\\" {
		return fmt.Errorf("invalid download path: %s", basePath)
	}

	// Remove all contents
	if err := os.RemoveAll(basePath); err != nil {
		return err
	}

	// Recreate directory
	return os.MkdirAll(basePath, 0755)
}

func (m *Module) RemoveJob(id string) {
	// Check if job is active and cancel it
	if activeJobData, ok := m.activeJobs.Load(id); ok {
		if aj, ok := activeJobData.(*activeJob); ok && aj.cancel != nil {
			aj.cancel() // Cancel the download context
			m.activeJobs.Delete(id)
			fmt.Printf("[Downloader] Cancelled active download: %s\n", id)
		}
	}

	// Check if job is in queue and remove it
	m.queueLock.Lock()
	for siteID, queue := range m.queues {
		newQueue := []*queuedJob{}
		for _, qj := range queue {
			if qj.job.ID != id {
				newQueue = append(newQueue, qj)
			} else {
				fmt.Printf("[Downloader] Removed job from queue: %s (site: %s)\n", id, siteID)
			}
		}
		m.queues[siteID] = newQueue
	}
	m.queueLock.Unlock()

	// Update job status to cancelled if it exists in persistence
	existingJobs := m.pm.GetJobs()
	for _, job := range existingJobs {
		if job.ID == id {
			if job.Status == persistence.StatusRunning || job.Status == persistence.StatusPending {
				m.pm.UpdateJob(id, map[string]interface{}{"status": persistence.StatusCancelled})
			}
			break
		}
	}

	// Remove from persistence
	m.pm.RemoveJob(id)
	m.notifyUpdate()
}

func (m *Module) FetchMangaInfo(url string) (*SiteInfo, error) {
	var algo DownloaderInterface
	for _, a := range m.algorithms {
		if a.CanHandle(url) {
			algo = a
			break
		}
	}

	if algo == nil {
		return nil, fmt.Errorf("no algorithm found for this URL")
	}

	return algo.GetImages(url)
}

func (m *Module) StartDownload(url string, overrideSeries string, overrideChapter string) (string, error) {
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

	// Check for existing jobs
	var existingJob *persistence.DownloadJob
	existingJobs := m.pm.GetJobs()
	for _, j := range existingJobs {
		if j.URL == url {
			temp := j
			existingJob = &temp
			break
		}
	}

	if existingJob != nil {
		if existingJob.Status == persistence.StatusCompleted {
			fmt.Printf("[Downloader] URL already completed: %s\n", url)
			// Notify frontend that this download already exists
			m.notifyUpdate()
			return existingJob.ID, nil
		}

		if existingJob.Status == persistence.StatusRunning || existingJob.Status == persistence.StatusPending {
			// Check if it's actually running in memory
			_, isActive := m.activeJobs.Load(existingJob.ID)

			// Also check if it's in the pending queue
			m.queueLock.Lock()
			inQueue := false
			if queue, ok := m.queues[existingJob.Site]; ok {
				for _, qj := range queue {
					if qj.job.ID == existingJob.ID {
						inQueue = true
						break
					}
				}
			}
			m.queueLock.Unlock()

			if isActive || inQueue {
				fmt.Printf("[Downloader] URL actually active/queued: %s\n", url)
				return existingJob.ID, nil
			}
			// If not active and not in queue, it's a zombie from previous run. Verify it.
			fmt.Printf("[Downloader] Found zombie job (Status: %s), resuming: %s\n", existingJob.Status, existingJob.ID)
		}
	}

	info, err := algo.GetImages(url)
	if err != nil {
		return "", err
	}

	if info.Type == "series" {
		return "", fmt.Errorf("this is a series URL, use FetchMangaInfo to select chapters")
	}

	// Apply overrides if provided
	if overrideSeries != "" {
		info.SeriesName = overrideSeries
	}
	if overrideChapter != "" {
		info.ChapterName = overrideChapter
	}

	var jobID string
	var job persistence.DownloadJob

	if existingJob != nil {
		// Resume existing job
		jobID = existingJob.ID
		job = *existingJob
		// Update details in case they changed (e.g. total pages, though unlikely for same URL)
		job.Status = persistence.StatusPending
		job.SeriesName = info.SeriesName
		job.ChapterName = info.ChapterName
		job.TotalPages = len(info.Images)

		// Update persistence status to Pending so UI shows it waiting
		m.pm.UpdateJob(jobID, map[string]interface{}{
			"status": persistence.StatusPending,
		})
	} else {
		// Create new job
		jobID = fmt.Sprintf("%d", time.Now().UnixNano())
		job = persistence.DownloadJob{
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
	}
	m.notifyUpdate() // Notify frontend

	// Check concurrency limits
	m.queueLock.Lock()
	defer m.queueLock.Unlock()

	siteID := algo.GetSiteID()
	limit := m.maxConcurrency[siteID]
	active := m.activeCounts[siteID]

	// If limit is 0 (unlimited) or active count is below limit, start immediately
	if limit == 0 || active < limit {
		m.activeCounts[siteID]++
		go m.runDownload(job, info)
	} else {
		// Queue the job
		m.queues[siteID] = append(m.queues[siteID], &queuedJob{job: job, info: info})
		// Job remains in Pending status in persistence
		fmt.Printf("[Downloader] Queued job %s for site %s (Active: %d, Limit: %d)\n", jobID, siteID, active, limit)
	}

	return jobID, nil
}

func (m *Module) runDownload(job persistence.DownloadJob, info *SiteInfo) {
	// Ensure we decrease active count and process next in queue when done
	defer m.finalizeJob(job.Site)

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
			// Check if file already exists (Resume capability)
			destFilename := sanitizeFilename(img.Filename)
			if destFilename == "" {
				destFilename = fmt.Sprintf("page_%04d", i+1)
			}
			destPath := filepath.Join(downloadDir, destFilename)
			if fInfo, err := os.Stat(destPath); err == nil && fInfo.Size() > 0 {
				fmt.Printf("[Downloader] Skipping existing file: %s\n", img.Filename)
				m.pm.UpdateJob(job.ID, map[string]interface{}{"progress": i + 1})
				m.notifyUpdate()
				continue
			}

			// Add a small delay between requests to avoid rate limiting
			if i > 0 && info.DownloadDelay > 0 {
				select {
				case <-ctx.Done():
					m.pm.UpdateJob(job.ID, map[string]interface{}{"status": persistence.StatusCancelled})
					m.notifyUpdate()
					return
				case <-time.After(info.DownloadDelay):
					// Delay completed, continue
				}
			}

			err := downloadFile(img.URL, destPath, img.Headers)
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

func (m *Module) finalizeJob(siteID string) {
	m.queueLock.Lock()
	defer m.queueLock.Unlock()

	m.activeCounts[siteID]--
	if m.activeCounts[siteID] < 0 {
		m.activeCounts[siteID] = 0 // Should not happen
	}

	// Check if there are pending jobs
	queue := m.queues[siteID]
	if len(queue) > 0 {
		// Pop first
		next := queue[0]
		m.queues[siteID] = queue[1:]

		// Start it
		m.activeCounts[siteID]++
		fmt.Printf("[Downloader] Starting queued job %s for site %s\n", next.job.ID, siteID)
		go m.runDownload(next.job, next.info)
	}
}

func (m *Module) notifyUpdate() {
	if m.ctx != nil {
		runtime.EventsEmit(m.ctx, "download_updated")
	}
}

func sanitizeFilename(name string) string {
	if name == "" {
		return ""
	}

	// Replace invalid characters (including control chars)
	invalidPattern := regexp.MustCompile(`[\/\\:\*\?"<>\|\x00-\x1F]`)
	res := invalidPattern.ReplaceAllString(name, "_")

	// Normalize whitespace and NBSP
	res = strings.ReplaceAll(res, "\u00A0", " ")
	res = strings.Join(strings.Fields(res), " ") // collapse multiple spaces

	// Trim spaces and dots which are not allowed at the end in Windows
	res = strings.Trim(res, " .")

	// Avoid reserved device names on Windows
	lower := strings.ToLower(res)
	switch lower {
	case "con", "prn", "aux", "nul",
		"com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8", "com9",
		"lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9":
		res = "_" + res
	}

	// Ensure non-empty
	if res == "" {
		return ""
	}

	// Truncate segment length to keep paths safe (helps avoid Windows MAX_PATH)
	const maxRunes = 80
	if utf8.RuneCountInString(res) > maxRunes {
		// Truncate by runes, preserving extension if present
		ext := filepath.Ext(res)
		base := strings.TrimSuffix(res, ext)
		if utf8.RuneCountInString(base) > maxRunes {
			baseRunes := []rune(base)
			base = string(baseRunes[:maxRunes])
		}
		res = strings.TrimRight(base, " .") + ext
	}

	return res
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
