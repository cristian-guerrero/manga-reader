package services

import (
	"bytes"
	"io"
	"os"
	"strings"
	"sync"
	"testing"
)

// captureOutput redirects os.Stdout during fn and returns captured output
func captureOutput(fn func()) string {
	r, w, _ := os.Pipe()
	old := os.Stdout
	os.Stdout = w

	fn()

	w.Close()
	os.Stdout = old

	var buf bytes.Buffer
	io.Copy(&buf, r)
	return buf.String()
}

// ---------- LogLevel.String ----------

func TestLogLevel_String(t *testing.T) {
	tests := []struct {
		level LogLevel
		want  string
	}{
		{LogLevelDebug, "DEBUG"},
		{LogLevelInfo, "INFO"},
		{LogLevelWarn, "WARN"},
		{LogLevelError, "ERROR"},
		{LogLevel(99), "UNKNOWN"},
	}
	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			got := tt.level.String()
			if got != tt.want {
				t.Errorf("String() = %q, want %q", got, tt.want)
			}
		})
	}
}

// ---------- NewLogger / GetLevel / SetLevel ----------

func TestNewLogger_DefaultLevel(t *testing.T) {
	l := NewLogger(LogLevelWarn)
	if l.GetLevel() != LogLevelWarn {
		t.Errorf("GetLevel() = %d, want %d", l.GetLevel(), LogLevelWarn)
	}
}

func TestSetLevel(t *testing.T) {
	l := NewLogger(LogLevelInfo)
	l.SetLevel(LogLevelDebug)
	if l.GetLevel() != LogLevelDebug {
		t.Errorf("GetLevel() = %d, want %d", l.GetLevel(), LogLevelDebug)
	}
}

func TestGetLevel_ConcurrentSafe(t *testing.T) {
	l := NewLogger(LogLevelInfo)

	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			l.GetLevel()
			l.SetLevel(LogLevelDebug)
			l.GetLevel()
		}()
	}
	wg.Wait()
	// No race condition should occur
}

// ---------- Level filtering ----------

func TestLogger_FiltersBelowLevel(t *testing.T) {
	l := NewLogger(LogLevelWarn)

	output := captureOutput(func() {
		l.Debug("debug message")
		l.Info("info message")
		// These should pass
		l.Warn("warn message")
		l.Error("error message")
	})

	// Debug and Info should be filtered out
	if strings.Contains(output, "debug message") {
		t.Error("Debug message should be filtered at WARN level")
	}
	if strings.Contains(output, "info message") {
		t.Error("Info message should be filtered at WARN level")
	}
	if !strings.Contains(output, "warn message") {
		t.Error("Warn message should appear at WARN level")
	}
	if !strings.Contains(output, "error message") {
		t.Error("Error message should appear at WARN level")
	}
}

func TestLogger_DebugLevel_AllPass(t *testing.T) {
	l := NewLogger(LogLevelDebug)

	output := captureOutput(func() {
		l.Debug("debug")
		l.Info("info")
		l.Warn("warn")
		l.Error("error")
	})

	for _, level := range []string{"DEBUG", "INFO", "WARN", "ERROR"} {
		if !strings.Contains(output, "["+level+"]") {
			t.Errorf("expected level %q in output", level)
		}
	}
}

// ---------- Formatting ----------

func TestLogger_Formatting_WithArgs(t *testing.T) {
	l := NewLogger(LogLevelInfo)

	output := captureOutput(func() {
		l.Info("hello %s %d", "world", 42)
	})

	if !strings.Contains(output, "hello world 42") {
		t.Errorf("expected formatted message, got %q", output)
	}
}

func TestLogger_Formatting_WithoutArgs(t *testing.T) {
	l := NewLogger(LogLevelInfo)

	output := captureOutput(func() {
		l.Info("plain message")
	})

	if !strings.Contains(output, "plain message") {
		t.Errorf("expected plain message, got %q", output)
	}
}

// ---------- Each level method ----------

func TestLogger_Debug(t *testing.T) {
	l := NewLogger(LogLevelDebug)
	output := captureOutput(func() { l.Debug("dbg") })
	if !strings.Contains(output, "[DEBUG]") {
		t.Errorf("expected [DEBUG] in output")
	}
}

func TestLogger_Info(t *testing.T) {
	l := NewLogger(LogLevelInfo)
	output := captureOutput(func() { l.Info("inf") })
	if !strings.Contains(output, "[INFO]") {
		t.Errorf("expected [INFO] in output")
	}
}

func TestLogger_Warn(t *testing.T) {
	l := NewLogger(LogLevelWarn)
	output := captureOutput(func() { l.Warn("wrn") })
	if !strings.Contains(output, "[WARN]") {
		t.Errorf("expected [WARN] in output")
	}
}

func TestLogger_Error(t *testing.T) {
	l := NewLogger(LogLevelError)
	output := captureOutput(func() { l.Error("err") })
	if !strings.Contains(output, "[ERROR]") {
		t.Errorf("expected [ERROR] in output")
	}
}

// ---------- f variants ----------

func TestLogger_Debugf(t *testing.T) {
	l := NewLogger(LogLevelDebug)
	output := captureOutput(func() { l.Debugf("test %d", 1) })
	if !strings.Contains(output, "[DEBUG]") {
		t.Errorf("expected [DEBUG] in output, got %q", output)
	}
}

func TestLogger_Infof(t *testing.T) {
	l := NewLogger(LogLevelInfo)
	output := captureOutput(func() { l.Infof("info %s", "x") })
	if !strings.Contains(output, "[INFO]") {
		t.Errorf("expected [INFO] in output")
	}
}

func TestLogger_Warnf(t *testing.T) {
	l := NewLogger(LogLevelWarn)
	output := captureOutput(func() { l.Warnf("warn %d", 2) })
	if !strings.Contains(output, "[WARN]") {
		t.Errorf("expected [WARN] in output")
	}
}

func TestLogger_Errorf(t *testing.T) {
	l := NewLogger(LogLevelError)
	output := captureOutput(func() { l.Errorf("err %v", "x") })
	if !strings.Contains(output, "[ERROR]") {
		t.Errorf("expected [ERROR] in output")
	}
}

// ---------- Timestamp in output ----------

func TestLogger_IncludesTimestamp(t *testing.T) {
	l := NewLogger(LogLevelInfo)
	output := captureOutput(func() {
		l.Info("test")
	})
	// Should match [YYYY-MM-DD HH:MM:SS] format
	if !strings.Contains(output, "[20") {
		t.Errorf("expected timestamp in output, got %q", output)
	}
}

// ---------- WithFields ----------

func TestWithFields(t *testing.T) {
	l := NewLogger(LogLevelDebug)
	withFields := l.WithFields(map[string]interface{}{"key": "value"})
	if withFields != l {
		t.Error("WithFields should return the same logger (simple implementation)")
	}
}

// ---------- Timestamp format ----------

func TestLogLevel_String_FormatInOutput(t *testing.T) {
	l := NewLogger(LogLevelDebug)
	output := captureOutput(func() {
		l.Info("format check")
	})
	if !strings.Contains(output, "[INFO]") {
		t.Errorf("expected level in brackets, got %q", output)
	}
}

// ---------- Package-level functions ----------

func TestPackageLevel_Debug(t *testing.T) {
	// Reset the singleton for test isolation
	oldLogger := defaultLogger
	defaultLogger = nil
	once = sync.Once{}
	t.Cleanup(func() {
		defaultLogger = oldLogger
		once = sync.Once{}
	})

	// Set level to DEBUG so Debug messages pass through
	GetLogger().SetLevel(LogLevelDebug)

	output := captureOutput(func() {
		Debug("pkg debug %d", 1)
	})
	if !strings.Contains(output, "[DEBUG]") {
		t.Errorf("expected [DEBUG] in output, got %q", output)
	}
}

func TestPackageLevel_Info(t *testing.T) {
	oldLogger := defaultLogger
	defaultLogger = nil
	once = sync.Once{}
	t.Cleanup(func() {
		defaultLogger = oldLogger
		once = sync.Once{}
	})

	output := captureOutput(func() {
		Info("pkg info")
	})
	if !strings.Contains(output, "[INFO]") {
		t.Errorf("expected [INFO] in output")
	}
}

func TestPackageLevel_Warn(t *testing.T) {
	oldLogger := defaultLogger
	defaultLogger = nil
	once = sync.Once{}
	t.Cleanup(func() {
		defaultLogger = oldLogger
		once = sync.Once{}
	})

	output := captureOutput(func() {
		Warn("pkg warn")
	})
	if !strings.Contains(output, "[WARN]") {
		t.Errorf("expected [WARN] in output")
	}
}

func TestPackageLevel_Error(t *testing.T) {
	oldLogger := defaultLogger
	defaultLogger = nil
	once = sync.Once{}
	t.Cleanup(func() {
		defaultLogger = oldLogger
		once = sync.Once{}
	})

	output := captureOutput(func() {
		Error("pkg error")
	})
	if !strings.Contains(output, "[ERROR]") {
		t.Errorf("expected [ERROR] in output")
	}
}

func TestPackageLevel_Debugf(t *testing.T) {
	oldLogger := defaultLogger
	defaultLogger = nil
	once = sync.Once{}
	t.Cleanup(func() {
		defaultLogger = oldLogger
		once = sync.Once{}
	})

	GetLogger().SetLevel(LogLevelDebug)

	output := captureOutput(func() {
		Debugf("fmt %s", "test")
	})
	if !strings.Contains(output, "[DEBUG]") {
		t.Errorf("expected [DEBUG] in output")
	}
}

func TestPackageLevel_Infof(t *testing.T) {
	oldLogger := defaultLogger
	defaultLogger = nil
	once = sync.Once{}
	t.Cleanup(func() {
		defaultLogger = oldLogger
		once = sync.Once{}
	})

	output := captureOutput(func() {
		Infof("fmt %s", "test")
	})
	if !strings.Contains(output, "[INFO]") {
		t.Errorf("expected [INFO] in output")
	}
}

func TestPackageLevel_Warnf(t *testing.T) {
	oldLogger := defaultLogger
	defaultLogger = nil
	once = sync.Once{}
	t.Cleanup(func() {
		defaultLogger = oldLogger
		once = sync.Once{}
	})

	output := captureOutput(func() {
		Warnf("fmt %s", "test")
	})
	if !strings.Contains(output, "[WARN]") {
		t.Errorf("expected [WARN] in output")
	}
}

func TestPackageLevel_Errorf(t *testing.T) {
	oldLogger := defaultLogger
	defaultLogger = nil
	once = sync.Once{}
	t.Cleanup(func() {
		defaultLogger = oldLogger
		once = sync.Once{}
	})

	output := captureOutput(func() {
		Errorf("fmt %s", "test")
	})
	if !strings.Contains(output, "[ERROR]") {
		t.Errorf("expected [ERROR] in output")
	}
}

// ---------- GetLogger singleton ----------

func TestGetLogger_Singleton(t *testing.T) {
	oldLogger := defaultLogger
	defaultLogger = nil
	once = sync.Once{}
	t.Cleanup(func() {
		defaultLogger = oldLogger
		once = sync.Once{}
	})

	l1 := GetLogger()
	l2 := GetLogger()
	if l1 != l2 {
		t.Error("GetLogger should return the same instance")
	}
}

func TestGetLogger_DefaultLevel(t *testing.T) {
	oldLogger := defaultLogger
	defaultLogger = nil
	once = sync.Once{}
	t.Cleanup(func() {
		defaultLogger = oldLogger
		once = sync.Once{}
	})

	l := GetLogger()
	if l.GetLevel() != LogLevelInfo {
		t.Errorf("default level = %d, want %d", l.GetLevel(), LogLevelInfo)
	}
}
