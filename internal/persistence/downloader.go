package persistence

import (
	"sync"
	"time"
)

const downloaderFile = "downloader.json"

type DownloadStatus string

const (
	StatusPending   DownloadStatus = "pending"
	StatusRunning   DownloadStatus = "running"
	StatusCompleted DownloadStatus = "completed"
	StatusFailed    DownloadStatus = "failed"
	StatusCancelled DownloadStatus = "cancelled"
)

type DownloadJob struct {
	ID          string         `json:"id"`
	URL         string         `json:"url"`
	Site        string         `json:"site"`
	SeriesName  string         `json:"seriesName"`
	ChapterName string         `json:"chapterName"`
	Status      DownloadStatus `json:"status"`
	Progress    int            `json:"progress"`
	TotalPages  int            `json:"totalPages"`
	Error       string         `json:"error,omitempty"`
	CreatedAt   string         `json:"createdAt"`        // ISO 8601 format (RFC3339)
	CompletedAt *string         `json:"completedAt,omitempty"` // ISO 8601 format (RFC3339)
	Path        string         `json:"path"`
}

type DownloaderData struct {
	Jobs []DownloadJob `json:"jobs"`
}

type DownloaderManager struct {
	data *DownloaderData
	mu   sync.RWMutex
}

func NewDownloaderManager() *DownloaderManager {
	dm := &DownloaderManager{
		data: &DownloaderData{Jobs: []DownloadJob{}},
	}
	dm.Load()
	return dm
}

func (dm *DownloaderManager) Load() error {
	dm.mu.Lock()
	defer dm.mu.Unlock()

	if !fileExists(downloaderFile) {
		return saveJSON(downloaderFile, dm.data)
	}

	return loadJSON(downloaderFile, dm.data)
}

func (dm *DownloaderManager) Save() error {
	dm.mu.RLock()
	defer dm.mu.RUnlock()
	return saveJSON(downloaderFile, dm.data)
}

func (dm *DownloaderManager) GetJobs() []DownloadJob {
	dm.mu.RLock()
	defer dm.mu.RUnlock()

	// Return a copy
	jobs := make([]DownloadJob, len(dm.data.Jobs))
	copy(jobs, dm.data.Jobs)
	return jobs
}

func (dm *DownloaderManager) AddJob(job DownloadJob) {
	dm.mu.Lock()
	defer dm.mu.Unlock()

	dm.data.Jobs = append([]DownloadJob{job}, dm.data.Jobs...) // Add to top
	saveJSON(downloaderFile, dm.data)
}

func (dm *DownloaderManager) UpdateJob(id string, updates map[string]interface{}) {
	dm.mu.Lock()
	defer dm.mu.Unlock()

	for i := range dm.data.Jobs {
		if dm.data.Jobs[i].ID == id {
			for k, v := range updates {
				switch k {
				case "status":
					if s, ok := v.(DownloadStatus); ok {
						dm.data.Jobs[i].Status = s
					}
				case "progress":
					if p, ok := v.(int); ok {
						dm.data.Jobs[i].Progress = p
					}
				case "totalPages":
					if t, ok := v.(int); ok {
						dm.data.Jobs[i].TotalPages = t
					}
				case "error":
					if e, ok := v.(string); ok {
						dm.data.Jobs[i].Error = e
					}
				case "completedAt":
					if t, ok := v.(time.Time); ok {
						completedAtStr := t.Format(time.RFC3339)
						dm.data.Jobs[i].CompletedAt = &completedAtStr
					} else if s, ok := v.(string); ok {
						dm.data.Jobs[i].CompletedAt = &s
					}
				case "path":
					if p, ok := v.(string); ok {
						dm.data.Jobs[i].Path = p
					}
				}
			}
			break
		}
	}
	saveJSON(downloaderFile, dm.data)
}

func (dm *DownloaderManager) RemoveJob(id string) {
	dm.mu.Lock()
	defer dm.mu.Unlock()

	newJobs := []DownloadJob{}
	for _, job := range dm.data.Jobs {
		if job.ID != id {
			newJobs = append(newJobs, job)
		}
	}
	dm.data.Jobs = newJobs
	saveJSON(downloaderFile, dm.data)
}

func (dm *DownloaderManager) ClearJobs() {
	dm.mu.Lock()
	defer dm.mu.Unlock()

	dm.data.Jobs = []DownloadJob{}
	saveJSON(downloaderFile, dm.data)
}
