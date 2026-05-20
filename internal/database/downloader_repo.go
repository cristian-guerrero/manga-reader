package database

import (
	"database/sql"
	"fmt"
	"manga-visor/internal/persistence"
	"sync"
	"time"
)

type DownloaderRepository struct {
	db   *Database
	jobs []persistence.DownloadJob
	mu   sync.RWMutex
}

func (r *DownloaderRepository) SetDB(db *Database) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.db = db
}

func NewDownloaderRepository(db *Database) *DownloaderRepository {
	r := &DownloaderRepository{db: db}
	if err := r.Load(); err != nil {
		r.jobs = []persistence.DownloadJob{}
	}
	return r
}

func (r *DownloaderRepository) GetJobs() []persistence.DownloadJob {
	r.mu.RLock()
	defer r.mu.RUnlock()
	cp := make([]persistence.DownloadJob, len(r.jobs))
	copy(cp, r.jobs)
	return cp
}

func (r *DownloaderRepository) AddJob(job persistence.DownloadJob) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if job.CreatedAt == "" {
		job.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	}

	r.jobs = append([]persistence.DownloadJob{job}, r.jobs...)

	if err := r.writeAll(); err != nil {
		fmt.Printf("Error saving download job: %v\n", err)
	}
}

func (r *DownloaderRepository) UpdateJob(id string, updates map[string]interface{}) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for i, job := range r.jobs {
		if job.ID == id {
			for key, value := range updates {
				switch key {
				case "status":
					if v, ok := value.(persistence.DownloadStatus); ok {
						r.jobs[i].Status = v
					} else if v, ok := value.(string); ok {
						r.jobs[i].Status = persistence.DownloadStatus(v)
					}
				case "progress":
					if v, ok := value.(int); ok {
						r.jobs[i].Progress = v
					} else if v, ok := value.(float64); ok {
						r.jobs[i].Progress = int(v)
					}
				case "totalPages":
					if v, ok := value.(int); ok {
						r.jobs[i].TotalPages = v
					}
				case "error":
					if v, ok := value.(string); ok {
						r.jobs[i].Error = v
					}
				case "completedAt":
					switch v := value.(type) {
					case time.Time:
						s := v.UTC().Format(time.RFC3339)
						r.jobs[i].CompletedAt = &s
					case string:
						r.jobs[i].CompletedAt = &v
					}
				case "path":
					if v, ok := value.(string); ok {
						r.jobs[i].Path = v
					}
				}
			}
			break
		}
	}

	if err := r.writeAll(); err != nil {
		fmt.Printf("Error updating download job: %v\n", err)
	}
}

func (r *DownloaderRepository) RemoveJob(id string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	filtered := make([]persistence.DownloadJob, 0, len(r.jobs))
	for _, job := range r.jobs {
		if job.ID != id {
			filtered = append(filtered, job)
		}
	}
	r.jobs = filtered

	if _, err := r.db.db.Exec("DELETE FROM download_jobs WHERE id = ?", id); err != nil {
		fmt.Printf("Error removing download job: %v\n", err)
	}
}

func (r *DownloaderRepository) ClearJobs() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.jobs = nil
	if _, err := r.db.db.Exec("DELETE FROM download_jobs"); err != nil {
		fmt.Printf("Error clearing download jobs: %v\n", err)
	}
}

func (r *DownloaderRepository) Load() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	rows, err := r.db.db.Query(`SELECT id, url, site, series_name, chapter_name, status, progress, total_pages, COALESCE(error,''), created_at, completed_at, COALESCE(path,'') FROM download_jobs ORDER BY created_at DESC`)
	if err != nil {
		return fmt.Errorf("query download jobs: %w", err)
	}
	defer rows.Close()

	var jobs []persistence.DownloadJob
	for rows.Next() {
		var j persistence.DownloadJob
		var completedAt sql.NullString
		if err := rows.Scan(&j.ID, &j.URL, &j.Site, &j.SeriesName, &j.ChapterName, &j.Status, &j.Progress, &j.TotalPages, &j.Error, &j.CreatedAt, &completedAt, &j.Path); err != nil {
			return fmt.Errorf("scan download job: %w", err)
		}
		if completedAt.Valid {
			j.CompletedAt = &completedAt.String
		}
		jobs = append(jobs, j)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if jobs == nil {
		jobs = []persistence.DownloadJob{}
	}
	r.jobs = jobs
	return nil
}

func (r *DownloaderRepository) writeAll() error {
	tx, err := r.db.db.Begin()
	if err != nil {
		return fmt.Errorf("begin download tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM download_jobs"); err != nil {
		return fmt.Errorf("clear downloads: %w", err)
	}

	stmt, err := tx.Prepare(`INSERT INTO download_jobs (id, url, site, series_name, chapter_name, status, progress, total_pages, error, created_at, completed_at, path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return fmt.Errorf("prepare download stmt: %w", err)
	}
	defer stmt.Close()

	for _, j := range r.jobs {
		var completedAt *string
		if j.CompletedAt != nil {
			completedAt = j.CompletedAt
		}
		if _, err := stmt.Exec(j.ID, j.URL, j.Site, j.SeriesName, j.ChapterName, string(j.Status), j.Progress, j.TotalPages, j.Error, j.CreatedAt, completedAt, j.Path); err != nil {
			return fmt.Errorf("insert download job: %w", err)
		}
	}

	return tx.Commit()
}
