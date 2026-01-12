package services

import (
	"fmt"
)

// ErrorType represents the type of error
type ErrorType string

const (
	ErrorTypeValidation ErrorType = "validation"
	ErrorTypeNotFound   ErrorType = "not_found"
	ErrorTypeIO         ErrorType = "io"
	ErrorTypeBusiness   ErrorType = "business"
	ErrorTypeNetwork    ErrorType = "network"
	ErrorTypeUnknown    ErrorType = "unknown"
)

// AppError represents an application error with context
type AppError struct {
	Type    ErrorType
	Message string
	Err     error
	Context map[string]interface{}
}

// Error implements the error interface
func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s (%v)", e.Type, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Type, e.Message)
}

// Unwrap returns the underlying error
func (e *AppError) Unwrap() error {
	return e.Err
}

// NewValidationError creates a validation error
func NewValidationError(message string, err error) *AppError {
	return &AppError{
		Type:    ErrorTypeValidation,
		Message: message,
		Err:     err,
	}
}

// NewNotFoundError creates a not found error
func NewNotFoundError(message string, err error) *AppError {
	return &AppError{
		Type:    ErrorTypeNotFound,
		Message: message,
		Err:     err,
	}
}

// NewIOError creates an I/O error
func NewIOError(message string, err error) *AppError {
	return &AppError{
		Type:    ErrorTypeIO,
		Message: message,
		Err:     err,
	}
}

// NewBusinessError creates a business logic error
func NewBusinessError(message string, err error) *AppError {
	return &AppError{
		Type:    ErrorTypeBusiness,
		Message: message,
		Err:     err,
	}
}

// NewNetworkError creates a network error
func NewNetworkError(message string, err error) *AppError {
	return &AppError{
		Type:    ErrorTypeNetwork,
		Message: message,
		Err:     err,
	}
}

// WrapError wraps an existing error with context
func WrapError(err error, errorType ErrorType, message string) *AppError {
	return &AppError{
		Type:    errorType,
		Message: message,
		Err:     err,
	}
}
