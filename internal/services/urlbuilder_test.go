package services

import (
	"net/url"
	"path/filepath"
	"strings"
	"testing"
)

func TestNewURLBuilder(t *testing.T) {
	ub := NewURLBuilder("http://localhost:8080")
	if ub.baseURL != "http://localhost:8080" {
		t.Errorf("baseURL = %q, want %q", ub.baseURL, "http://localhost:8080")
	}
}

func TestSetBaseURL(t *testing.T) {
	ub := NewURLBuilder("http://old")
	ub.SetBaseURL("http://new")
	if ub.baseURL != "http://new" {
		t.Errorf("baseURL = %q, want %q", ub.baseURL, "http://new")
	}
}

func TestBuildImageURL(t *testing.T) {
	ub := NewURLBuilder("")
	got := ub.BuildImageURL("abc123", "image001.jpg")
	expected := "/images?did=abc123&fid=image001.jpg"
	if got != expected {
		t.Errorf("BuildImageURL() = %q, want %q", got, expected)
	}
}

func TestBuildImageURL_SpecialChars(t *testing.T) {
	ub := NewURLBuilder("")
	got := ub.BuildImageURL("hash", "image 01.jpg")
	// Verify the filename is URL-encoded (space becomes + or %20, not raw space)
	queryStart := strings.Index(got, "fid=")
	if queryStart == -1 {
		t.Fatal("missing fid=")
	}
	rawFid := got[queryStart+4:]
	if rawFid == "image 01.jpg" {
		t.Error("expected URL-encoded filename, got raw space")
	}
	// Verify round-trip works: url.Parse decodes it back
	parsed, err := url.Parse(got)
	if err != nil {
		t.Fatal(err)
	}
	fid := parsed.Query().Get("fid")
	if fid != "image 01.jpg" {
		t.Errorf(`round-trip: got %q, want "image 01.jpg"`, fid)
	}
}

func TestBuildImageURL_DirHash(t *testing.T) {
	ub := NewURLBuilder("")
	got := ub.BuildImageURL("dirhash12345", "page01.png")
	if !strings.Contains(got, "did=dirhash12345") {
		t.Errorf("expected did parameter in %q", got)
	}
}

func TestBuildThumbnailURL(t *testing.T) {
	ub := NewURLBuilder("")
	got := ub.BuildThumbnailURL("abc123", "thumb001.jpg")
	expected := "/thumbnails?did=abc123&fid=thumb001.jpg"
	if got != expected {
		t.Errorf("BuildThumbnailURL() = %q, want %q", got, expected)
	}
}

func TestBuildThumbnailURL_SpecialChars(t *testing.T) {
	ub := NewURLBuilder("")
	got := ub.BuildThumbnailURL("hash", "thumb 01.jpg")
	// Verify the URL is URL-encoded (space becomes + or %20)
	queryStart := strings.Index(got, "fid=")
	if queryStart == -1 {
		t.Fatal("missing fid=")
	}
	rawFid := got[queryStart+4:]
	if rawFid == "thumb 01.jpg" {
		t.Error("expected URL-encoded filename, got raw space")
	}
}

func TestBuildThumbnailURLFromPath(t *testing.T) {
	ub := NewURLBuilder("")
	got := ub.BuildThumbnailURLFromPath("hash", "/some/dir/thumb001.jpg")
	expected := "/thumbnails?did=hash&fid=thumb001.jpg"
	if got != expected {
		t.Errorf("BuildThumbnailURLFromPath() = %q, want %q", got, expected)
	}
}

func TestBuildThumbnailURLFromPath_WindowsPath(t *testing.T) {
	// Even on Windows paths with backslashes, the URL should use forward slashes
	ub := NewURLBuilder("")
	got := ub.BuildThumbnailURLFromPath("hash", `C:\dir\sub\thumb.jpg`)
	if !strings.Contains(got, "fid=thumb.jpg") {
		t.Errorf("expected thumb.jpg in %q", got)
	}
	if strings.Contains(got, `\`) {
		t.Errorf("URL should not contain backslashes: %q", got)
	}
}

func TestBuildImageURLFromPath(t *testing.T) {
	ub := NewURLBuilder("")
	dirPath := filepath.Join("base", "manga")
	fullPath := filepath.Join(dirPath, "sub", "page001.jpg")
	got := ub.BuildImageURLFromPath("hash", dirPath, fullPath)
	if !strings.Contains(got, "did=hash") {
		t.Errorf("missing did parameter in %q", got)
	}
	// The relative path should be "sub/page001.jpg" (always forward slashes)
	if !strings.Contains(got, "sub") || !strings.Contains(got, "page001.jpg") {
		t.Errorf("expected path components in %q", got)
	}
	if strings.Contains(got, `\`) {
		t.Errorf("URL should not contain backslashes: %q", got)
	}
}

func TestBuildImageURLFromPath_SameDir(t *testing.T) {
	ub := NewURLBuilder("")
	dirPath := filepath.Join("base", "manga")
	fullPath := filepath.Join(dirPath, "page001.jpg")
	got := ub.BuildImageURLFromPath("hash", dirPath, fullPath)
	// The relative path of a file inside its parent dir should just be the filename
	if !strings.Contains(got, "fid=page001.jpg") {
		t.Errorf("expected just filename in %q", got)
	}
}
