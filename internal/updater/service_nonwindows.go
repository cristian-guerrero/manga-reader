//go:build !windows

package updater

func (s *Service) applyUpdateWindows(exe, newBinary string) error {
	return nil // Stub — macOS/Linux usa ApplyUpdate() directamente
}
