package fileloader

import (
	"bytes"
	"strings"
	"text/template"
)

// GenerateShimJS generates the shim.js content that mocks window.runtime and window.go
// for browser-based access to the app.
func GenerateShimJS(methodNames []string) []byte {
	tmpl := template.Must(template.New("shim").Parse(shimTemplate))

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, struct {
		Methods []string
	}{
		Methods: methodNames,
	}); err != nil {
		return []byte(minimalShim)
	}

	return buf.Bytes()
}

const shimTemplate = `// Manga Visor Network Server Shim
// Provides window.runtime and window.go mocks for browser access

(function() {
	'use strict';

	// --- Event System ---
	const _eventListeners = {};

	window.runtime = {
		EventsOn: function(eventName, callback) {
			if (!_eventListeners[eventName]) {
				_eventListeners[eventName] = [];
			}
			_eventListeners[eventName].push(callback);
			return function() {
				const idx = _eventListeners[eventName].indexOf(callback);
				if (idx !== -1) _eventListeners[eventName].splice(idx, 1);
			};
		},
		EventsOnMultiple: function(eventName, callback, maxCallbacks) {
			let count = 0;
			const wrapped = function() {
				count++;
				if (count <= maxCallbacks) callback.apply(null, arguments);
				if (count >= maxCallbacks) {
					const idx = _eventListeners[eventName].indexOf(wrapped);
					if (idx !== -1) _eventListeners[eventName].splice(idx, 1);
				}
			};
			return this.EventsOn(eventName, wrapped);
		},
		EventsOnce: function(eventName, callback) {
			return this.EventsOnMultiple(eventName, callback, 1);
		},
		EventsOff: function(eventName) {
			delete _eventListeners[eventName];
		},
		EventsOffAll: function() {
			for (const key in _eventListeners) delete _eventListeners[key];
		},
		EventsEmit: function(eventName) {
			const args = Array.prototype.slice.call(arguments, 1);
			const listeners = _eventListeners[eventName] || [];
			listeners.forEach(function(cb) { cb.apply(null, args); });
		},

		// - Window Controls (no-ops for browser) -
		WindowMinimise: function() {},
		WindowMaximise: function() {},
		WindowUnmaximise: function() {},
		WindowToggleMaximise: function() {},
		WindowIsMaximised: function() { return Promise.resolve(false); },
		WindowIsMinimised: function() { return Promise.resolve(false); },
		WindowIsNormal: function() { return Promise.resolve(true); },
		WindowIsFullscreen: function() { return Promise.resolve(false); },
		WindowGetSize: function() { return Promise.resolve({ w: window.innerWidth, h: window.innerHeight }); },
		WindowGetPosition: function() { return Promise.resolve({ x: 0, y: 0 }); },
		WindowSetSize: function() {},
		WindowSetPosition: function() {},
		WindowSetTitle: function() {},
		WindowCenter: function() {},
		WindowHide: function() {},
		WindowShow: function() {},
		WindowFullscreen: function() {},
		WindowUnfullscreen: function() {},
		WindowSetAlwaysOnTop: function() {},
		WindowSetMaxSize: function() {},
		WindowSetMinSize: function() {},
		WindowSetBackgroundColour: function() {},
		WindowSetSystemDefaultTheme: function() {},
		WindowSetLightTheme: function() {},
		WindowSetDarkTheme: function() {},
		WindowReload: function() { location.reload(); },
		WindowReloadApp: function() { location.reload(); },

		// - Application -
		Quit: function() { alert('Close the browser tab to exit'); },
		Hide: function() {},
		Show: function() {},
		Environment: function() { return Promise.resolve({ buildType: 'network', platform: 'browser', arch: 'web' }); },

		// - Clipboard -
		ClipboardGetText: function() {
			if (navigator.clipboard && navigator.clipboard.readText) {
				return navigator.clipboard.readText();
			}
			return Promise.resolve('');
		},
		ClipboardSetText: function(text) {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				return navigator.clipboard.writeText(text).then(function() { return true; }).catch(function() { return false; });
			}
			return Promise.resolve(false);
		},

		// - Browser -
		BrowserOpenURL: function(url) { window.open(url, '_blank'); },

		// - Dialogs (browser equivalents) -
		OpenDirectoryDialog: function() { return Promise.resolve(''); },
		OpenFileDialog: function() { return Promise.resolve(''); },
		SaveFileDialog: function() { return Promise.resolve(''); },
		MessageDialog: function(opts) {
			alert(opts.message || '');
			return Promise.resolve('');
		},

		// - Logging -
		LogPrint: function(msg) { console.log('[Wails]', msg); },
		LogTrace: function(msg) { console.trace('[Wails]', msg); },
		LogDebug: function(msg) { console.debug('[Wails]', msg); },
		LogInfo: function(msg) { console.info('[Wails]', msg); },
		LogWarning: function(msg) { console.warn('[Wails]', msg); },
		LogError: function(msg) { console.error('[Wails]', msg); },
		LogFatal: function(msg) { console.error('[Wails FATAL]', msg); },

		// - Drag and Drop -
		OnFileDrop: function() {},
		OnFileDropOff: function() {},
		CanResolveFilePaths: function() { return false; },
		ResolveFilePaths: function() {},

		// - Notifications -
		InitializeNotifications: function() { return Promise.resolve(); },
		CleanupNotifications: function() { return Promise.resolve(); },
		IsNotificationAvailable: function() { return Promise.resolve(false); },
		RequestNotificationAuthorization: function() { return Promise.resolve(false); },
		CheckNotificationAuthorization: function() { return Promise.resolve(false); },
		SendNotification: function() { return Promise.resolve(); },
		SendNotificationWithActions: function() { return Promise.resolve(); },
		RegisterNotificationCategory: function() { return Promise.resolve(); },
		RemoveNotificationCategory: function() { return Promise.resolve(); },
		RemoveAllPendingNotifications: function() { return Promise.resolve(); },
		RemovePendingNotification: function() { return Promise.resolve(); },
		RemoveAllDeliveredNotifications: function() { return Promise.resolve(); },
		RemoveDeliveredNotification: function() { return Promise.resolve(); },
		RemoveNotification: function() { return Promise.resolve(); },
	};

	// - API Bridge -
	let _callId = 0;
	const _pendingCalls = {};

	function _callBackend(method) {
		const args = Array.prototype.slice.call(arguments, 1);
		const id = ++_callId;

		return new Promise(function(resolve, reject) {
			const timeout = setTimeout(function() {
				delete _pendingCalls[id];
				reject(new Error('Call to ' + method + ' timed out'));
			}, 30000);

			_pendingCalls[id] = { resolve: resolve, reject: reject, timeout: timeout };

			fetch('/api/call', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ method: method, args: args })
			})
			.then(function(res) { return res.json(); })
			.then(function(data) {
				clearTimeout(timeout);
				delete _pendingCalls[id];
				if (data.error) {
					reject(new Error(data.error));
				} else {
					resolve(data.result);
				}
			})
			.catch(function(err) {
				clearTimeout(timeout);
				delete _pendingCalls[id];
				reject(err);
			});
		});
	}

	// - Go App Methods -
	window.go = { main: { App: {} } };

	{{range .Methods}}
	window.go.main.App['{{.}}'] = function() {
		return _callBackend('{{.}}', ...arguments);
	};
	{{end}}

	// - Global exposure -
	window._callBackend = _callBackend;

	console.log('[MangaVisor Shim] Network server bridge initialized');
})();
`

// minimalShim is a fallback if template generation fails.
const minimalShim = `
(function() {
	window.runtime = {
		EventsOn: function() { return function() {}; },
		EventsOff: function() {},
		EventsEmit: function() {},
		WindowIsMaximised: function() { return Promise.resolve(false); },
		WindowMinimise: function() {},
		WindowMaximise: function() {},
		WindowUnmaximise: function() {},
		WindowToggleMaximise: function() {},
		Quit: function() {},
		ClipboardSetText: function() { return Promise.resolve(false); },
		OnFileDrop: function() {},
		OnFileDropOff: function() {},
	};
	window.go = { main: { App: {} } };
})();
`

// GetMethodNames extracts exported method names from a Go struct via reflection.
// This is a helper that the caller (app.go) uses to pass method names to GenerateShimJS.
func GetMethodNames(methodNames []string) []string {
	// Filter out unexported methods (those starting with lowercase)
	var exported []string
	for _, name := range methodNames {
		if len(name) > 0 && name[0] >= 'A' && name[0] <= 'Z' {
			exported = append(exported, name)
		}
	}
	return exported
}

// GenerateShimFromMethodNames is a convenience that filters and generates.
func GenerateShimFromMethodNames(allMethods []string) []byte {
	return GenerateShimJS(GetMethodNames(allMethods))
}

// InjectShimScript injects <script src="shim.js"></script> into index.html content.
func InjectShimScript(htmlContent string) string {
	if strings.Contains(htmlContent, `<script src="shim.js">`) {
		return htmlContent
	}
	return strings.Replace(htmlContent, "</head>", `<script src="shim.js"></script>
</head>`, 1)
}
