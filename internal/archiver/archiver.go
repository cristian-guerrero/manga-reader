package archiver

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/nwaples/rardecode/v2"
)

// IsArchive checks if the file is a supported archive format
func IsArchive(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	return ext == ".zip" || ext == ".cbz" || ext == ".rar" || ext == ".cbr"
}

// Extract extracts the archive to the specified destination
func Extract(src, dest string) error {
	ext := strings.ToLower(filepath.Ext(src))
	if ext == ".zip" || ext == ".cbz" {
		return extractZip(src, dest)
	}
	if ext == ".rar" || ext == ".cbr" {
		return extractRar(src, dest)
	}
	return fmt.Errorf("unsupported archive format: %s", ext)
}

func extractZip(src, dest string) error {
	r, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer r.Close()

	if err := os.MkdirAll(dest, 0755); err != nil {
		return err
	}

	for _, f := range r.File {
		path := filepath.Join(dest, f.Name)

		// Check for ZipSlip vulnerability
		if !strings.HasPrefix(path, filepath.Clean(dest)+string(os.PathSeparator)) && path != filepath.Clean(dest) {
			return fmt.Errorf("illegal file path: %s", f.Name)
		}

		if f.FileInfo().IsDir() {
			os.MkdirAll(path, f.Mode())
			continue
		}

		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			return err
		}

		dstFile, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			rc.Close()
			return err
		}

		_, err = io.Copy(dstFile, rc)
		dstFile.Close()
		rc.Close()

		if err != nil {
			return err
		}
	}

	return nil
}

func extractRar(src, dest string) error {
	r, err := rardecode.OpenReader(src)
	if err != nil {
		return err
	}
	defer r.Close()

	if err := os.MkdirAll(dest, 0755); err != nil {
		return err
	}

	for {
		f, err := r.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		path := filepath.Join(dest, f.Name)

		// Check for ZipSlip-like vulnerability
		if !strings.HasPrefix(path, filepath.Clean(dest)+string(os.PathSeparator)) && path != filepath.Clean(dest) {
			return fmt.Errorf("illegal file path: %s", f.Name)
		}

		if f.IsDir {
			os.MkdirAll(path, 0755)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			return err
		}

		dstFile, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
		if err != nil {
			return err
		}

		_, err = io.Copy(dstFile, r)
		dstFile.Close()

		if err != nil {
			return err
		}
	}

	return nil
}
