package persistence

import (
	"os"
	"testing"
	"time"
)

// ---------- NewDownloaderManager ----------

func TestNewDownloaderManager(t *testing.T) {
	tmp := withTempDir(t)
	dm := NewDownloaderManager()
	if dm == nil {
		t.Fatal("NewDownloaderManager returned nil")
	}
	if _, err := os.Stat(tmp + "/" + downloaderFile); os.IsNotExist(err) {
		t.Errorf("expected %s to be created", downloaderFile)
	}
}

func TestNewDownloaderManager_EmptyJobs(t *testing.T) {
	withTempDir(t)
	dm := NewDownloaderManager()
	jobs := dm.GetJobs()
	if len(jobs) != 0 {
		t.Errorf("expected 0 jobs, got %d", len(jobs))
	}
}

// ---------- AddJob ----------

func TestDownloaderManager_AddJob(t *testing.T) {
	withTempDir(t)
	dm := NewDownloaderManager()

	job := DownloadJob{
		ID:          "job-1",
		URL:         "https://example.com/gallery/1",
		Site:        "example",
		SeriesName:  "Test Series",
		ChapterName: "Chapter 1",
		Status:      StatusPending,
		Progress:    0,
		TotalPages:  20,
		CreatedAt:   "2026-05-11T12:00:00Z",
		Path:        "/downloads/test",
	}
	dm.AddJob(job)

	jobs := dm.GetJobs()
	if len(jobs) != 1 {
		t.Fatalf("expected 1 job, got %d", len(jobs))
	}
	if jobs[0].ID != "job-1" {
		t.Errorf("ID = %q", jobs[0].ID)
	}
	if jobs[0].Site != "example" {
		t.Errorf("Site = %q", jobs[0].Site)
	}
	if jobs[0].Status != StatusPending {
		t.Errorf("Status = %q", jobs[0].Status)
	}
	if jobs[0].CreatedAt != "2026-05-11T12:00:00Z" {
		t.Errorf("CreatedAt = %q, want fixed timestamp", jobs[0].CreatedAt)
	}
}

func TestDownloaderManager_AddJob_AddsToTop(t *testing.T) {
	withTempDir(t)
	dm := NewDownloaderManager()

	dm.AddJob(DownloadJob{ID: "first", URL: "https://a.com"})
	dm.AddJob(DownloadJob{ID: "second", URL: "https://b.com"})

	jobs := dm.GetJobs()
	if len(jobs) != 2 {
		t.Fatalf("expected 2 jobs, got %d", len(jobs))
	}
	// Most recent should be first
	if jobs[0].ID != "second" {
		t.Errorf("expected most recent first, got %q", jobs[0].ID)
	}
}

// ---------- GetJobs ----------

func TestDownloaderManager_GetJobs_ReturnsCopy(t *testing.T) {
	withTempDir(t)
	dm := NewDownloaderManager()

	dm.AddJob(DownloadJob{ID: "j1", URL: "https://a.com"})

	got1 := dm.GetJobs()
	got1[0].ID = "modified"

	got2 := dm.GetJobs()
	if got2[0].ID == "modified" {
		t.Error("modifying returned slice should not affect internal state")
	}
}

// ---------- UpdateJob ----------

func TestDownloaderManager_UpdateJob_Status(t *testing.T) {
	withTempDir(t)
	dm := NewDownloaderManager()

	dm.AddJob(DownloadJob{ID: "j1", Status: StatusPending})
	dm.UpdateJob("j1", map[string]interface{}{"status": StatusRunning})

	jobs := dm.GetJobs()
	if len(jobs) != 1 {
		t.Fatalf("expected 1 job, got %d", len(jobs))
	}
	if jobs[0].Status != StatusRunning {
		t.Errorf("Status = %q, want %q", jobs[0].Status, StatusRunning)
	}
}

func TestDownloaderManager_UpdateJob_Progress(t *testing.T) {
	withTempDir(t)
	dm := NewDownloaderManager()

	dm.AddJob(DownloadJob{ID: "j1", Progress: 0})
	dm.UpdateJob("j1", map[string]interface{}{"progress": 50})

	jobs := dm.GetJobs()
	if jobs[0].Progress != 50 {
		t.Errorf("Progress = %d, want %d", jobs[0].Progress, 50)
	}
}

func TestDownloaderManager_UpdateJob_TotalPages(t *testing.T) {
	withTempDir(t)
	dm := NewDownloaderManager()

	dm.AddJob(DownloadJob{ID: "j1", TotalPages: 0})
	dm.UpdateJob("j1", map[string]interface{}{"totalPages": 30})

	jobs := dm.GetJobs()
	if jobs[0].TotalPages != 30 {
		t.Errorf("TotalPages = %d", jobs[0].TotalPages)
	}
}

func TestDownloaderManager_UpdateJob_Error(t *testing.T) {
	withTempDir(t)
	dm := NewDownloaderManager()

	dm.AddJob(DownloadJob{ID: "j1"})
	dm.UpdateJob("j1", map[string]interface{}{"error": "connection failed"})

	jobs := dm.GetJobs()
	if jobs[0].Error != "connection failed" {
		t.Errorf("Error = %q", jobs[0].Error)
	}
}

func TestDownloaderManager_UpdateJob_Path(t *testing.T) {
	withTempDir(t)
	dm := NewDownloaderManager()

	dm.AddJob(DownloadJob{ID: "j1"})
	dm.UpdateJob("j1", map[string]interface{}{"path": "/downloads/series/ch1"})

	jobs := dm.GetJobs()
	if jobs[0].Path != "/downloads/series/ch1" {
		t.Errorf("Path = %q", jobs[0].Path)
	}
}

func TestDownloaderManager_UpdateJob_CompletedAt_Time(t *testing.T) {
	withTempDir(t)
	dm := NewDownloaderManager()

	now := time.Now()
	dm.AddJob(DownloadJob{ID: "j1"})
	dm.UpdateJob("j1", map[string]interface{}{"completedAt": now})

	jobs := dm.GetJobs()
	if jobs[0].CompletedAt == nil {
		t.Fatal("CompletedAt should not be nil")
	}
	if *jobs[0].CompletedAt == "" {
		t.Error("CompletedAt should not be empty")
	}
}

func TestDownloaderManager_UpdateJob_CompletedAt_String(t *testing.T) {
	withTempDir(t)
	dm := NewDownloaderManager()

	ts := "2026-05-11T12:00:00Z"
	dm.AddJob(DownloadJob{ID: "j1"})
	dm.UpdateJob("j1", map[string]interface{}{"completedAt": ts})

	jobs := dm.GetJobs()
	if jobs[0].CompletedAt == nil {
		t.Fatal("CompletedAt should not be nil")
	}
	if *jobs[0].CompletedAt != ts {
		t.Errorf("CompletedAt = %q, want %q", *jobs[0].CompletedAt, ts)
	}
}

func TestDownloaderManager_UpdateJob_NotFound(t *testing.T) {
	withTempDir(t)
	dm := NewDownloaderManager()

	// Should not panic
	dm.UpdateJob("nonexistent", map[string]interface{}{"status": StatusRunning})
}

// ---------- RemoveJob ----------

func TestDownloaderManager_RemoveJob(t *testing.T) {
	withTempDir(t)
	dm := NewDownloaderManager()

	dm.AddJob(DownloadJob{ID: "j1", URL: "https://a.com"})
	dm.AddJob(DownloadJob{ID: "j2", URL: "https://b.com"})

	dm.RemoveJob("j1")

	jobs := dm.GetJobs()
	if len(jobs) != 1 {
		t.Fatalf("expected 1 job, got %d", len(jobs))
	}
	if jobs[0].ID != "j2" {
		t.Errorf("remaining = %q", jobs[0].ID)
	}
}

func TestDownloaderManager_RemoveJob_NotFound(t *testing.T) {
	withTempDir(t)
	dm := NewDownloaderManager()

	// Should not panic
	dm.RemoveJob("nonexistent")
}

// ---------- ClearJobs ----------

func TestDownloaderManager_ClearJobs(t *testing.T) {
	withTempDir(t)
	dm := NewDownloaderManager()

	dm.AddJob(DownloadJob{ID: "j1"})
	dm.AddJob(DownloadJob{ID: "j2"})

	dm.ClearJobs()

	jobs := dm.GetJobs()
	if len(jobs) != 0 {
		t.Errorf("expected 0 jobs, got %d", len(jobs))
	}
}

// ---------- Save / Load ----------

func TestDownloaderManager_SaveAndLoad(t *testing.T) {
	tmp := withTempDir(t)
	dm := NewDownloaderManager()

	dm.AddJob(DownloadJob{ID: "persist-1", URL: "https://a.com", Site: "testsite", Status: StatusPending})

	dm2 := NewDownloaderManager()
	jobs := dm2.GetJobs()
	if len(jobs) != 1 {
		t.Fatalf("expected 1 job, got %d", len(jobs))
	}
	if jobs[0].ID != "persist-1" {
		t.Errorf("ID = %q", jobs[0].ID)
	}
	if jobs[0].Site != "testsite" {
		t.Errorf("Site = %q", jobs[0].Site)
	}

	if _, err := os.Stat(tmp + "/" + downloaderFile); os.IsNotExist(err) {
		t.Error("downloader.json not found")
	}
}

func TestDownloaderManager_Load_WhenFileMissing_CreatesEmpty(t *testing.T) {
	withTempDir(t)
	dm := NewDownloaderManager()
	_ = dm
	// No error expected
}

// ---------- Status constants ----------

func TestStatusConstants(t *testing.T) {
	statuses := []DownloadStatus{StatusPending, StatusRunning, StatusCompleted, StatusFailed, StatusCancelled}
	for _, s := range statuses {
		if string(s) == "" {
			t.Error("status constant is empty")
		}
	}
}
