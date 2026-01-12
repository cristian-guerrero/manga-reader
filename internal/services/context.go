package services

import (
	"context"
	"time"
)

// ContextConfig holds configuration for context creation
type ContextConfig struct {
	Timeout  time.Duration
	Deadline time.Time
}

// WithTimeout creates a context with timeout
func WithTimeout(parent context.Context, timeout time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(parent, timeout)
}

// WithTimeoutOrDefault creates a context with timeout, using default if timeout is 0
func WithTimeoutOrDefault(parent context.Context, timeout, defaultTimeout time.Duration) (context.Context, context.CancelFunc) {
	if timeout == 0 {
		timeout = defaultTimeout
	}
	return context.WithTimeout(parent, timeout)
}

// DefaultTimeouts contains default timeout values for different operations
var DefaultTimeouts = struct {
	FileOperation time.Duration // File I/O operations
	NetworkRequest time.Duration // Network requests
	LongOperation time.Duration // Long-running operations
}{
	FileOperation: 30 * time.Second,
	NetworkRequest: 60 * time.Second,
	LongOperation:  5 * time.Minute,
}

// WithFileOperationTimeout creates a context with default file operation timeout
func WithFileOperationTimeout(parent context.Context) (context.Context, context.CancelFunc) {
	return WithTimeout(parent, DefaultTimeouts.FileOperation)
}

// WithNetworkTimeout creates a context with default network timeout
func WithNetworkTimeout(parent context.Context) (context.Context, context.CancelFunc) {
	return WithTimeout(parent, DefaultTimeouts.NetworkRequest)
}

// WithLongOperationTimeout creates a context with default long operation timeout
func WithLongOperationTimeout(parent context.Context) (context.Context, context.CancelFunc) {
	return WithTimeout(parent, DefaultTimeouts.LongOperation)
}

// IsContextError checks if an error is a context error (cancelled or timeout)
func IsContextError(err error) bool {
	if err == nil {
		return false
	}
	return err == context.Canceled || err == context.DeadlineExceeded
}

// ContextFromModule extracts context from a module if it implements ContextProvider
func ContextFromModule(module interface{}) context.Context {
	if provider, ok := module.(interface{ Context() context.Context }); ok {
		return provider.Context()
	}
	return context.Background()
}
