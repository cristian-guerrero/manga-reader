package services

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// ValidationError represents a validation error
type ValidationError struct {
	Field   string
	Message string
	Value   interface{}
}

// Error implements the error interface
func (e *ValidationError) Error() string {
	if e.Field != "" {
		return fmt.Sprintf("validation error for field '%s': %s (value: %v)", e.Field, e.Message, e.Value)
	}
	return fmt.Sprintf("validation error: %s (value: %v)", e.Message, e.Value)
}

// ValidatePath validates a filesystem path
func ValidatePath(path string) error {
	if path == "" {
		return &ValidationError{
			Field:   "path",
			Message: "path cannot be empty",
			Value:   path,
		}
	}

	// Check for path traversal attempts
	if strings.Contains(path, "..") {
		return &ValidationError{
			Field:   "path",
			Message: "path contains '..' which is not allowed",
			Value:   path,
		}
	}

	// Check if path exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return &ValidationError{
			Field:   "path",
			Message: "path does not exist",
			Value:   path,
		}
	}

	return nil
}

// ValidateDirectory validates that a path is a directory
func ValidateDirectory(path string) error {
	if err := ValidatePath(path); err != nil {
		return err
	}

	info, err := os.Stat(path)
	if err != nil {
		return &ValidationError{
			Field:   "path",
			Message: fmt.Sprintf("failed to stat path: %v", err),
			Value:   path,
		}
	}

	if !info.IsDir() {
		return &ValidationError{
			Field:   "path",
			Message: "path is not a directory",
			Value:   path,
		}
	}

	return nil
}

// ValidateFile validates that a path is a file
func ValidateFile(path string) error {
	if err := ValidatePath(path); err != nil {
		return err
	}

	info, err := os.Stat(path)
	if err != nil {
		return &ValidationError{
			Field:   "path",
			Message: fmt.Sprintf("failed to stat path: %v", err),
			Value:   path,
		}
	}

	if info.IsDir() {
		return &ValidationError{
			Field:   "path",
			Message: "path is a directory, expected a file",
			Value:   path,
		}
	}

	return nil
}

// ValidatePathInBase validates that a path is within a base directory
// This prevents directory traversal attacks
func ValidatePathInBase(path, baseDir string) error {
	if err := ValidatePath(path); err != nil {
		return err
	}

	absPath, err := filepath.Abs(path)
	if err != nil {
		return &ValidationError{
			Field:   "path",
			Message: fmt.Sprintf("failed to get absolute path: %v", err),
			Value:   path,
		}
	}

	absBase, err := filepath.Abs(baseDir)
	if err != nil {
		return &ValidationError{
			Field:   "baseDir",
			Message: fmt.Sprintf("failed to get absolute base directory: %v", err),
			Value:   baseDir,
		}
	}

	rel, err := filepath.Rel(absBase, absPath)
	if err != nil {
		return &ValidationError{
			Field:   "path",
			Message: fmt.Sprintf("path is not relative to base directory: %v", err),
			Value:   path,
		}
	}

	if strings.HasPrefix(rel, "..") {
		return &ValidationError{
			Field:   "path",
			Message: "path is outside base directory",
			Value:   path,
		}
	}

	return nil
}

// ValidateNonEmpty validates that a string is not empty
func ValidateNonEmpty(field, value string) error {
	if value == "" {
		return &ValidationError{
			Field:   field,
			Message: "cannot be empty",
			Value:   value,
		}
	}
	return nil
}

// ValidateURL validates a URL string (basic validation)
func ValidateURL(url string) error {
	if url == "" {
		return &ValidationError{
			Field:   "url",
			Message: "URL cannot be empty",
			Value:   url,
		}
	}

	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		return &ValidationError{
			Field:   "url",
			Message: "URL must start with http:// or https://",
			Value:   url,
		}
	}

	return nil
}

// ValidatePositiveInt validates that an integer is positive
func ValidatePositiveInt(field string, value int) error {
	if value <= 0 {
		return &ValidationError{
			Field:   field,
			Message: "must be positive",
			Value:   value,
		}
	}
	return nil
}

// ValidateNonNegativeInt validates that an integer is non-negative
func ValidateNonNegativeInt(field string, value int) error {
	if value < 0 {
		return &ValidationError{
			Field:   field,
			Message: "must be non-negative",
			Value:   value,
		}
	}
	return nil
}

// ValidateRange validates that an integer is within a range
func ValidateRange(field string, value, min, max int) error {
	if value < min || value > max {
		return &ValidationError{
			Field:   field,
			Message: fmt.Sprintf("must be between %d and %d", min, max),
			Value:   value,
		}
	}
	return nil
}
