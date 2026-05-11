package persistence

import (
	"os"
	"sync"
	"testing"
)

// withTempDir sets dataDir to a temporary directory for the duration of the test.
// It also resets dataDirOnce so getDataDir() picks up the new directory.
func withTempDir(t *testing.T) string {
	t.Helper()

	tmpDir, err := os.MkdirTemp("", "manga-visor-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}

	// We need to work around dataDirOnce since it's a sync.Once.
	// Production code's getDataDir() checks if dataDir != "" and skips the Once body.
	// We must set dataDir BEFORE any call to getDataDir() in this test.
	// But if getDataDir() was already called (e.g. by another test running first),
	// dataDirOnce has already fired and we need to reset it.
	//
	// The cleanest approach: set dataDir AND use a fresh sync.Once.
	// Unfortunately sync.Once has no Reset method. We use a little trick:
	// dataDirOnce is a package-level var, and we can re-assign it to a fresh one.
	// Since tests run in the same package, this is safe.
	dataDir = tmpDir
	dataDirOnce = sync.Once{}

	t.Cleanup(func() {
		os.RemoveAll(tmpDir)
	})

	return tmpDir
}
