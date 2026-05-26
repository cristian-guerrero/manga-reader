package database

import (
	"testing"

	"manga-visor/internal/persistence"
)

func TestNewDownloaderRepository(t *testing.T) {
	db := newTestDB(t)
	r := NewDownloaderRepository(db)
	if r == nil {
		t.Fatal("NewDownloaderRepository returned nil")
	}
	if jobs := r.GetJobs(); jobs == nil {
		t.Error("GetJobs() should return empty slice, not nil")
	}
}

func TestDownloaderRepository_AddJob(t *testing.T) {
	db := newTestDB(t)
	r := NewDownloaderRepository(db)

	job := persistence.DownloadJob{
		ID:          "job1",
		URL:         "https://example.com/manga",
		Site:        "example",
		SeriesName:  "Test Series",
		ChapterName: "Chapter 1",
		Status:      persistence.StatusPending,
	}

	r.AddJob(job)
	jobs := r.GetJobs()
	if len(jobs) != 1 {
		t.Fatalf("GetJobs() = %d, want 1", len(jobs))
	}
	if jobs[0].URL != "https://example.com/manga" {
		t.Errorf("URL = %q, want %q", jobs[0].URL, "https://example.com/manga")
	}
}

func TestDownloaderRepository_AddJob_AutoTimestamp(t *testing.T) {
	db := newTestDB(t)
	r := NewDownloaderRepository(db)

	r.AddJob(persistence.DownloadJob{ID: "job1", URL: "https://example.com"})
	if r.GetJobs()[0].CreatedAt == "" {
		t.Error("CreatedAt should be auto-set when empty")
	}
}

func TestDownloaderRepository_UpdateJob(t *testing.T) {
	db := newTestDB(t)
	r := NewDownloaderRepository(db)

	r.AddJob(persistence.DownloadJob{ID: "job1", URL: "https://example.com", Status: persistence.StatusPending})

	r.UpdateJob("job1", map[string]interface{}{
		"status":   persistence.StatusRunning,
		"progress": 50,
	})

	job := r.GetJobs()[0]
	if job.Status != persistence.StatusRunning {
		t.Errorf("Status = %q, want %q", job.Status, persistence.StatusRunning)
	}
	if job.Progress != 50 {
		t.Errorf("Progress = %d, want 50", job.Progress)
	}
}

func TestDownloaderRepository_UpdateJob_CompletedAt(t *testing.T) {
	db := newTestDB(t)
	r := NewDownloaderRepository(db)

	r.AddJob(persistence.DownloadJob{ID: "job1", URL: "https://example.com"})
	r.UpdateJob("job1", map[string]interface{}{"completedAt": "2024-01-01T00:00:00Z"})

	if r.GetJobs()[0].CompletedAt == nil || *r.GetJobs()[0].CompletedAt != "2024-01-01T00:00:00Z" {
		t.Error("CompletedAt should be set")
	}
}

func TestDownloaderRepository_RemoveJob(t *testing.T) {
	db := newTestDB(t)
	r := NewDownloaderRepository(db)

	r.AddJob(persistence.DownloadJob{ID: "job1", URL: "https://example.com/1"})
	r.AddJob(persistence.DownloadJob{ID: "job2", URL: "https://example.com/2"})

	r.RemoveJob("job1")
	if len(r.GetJobs()) != 1 {
		t.Errorf("jobs = %d, want 1", len(r.GetJobs()))
	}
}

func TestDownloaderRepository_ClearJobs(t *testing.T) {
	db := newTestDB(t)
	r := NewDownloaderRepository(db)

	r.AddJob(persistence.DownloadJob{ID: "job1", URL: "https://example.com"})
	r.ClearJobs()

	if len(r.GetJobs()) != 0 {
		t.Error("ClearJobs() should remove all jobs")
	}
}

func TestDownloaderRepository_GetJobs_ReturnsCopy(t *testing.T) {
	db := newTestDB(t)
	r := NewDownloaderRepository(db)

	r.AddJob(persistence.DownloadJob{ID: "job1", URL: "https://example.com"})
	got := r.GetJobs()
	got[0].URL = "modified"
	if r.GetJobs()[0].URL != "https://example.com" {
		t.Error("modifying returned copy should not affect internal state")
	}
}

func TestDownloaderRepository_Persistence(t *testing.T) {
	db := newTestDB(t)
	r := NewDownloaderRepository(db)

	r.AddJob(persistence.DownloadJob{ID: "job1", URL: "https://example.com", SeriesName: "Test"})

	r2 := NewDownloaderRepository(db)
	jobs := r2.GetJobs()
	if len(jobs) != 1 || jobs[0].SeriesName != "Test" {
		t.Error("jobs should persist across instances")
	}
}

func TestDownloaderRepository_SetDB(t *testing.T) {
	db1 := newTestDB(t)
	db2 := newTestDB(t)

	r := NewDownloaderRepository(db1)
	r.AddJob(persistence.DownloadJob{ID: "job1", URL: "https://example.com"})

	r.SetDB(db2)
	r.Load()
	if len(r.GetJobs()) != 0 {
		t.Error("after SetDB+Load, should have no jobs")
	}
}
