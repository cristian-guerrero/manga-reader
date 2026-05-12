package services

import (
	"os"
	"path/filepath"
	"testing"
)

func TestValidationError_Error(t *testing.T) {
	tests := []struct {
		name  string
		err   *ValidationError
		check string // substring to check in output
	}{
		{
			name:  "with field",
			err:   &ValidationError{Field: "url", Message: "cannot be empty", Value: ""},
			check: "validation error for field 'url': cannot be empty (value: )",
		},
		{
			name:  "without field",
			err:   &ValidationError{Message: "generic error", Value: "x"},
			check: "validation error: generic error (value: x)",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.err.Error()
			if got != tt.check {
				t.Errorf("Error() = %q, want %q", got, tt.check)
			}
		})
	}
}

// ---------- ValidatePath ----------

func TestValidatePath_Empty(t *testing.T) {
	err := ValidatePath("")
	if err == nil {
		t.Fatal("expected error for empty path")
	}
	var ve *ValidationError
	if !as(err, &ve) {
		t.Fatalf("expected *ValidationError, got %T", err)
	}
	if ve.Field != "path" {
		t.Errorf("Field = %q, want %q", ve.Field, "path")
	}
}

func TestValidatePath_Traversal(t *testing.T) {
	err := ValidatePath("/some/../path")
	if err == nil {
		t.Fatal("expected error for path with '..'")
	}
	var ve *ValidationError
	if !as(err, &ve) {
		t.Fatalf("expected *ValidationError, got %T", err)
	}
}

func TestValidatePath_NotExist(t *testing.T) {
	nonexistent := filepath.Join(os.TempDir(), "does-not-exist-"+t.Name())
	err := ValidatePath(nonexistent)
	if err == nil {
		t.Fatal("expected error for non-existent path")
	}
	var ve *ValidationError
	if !as(err, &ve) {
		t.Fatalf("expected *ValidationError, got %T", err)
	}
	if ve.Field != "path" {
		t.Errorf("Field = %q, want %q", ve.Field, "path")
	}
}

func TestValidatePath_ValidDir(t *testing.T) {
	dir := t.TempDir()
	err := ValidatePath(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidatePath_ValidFile(t *testing.T) {
	dir := t.TempDir()
	f := filepath.Join(dir, "test.txt")
	if err := os.WriteFile(f, []byte("hello"), 0644); err != nil {
		t.Fatal(err)
	}
	err := ValidatePath(f)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

// ---------- ValidateDirectory ----------

func TestValidateDirectory_Valid(t *testing.T) {
	dir := t.TempDir()
	err := ValidateDirectory(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidateDirectory_FileInstead(t *testing.T) {
	dir := t.TempDir()
	f := filepath.Join(dir, "file.txt")
	if err := os.WriteFile(f, []byte("data"), 0644); err != nil {
		t.Fatal(err)
	}
	err := ValidateDirectory(f)
	if err == nil {
		t.Fatal("expected error for a file")
	}
	var ve *ValidationError
	if !as(err, &ve) {
		t.Fatalf("expected *ValidationError, got %T", err)
	}
}

func TestValidateDirectory_NotExist(t *testing.T) {
	nonexistent := filepath.Join(t.TempDir(), "nonexistent")
	err := ValidateDirectory(nonexistent)
	if err == nil {
		t.Fatal("expected error")
	}
}

// ---------- ValidateFile ----------

func TestValidateFile_Valid(t *testing.T) {
	dir := t.TempDir()
	f := filepath.Join(dir, "data.txt")
	if err := os.WriteFile(f, []byte("data"), 0644); err != nil {
		t.Fatal(err)
	}
	err := ValidateFile(f)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidateFile_DirInstead(t *testing.T) {
	dir := t.TempDir()
	err := ValidateFile(dir)
	if err == nil {
		t.Fatal("expected error for a directory")
	}
	var ve *ValidationError
	if !as(err, &ve) {
		t.Fatalf("expected *ValidationError, got %T", err)
	}
}

func TestValidateFile_NotExist(t *testing.T) {
	nonexistent := filepath.Join(t.TempDir(), "nonexistent.txt")
	err := ValidateFile(nonexistent)
	if err == nil {
		t.Fatal("expected error")
	}
}

// ---------- ValidatePathInBase ----------

func TestValidatePathInBase_Valid(t *testing.T) {
	base := t.TempDir()
	sub := filepath.Join(base, "sub")
	if err := os.Mkdir(sub, 0755); err != nil {
		t.Fatal(err)
	}
	err := ValidatePathInBase(sub, base)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidatePathInBase_Outside(t *testing.T) {
	base := t.TempDir()
	outside := filepath.Join(t.TempDir(), "outside")
	err := ValidatePathInBase(outside, base)
	if err == nil {
		t.Fatal("expected error for path outside base")
	}
	var ve *ValidationError
	if !as(err, &ve) {
		t.Fatalf("expected *ValidationError, got %T", err)
	}
}

func TestValidatePathInBase_NonExistent(t *testing.T) {
	base := t.TempDir()
	nonexistent := filepath.Join(base, "nonexistent")
	err := ValidatePathInBase(nonexistent, base)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestValidatePathInBase_EmptyPath(t *testing.T) {
	base := t.TempDir()
	err := ValidatePathInBase("", base)
	if err == nil {
		t.Fatal("expected error for empty path")
	}
}

// ---------- ValidateNonEmpty ----------

func TestValidateNonEmpty(t *testing.T) {
	tests := []struct {
		name    string
		value   string
		wantErr bool
	}{
		{name: "empty string", value: "", wantErr: true},
		{name: "non-empty", value: "hello", wantErr: false},
		{name: "whitespace", value: "  ", wantErr: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateNonEmpty("field", tt.value)
			if tt.wantErr && err == nil {
				t.Fatal("expected error")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestValidateNonEmpty_FieldName(t *testing.T) {
	err := ValidateNonEmpty("username", "")
	var ve *ValidationError
	if !as(err, &ve) {
		t.Fatalf("expected *ValidationError, got %T", err)
	}
	if ve.Field != "username" {
		t.Errorf("Field = %q, want %q", ve.Field, "username")
	}
}

// ---------- ValidateURL ----------

func TestValidateURL(t *testing.T) {
	tests := []struct {
		name    string
		url     string
		wantErr bool
	}{
		{name: "empty", url: "", wantErr: true},
		{name: "no scheme", url: "example.com", wantErr: true},
		{name: "ftp scheme", url: "ftp://example.com", wantErr: true},
		{name: "http", url: "http://example.com", wantErr: false},
		{name: "https", url: "https://example.com", wantErr: false},
		{name: "https with path", url: "https://example.com/page?id=1", wantErr: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateURL(tt.url)
			if tt.wantErr && err == nil {
				t.Fatal("expected error")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

// ---------- ValidatePositiveInt ----------

func TestValidatePositiveInt(t *testing.T) {
	tests := []struct {
		name    string
		value   int
		wantErr bool
	}{
		{name: "zero", value: 0, wantErr: true},
		{name: "negative", value: -1, wantErr: true},
		{name: "positive", value: 1, wantErr: false},
		{name: "large", value: 999, wantErr: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidatePositiveInt("count", tt.value)
			if tt.wantErr && err == nil {
				t.Fatal("expected error")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

// ---------- ValidateNonNegativeInt ----------

func TestValidateNonNegativeInt(t *testing.T) {
	tests := []struct {
		name    string
		value   int
		wantErr bool
	}{
		{name: "negative", value: -1, wantErr: true},
		{name: "zero", value: 0, wantErr: false},
		{name: "positive", value: 5, wantErr: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateNonNegativeInt("count", tt.value)
			if tt.wantErr && err == nil {
				t.Fatal("expected error")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

// ---------- ValidateRange ----------

func TestValidateRange(t *testing.T) {
	tests := []struct {
		name   string
		value  int
		min    int
		max    int
		ok     bool
	}{
		{name: "below min", value: -1, min: 0, max: 100, ok: false},
		{name: "above max", value: 101, min: 0, max: 100, ok: false},
		{name: "at min", value: 0, min: 0, max: 100, ok: true},
		{name: "at max", value: 100, min: 0, max: 100, ok: true},
		{name: "in range", value: 50, min: 0, max: 100, ok: true},
		{name: "equal min=max", value: 5, min: 5, max: 5, ok: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateRange("score", tt.value, tt.min, tt.max)
			if tt.ok && err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if !tt.ok && err == nil {
				t.Error("expected error, got nil")
			}
		})
	}
}

// as is a generic type-assertion helper (avoids reflect)
func as[T any](err error, target *T) bool {
	v, ok := err.(T)
	if ok {
		*target = v
	}
	return ok
}
