package fileloader

import (
	"embed"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

const (
	NetworkServerPort = 8080
)

// NetworkServer serves the Manga Visor web app on the local network.
type NetworkServer struct {
	mu        sync.Mutex
	server    *http.Server
	listener  net.Listener
	running   bool
	webDir    string
	imgServer http.Handler
}

// NewNetworkServer creates a new network server instance.
func NewNetworkServer(imgServer http.Handler) *NetworkServer {
	return &NetworkServer{
		webDir:    GetWebDir(),
		imgServer: imgServer,
	}
}

// Prepare extracts assets and generates shim.js. Must be called before Start.
func (ns *NetworkServer) Prepare(assets embed.FS, methodNames []string) error {
	// Extract embedded assets to disk
	if err := ExtractAssets(assets, ns.webDir); err != nil {
		return fmt.Errorf("extract assets: %w", err)
	}

	// Generate shim.js
	shimContent := GenerateShimJS(methodNames)
	if err := WriteFile(ns.webDir, "shim.js", shimContent); err != nil {
		return fmt.Errorf("write shim.js: %w", err)
	}

	// Inject shim script into index.html
	indexHTMLPath := filepath.Join(ns.webDir, "index.html")
	htmlData, err := os.ReadFile(indexHTMLPath)
	if err != nil {
		return fmt.Errorf("read index.html: %w", err)
	}

	htmlContent := string(htmlData)
	if !strings.Contains(htmlContent, `<script src="shim.js">`) {
		htmlContent = InjectShimScript(htmlContent)
		if err := os.WriteFile(indexHTMLPath, []byte(htmlContent), 0644); err != nil {
			return fmt.Errorf("inject shim into index.html: %w", err)
		}
	}

	return nil
}

// Start begins serving the web app on 0.0.0.0:8080.
func (ns *NetworkServer) Start(app any) error {
	ns.mu.Lock()
	defer ns.mu.Unlock()

	if ns.running {
		return nil
	}

	// Create listener
	listener, err := net.Listen("tcp", fmt.Sprintf("0.0.0.0:%d", NetworkServerPort))
	if err != nil {
		return fmt.Errorf("listen on port %d: %w", NetworkServerPort, err)
	}

	// Create router
	mux := http.NewServeMux()

	// API bridge
	mux.Handle("/api/call", NewBridgeHandler(app))

	// Image server proxy
	mux.Handle("/images/", ns.imgServer)
	mux.Handle("/thumbnails/", ns.imgServer)

	// Static file server
	mux.Handle("/", ns.staticFileHandler())

	ns.server = &http.Server{
		Handler: mux,
	}
	ns.listener = listener
	ns.running = true

	go func() {
		if err := ns.server.Serve(ns.listener); err != nil && err != http.ErrServerClosed {
			fmt.Printf("[NetworkServer] Server error: %v\n", err)
		}
	}()

	fmt.Printf("[NetworkServer] Started on http://0.0.0.0:%d\n", NetworkServerPort)
	return nil
}

// Stop shuts down the network server.
func (ns *NetworkServer) Stop() error {
	ns.mu.Lock()
	defer ns.mu.Unlock()

	if !ns.running {
		return nil
	}

	ns.running = false
	if ns.server != nil {
		return ns.server.Close()
	}
	return nil
}

// IsRunning returns whether the server is currently running.
func (ns *NetworkServer) IsRunning() bool {
	ns.mu.Lock()
	defer ns.mu.Unlock()
	return ns.running
}

// Address returns the server's address (e.g., "http://192.168.1.100:8080").
// Skips loopback and link-local (169.254.x.x) addresses, preferring routable LAN IPs.
func (ns *NetworkServer) Address() (string, error) {
	ns.mu.Lock()
	defer ns.mu.Unlock()

	if !ns.running {
		return "", fmt.Errorf("server not running")
	}

	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "", err
	}

	var firstGlobal net.IP
	for _, addr := range addrs {
		ipnet, ok := addr.(*net.IPNet)
		if !ok {
			continue
		}
		ip := ipnet.IP
		if ip.IsLoopback() || ip.IsLinkLocalUnicast() {
			continue
		}
		if ip.To4() == nil {
			continue
		}
		// Prefer a private (routable) IP; keep first non-link-local as fallback
		if ip.IsPrivate() {
			return fmt.Sprintf("http://%s:%d", ip.String(), NetworkServerPort), nil
		}
		if firstGlobal == nil {
			v := make(net.IP, len(ip))
			copy(v, ip)
			firstGlobal = v
		}
	}
	if firstGlobal != nil {
		return fmt.Sprintf("http://%s:%d", firstGlobal.String(), NetworkServerPort), nil
	}

	return fmt.Sprintf("http://localhost:%d", NetworkServerPort), nil
}

// staticFileHandler serves files from the web directory with proper cache headers.
func (ns *NetworkServer) staticFileHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Security: prevent directory traversal
		if strings.Contains(path, "..") {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		// Determine cache headers based on file type
		switch {
		case path == "/" || path == "/index.html":
			w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
			w.Header().Set("Pragma", "no-cache")
			w.Header().Set("Expires", "0")

		case strings.HasSuffix(path, ".js") && strings.Contains(path, "shim"):
			w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
			w.Header().Set("Pragma", "no-cache")
			w.Header().Set("Expires", "0")

		case strings.HasPrefix(path, "/assets/"):
			// Vite-hashed assets - immutable
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")

		default:
			w.Header().Set("Cache-Control", "no-cache")
		}

		// Serve file
		filePath := filepath.Join(ns.webDir, filepath.Clean(path))

		// Check if file exists
		info, err := os.Stat(filePath)
		if err != nil || info.IsDir() {
			// Fallback to index.html for SPA routing
			indexHTML := filepath.Join(ns.webDir, "index.html")
			if _, err := os.Stat(indexHTML); err == nil {
				http.ServeFile(w, r, indexHTML)
				return
			}
			http.NotFound(w, r)
			return
		}

		http.ServeFile(w, r, filePath)
	})
}
