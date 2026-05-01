package colorizer

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type InstallStatus string

const (
	StatusNotInstalled    InstallStatus = "not_installed"
	StatusDownloadingPy   InstallStatus = "downloading_python"
	StatusDownloadingBE   InstallStatus = "downloading_backend"
	StatusInstallingDeps  InstallStatus = "installing_deps"
	StatusInstalling      InstallStatus = "installing"
	StatusReady           InstallStatus = "ready"
	StatusStartingServer  InstallStatus = "starting_server"
	StatusRunning         InstallStatus = "running"
	StatusError           InstallStatus = "error"
	StatusStopping        InstallStatus = "stopping"
)

type InstallProgress struct {
	Status  InstallStatus `json:"status"`
	Message string        `json:"message"`
	Percent float64       `json:"percent"`
	Error   string        `json:"error,omitempty"`
}

type ColorizeRequest struct {
	ImagePath      string `json:"image_path"`
	Colorize       bool   `json:"colorize"`
	Upscale        bool   `json:"upscale"`
	Denoise        bool   `json:"denoise"`
	DenoiseSigma   int    `json:"denoise_sigma"`
	UpscaleFactor  int    `json:"upscale_factor"`
	ColorizerType  string `json:"colorizer_type"`
	Size           int    `json:"size"`
}

type ColorizeResponse struct {
	Success       bool   `json:"success"`
	OutputPath    string `json:"output_path,omitempty"`
	OutputBase64  string `json:"output_base64,omitempty"`
	Message       string `json:"message,omitempty"`
	ProcessingMs  int64  `json:"processing_ms"`
}

type Manager struct {
	baseDir       string
	pythonPath    string
	backendPath   string
	serverURL     string
	serverProcess *managedProcess
	mu            sync.RWMutex

	status      InstallStatus
	statusMsg   string
	statusPct   float64
	statusError string

	onStatusChange func(InstallProgress)
}

func NewManager(baseDir string, onStatusChange func(InstallProgress)) *Manager {
	return &Manager{
		baseDir:        baseDir,
		pythonPath:     "",
		backendPath:    "",
		serverURL:      "http://127.0.0.1:5000",
		status:         StatusNotInstalled,
		onStatusChange: onStatusChange,
	}
}

func (m *Manager) GetStatus() InstallProgress {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return InstallProgress{
		Status:  m.status,
		Message: m.statusMsg,
		Percent: m.statusPct,
		Error:   m.statusError,
	}
}

func (m *Manager) setStatus(s InstallStatus, msg string, pct float64) {
	m.mu.Lock()
	m.status = s
	m.statusMsg = msg
	m.statusPct = pct
	if s == StatusError {
		m.statusError = msg
	}
	progress := InstallProgress{Status: s, Message: msg, Percent: pct}
	m.mu.Unlock()

	if m.onStatusChange != nil {
		m.onStatusChange(progress)
	}
}

func (m *Manager) IsRunning() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.status == StatusRunning && m.serverProcess != nil && m.serverProcess.isRunning()
}

func (m *Manager) GetServerURL() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.serverURL
}

func (m *Manager) IsInstalled() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return (m.pythonPath != "" && m.backendPath != "") || m.status == StatusRunning
}

func (m *Manager) CheckInstallation() InstallProgress {
	m.mu.RLock()
	pyPath := m.pythonPath
	bePath := m.backendPath
	m.mu.RUnlock()

	if pyPath != "" && bePath != "" {
		return InstallProgress{Status: StatusReady, Message: "Ready to start", Percent: 100}
	}
	return InstallProgress{Status: StatusNotInstalled, Message: "Not installed", Percent: 0}
}

func (m *Manager) Install() error {
	if m.IsRunning() {
		return fmt.Errorf("colorizer is already running")
	}

	go m.runInstallation()
	return nil
}

func (m *Manager) StartServer() error {
	if !m.IsInstalled() {
		return fmt.Errorf("colorizer not installed, run Install() first")
	}

	if m.IsRunning() {
		return nil
	}

	go m.runStartServer()
	return nil
}

func (m *Manager) StopServer() error {
	var hadProcess bool
	m.mu.Lock()
	hadProcess = m.serverProcess != nil
	if hadProcess {
		m.serverProcess.stop()
		m.serverProcess = nil
	}
	m.status = StatusReady
	m.statusMsg = "Server stopped"
	m.statusPct = 100
	m.mu.Unlock()

	if m.onStatusChange != nil {
		m.onStatusChange(InstallProgress{Status: StatusReady, Message: "Server stopped", Percent: 100})
	}
	return nil
}

func (m *Manager) ColorizeImage(req ColorizeRequest) (*ColorizeResponse, error) {
	if !m.IsRunning() {
		return nil, fmt.Errorf("colorizer server is not running")
	}

	startTime := time.Now()

	// Read image file and convert to base64 data URI
	imageBytes, err := os.ReadFile(req.ImagePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read image: %w", err)
	}

	ext := filepath.Ext(req.ImagePath)
	mimeType := "image/png"
	switch ext {
	case ".jpg", ".jpeg":
		mimeType = "image/jpeg"
	case ".webp":
		mimeType = "image/webp"
	}

	imgName := filepath.Base(req.ImagePath)
	dataURI := "data:" + mimeType + ";base64," + base64.StdEncoding.EncodeToString(imageBytes)

	// Get original image dimensions
	imgReader := bytes.NewReader(imageBytes)
	imgConfig, _, err := image.DecodeConfig(imgReader)
	if err != nil {
		fmt.Printf("[Colorizer] Warning: Could not decode image config: %v\n", err)
	}

	// Determine image size to send
	imgSize := req.Size
	if imgSize == 0 && err == nil {
		// Use original image dimensions (smaller side) as size
		if imgConfig.Width < imgConfig.Height {
			imgSize = imgConfig.Width
		} else {
			imgSize = imgConfig.Height
		}
	}

	// Build request payload
	payload := map[string]interface{}{
		"imgData":       dataURI,
		"imgName":       imgName,
		"colorize":      req.Colorize,
		"upscale":       req.Upscale,
		"denoise":       req.Denoise,
		"denoiseSigma":  req.DenoiseSigma,
		"upscaleFactor": req.UpscaleFactor,
		"imgSize":       imgSize,
	}
	if err == nil {
		payload["imgWidth"] = imgConfig.Width
		payload["imgHeight"] = imgConfig.Height
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	fmt.Printf("[Colorizer] Sending request to %s/colorize-image-data (payload size: %d bytes)\n", m.serverURL, len(jsonData))
	fmt.Printf("[Colorizer] Image: %s, Colorize: %v, Upscale: %v, Denoise: %v\n", imgName, req.Colorize, req.Upscale, req.Denoise)

	client := &http.Client{Timeout: 5 * time.Minute}
	reqStart := time.Now()
	resp, err := client.Post(m.serverURL+"/colorize-image-data", "application/json", bytes.NewBuffer(jsonData))
	fmt.Printf("[Colorizer] HTTP request took %v\n", time.Since(reqStart))
	if err != nil {
		return nil, fmt.Errorf("failed to contact colorizer server: %w", err)
	}
	defer resp.Body.Close()

	fmt.Printf("[Colorizer] Server responded with status %d\n", resp.StatusCode)

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("colorizer server returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	fmt.Printf("[Colorizer] Response body size: %d bytes\n", len(bodyBytes))

	// Log first 500 bytes of response for debugging
	if len(bodyBytes) > 500 {
		fmt.Printf("[Colorizer] Response preview: %s...\n", string(bodyBytes[:500]))
	} else {
		fmt.Printf("[Colorizer] Response body: %s\n", string(bodyBytes))
	}

	var flaskResp map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &flaskResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w\nbody: %s", err, string(bodyBytes))
	}

	colorImgData, _ := flaskResp["colorImgData"].(string)
	msg, _ := flaskResp["msg"].(string)

	if msg != "" && colorImgData == "" {
		return nil, fmt.Errorf("colorizer error: %s", msg)
	}

	return &ColorizeResponse{
		Success:      true,
		OutputBase64: colorImgData,
		ProcessingMs: time.Since(startTime).Milliseconds(),
	}, nil
}

func (m *Manager) LoadImageAsBase64(imagePath string) (string, error) {
	imageBytes, err := os.ReadFile(imagePath)
	if err != nil {
		return "", fmt.Errorf("failed to read image: %w", err)
	}

	ext := filepath.Ext(imagePath)
	mimeType := "image/png"
	switch ext {
	case ".jpg", ".jpeg":
		mimeType = "image/jpeg"
	case ".webp":
		mimeType = "image/webp"
	}

	return "data:" + mimeType + ";base64," + base64.StdEncoding.EncodeToString(imageBytes), nil
}

func (m *Manager) HealthCheck() bool {
	if m.serverURL == "" {
		return false
	}
	resp, err := http.Get(m.serverURL)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}
