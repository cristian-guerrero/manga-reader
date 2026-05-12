package services

import (
	"errors"
	"testing"
)

func TestAppError_Error(t *testing.T) {
	tests := []struct {
		name  string
		appErr *AppError
		want  string
	}{
		{
			name:    "without wrapped error",
			appErr:  &AppError{Type: ErrorTypeValidation, Message: "invalid input"},
			want:    "validation: invalid input",
		},
		{
			name:    "with wrapped error",
			appErr:  &AppError{Type: ErrorTypeNotFound, Message: "not found", Err: errors.New("file missing")},
			want:    "not_found: not found (file missing)",
		},
		{
			name:    "unknown type",
			appErr:  &AppError{Type: ErrorTypeUnknown, Message: "something went wrong"},
			want:    "unknown: something went wrong",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.appErr.Error()
			if got != tt.want {
				t.Errorf("Error() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestAppError_Unwrap(t *testing.T) {
	inner := errors.New("inner error")
	appErr := &AppError{Err: inner}
	if !errors.Is(appErr, inner) {
		t.Error("expected errors.Is to find inner error via Unwrap")
	}
}

func TestAppError_Unwrap_Nil(t *testing.T) {
	appErr := &AppError{Err: nil}
	got := appErr.Unwrap()
	if got != nil {
		t.Errorf("Unwrap() = %v, want nil", got)
	}
}

func TestNewValidationError(t *testing.T) {
	cause := errors.New("bad value")
	err := NewValidationError("invalid input", cause)
	if err.Type != ErrorTypeValidation {
		t.Errorf("Type = %q, want %q", err.Type, ErrorTypeValidation)
	}
	if err.Message != "invalid input" {
		t.Errorf("Message = %q, want %q", err.Message, "invalid input")
	}
	if err.Err != cause {
		t.Errorf("Err = %v, want %v", err.Err, cause)
	}
	var appErr *AppError
	if !errors.As(err, &appErr) {
		t.Fatal("expected *AppError")
	}
}

func TestNewNotFoundError(t *testing.T) {
	cause := errors.New("missing")
	err := NewNotFoundError("resource not found", cause)
	if err.Type != ErrorTypeNotFound {
		t.Errorf("Type = %q, want %q", err.Type, ErrorTypeNotFound)
	}
	if err.Message != "resource not found" {
		t.Errorf("Message = %q", err.Message)
	}
	if err.Err != cause {
		t.Errorf("Err = %v, want %v", err.Err, cause)
	}
}

func TestNewIOError(t *testing.T) {
	cause := errors.New("disk full")
	err := NewIOError("write failed", cause)
	if err.Type != ErrorTypeIO {
		t.Errorf("Type = %q, want %q", err.Type, ErrorTypeIO)
	}
	if err.Message != "write failed" {
		t.Errorf("Message = %q", err.Message)
	}
	if err.Err != cause {
		t.Errorf("Err = %v, want %v", err.Err, cause)
	}
}

func TestNewBusinessError(t *testing.T) {
	cause := errors.New("conflict")
	err := NewBusinessError("operation not allowed", cause)
	if err.Type != ErrorTypeBusiness {
		t.Errorf("Type = %q, want %q", err.Type, ErrorTypeBusiness)
	}
	if err.Message != "operation not allowed" {
		t.Errorf("Message = %q", err.Message)
	}
	if err.Err != cause {
		t.Errorf("Err = %v, want %v", err.Err, cause)
	}
}

func TestNewNetworkError(t *testing.T) {
	cause := errors.New("timeout")
	err := NewNetworkError("connection failed", cause)
	if err.Type != ErrorTypeNetwork {
		t.Errorf("Type = %q, want %q", err.Type, ErrorTypeNetwork)
	}
	if err.Message != "connection failed" {
		t.Errorf("Message = %q", err.Message)
	}
	if err.Err != cause {
		t.Errorf("Err = %v, want %v", err.Err, cause)
	}
}

func TestWrapError(t *testing.T) {
	inner := errors.New("original error")
	err := WrapError(inner, ErrorTypeIO, "wrapped message")
	if err.Type != ErrorTypeIO {
		t.Errorf("Type = %q, want %q", err.Type, ErrorTypeIO)
	}
	if err.Message != "wrapped message" {
		t.Errorf("Message = %q", err.Message)
	}
	if err.Err != inner {
		t.Errorf("Err = %v, want %v", err.Err, inner)
	}
}

func TestErrorConstants_NotEmpty(t *testing.T) {
	// Verify all error type constants are non-empty strings
	types := []ErrorType{ErrorTypeValidation, ErrorTypeNotFound, ErrorTypeIO, ErrorTypeBusiness, ErrorTypeNetwork, ErrorTypeUnknown}
	for _, et := range types {
		if string(et) == "" {
			t.Errorf("error type constant is empty")
		}
	}
}
