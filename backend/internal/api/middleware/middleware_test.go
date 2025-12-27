package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

// mockHandler is a simple handler for testing middleware
var mockHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
})

func TestCORS_ExactMatch(t *testing.T) {
	// Set up environment
	os.Setenv("CORS_ALLOWED_ORIGINS", "https://example.com,https://app.example.com")
	defer os.Unsetenv("CORS_ALLOWED_ORIGINS")

	tests := []struct {
		name           string
		origin         string
		expectedOrigin string
		shoudAllow     bool
	}{
		{
			name:           "allowed origin - exact match",
			origin:         "https://example.com",
			expectedOrigin: "https://example.com",
			shoudAllow:     true,
		},
		{
			name:           "allowed origin - second in list",
			origin:         "https://app.example.com",
			expectedOrigin: "https://app.example.com",
			shoudAllow:     true,
		},
		{
			name:           "disallowed origin",
			origin:         "https://malicious.com",
			expectedOrigin: "",
			shoudAllow:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/api/test", nil)
			req.Header.Set("Origin", tt.origin)
			w := httptest.NewRecorder()

			handler := CORS(mockHandler)
			handler.ServeHTTP(w, req)

			gotOrigin := w.Header().Get("Access-Control-Allow-Origin")
			if tt.shoudAllow {
				if gotOrigin != tt.expectedOrigin {
					t.Errorf("Expected origin %q, got %q", tt.expectedOrigin, gotOrigin)
				}
			} else {
				if gotOrigin != "" {
					t.Errorf("Expected no CORS header for disallowed origin, got %q", gotOrigin)
				}
			}
		})
	}
}

func TestCORS_WildcardPattern(t *testing.T) {
	// Set up environment with wildcard patterns
	os.Setenv("CORS_ALLOWED_ORIGINS", "https://*.example.com,https://preview-*.pages.dev,http://localhost:3000")
	defer os.Unsetenv("CORS_ALLOWED_ORIGINS")

	tests := []struct {
		name           string
		origin         string
		expectedOrigin string
		shouldAllow    bool
	}{
		{
			name:           "wildcard subdomain match",
			origin:         "https://app.example.com",
			expectedOrigin: "https://app.example.com",
			shouldAllow:    true,
		},
		{
			name:           "wildcard subdomain - another match",
			origin:         "https://staging.example.com",
			expectedOrigin: "https://staging.example.com",
			shouldAllow:    true,
		},
		{
			name:           "wildcard prefix match",
			origin:         "https://preview-abc123.pages.dev",
			expectedOrigin: "https://preview-abc123.pages.dev",
			shouldAllow:    true,
		},
		{
			name:           "wildcard prefix - another match",
			origin:         "https://preview-xyz789.pages.dev",
			expectedOrigin: "https://preview-xyz789.pages.dev",
			shouldAllow:    true,
		},
		{
			name:           "exact match still works",
			origin:         "http://localhost:3000",
			expectedOrigin: "http://localhost:3000",
			shouldAllow:    true,
		},
		{
			name:           "wildcard doesn't match different domain",
			origin:         "https://app.different.com",
			expectedOrigin: "",
			shouldAllow:    false,
		},
		{
			name:           "wildcard doesn't match partial domain",
			origin:         "https://example.com",
			expectedOrigin: "",
			shouldAllow:    false,
		},
		{
			name:           "malicious origin blocked",
			origin:         "https://malicious.com",
			expectedOrigin: "",
			shouldAllow:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/api/test", nil)
			req.Header.Set("Origin", tt.origin)
			w := httptest.NewRecorder()

			handler := CORS(mockHandler)
			handler.ServeHTTP(w, req)

			gotOrigin := w.Header().Get("Access-Control-Allow-Origin")
			if tt.shouldAllow {
				if gotOrigin != tt.expectedOrigin {
					t.Errorf("Expected origin %q, got %q", tt.expectedOrigin, gotOrigin)
				}
			} else {
				if gotOrigin != "" {
					t.Errorf("Expected no CORS header for disallowed origin, got %q", gotOrigin)
				}
			}

			// Verify other CORS headers are set
			if w.Header().Get("Access-Control-Allow-Methods") == "" {
				t.Error("Expected Access-Control-Allow-Methods header to be set")
			}
			if w.Header().Get("Access-Control-Allow-Headers") == "" {
				t.Error("Expected Access-Control-Allow-Headers header to be set")
			}
			if w.Header().Get("Access-Control-Allow-Credentials") != "true" {
				t.Error("Expected Access-Control-Allow-Credentials to be 'true'")
			}
		})
	}
}

func TestCORS_PreflightRequest(t *testing.T) {
	os.Setenv("CORS_ALLOWED_ORIGINS", "https://example.com")
	defer os.Unsetenv("CORS_ALLOWED_ORIGINS")

	req := httptest.NewRequest("OPTIONS", "/api/test", nil)
	req.Header.Set("Origin", "https://example.com")
	w := httptest.NewRecorder()

	handler := CORS(mockHandler)
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("Expected status %d for preflight request, got %d", http.StatusNoContent, w.Code)
	}

	if w.Header().Get("Access-Control-Allow-Origin") != "https://example.com" {
		t.Error("Expected CORS headers to be set for preflight request")
	}
}

func TestCORS_CustomConfiguration(t *testing.T) {
	os.Setenv("CORS_ALLOWED_ORIGINS", "https://custom.com")
	os.Setenv("CORS_ALLOWED_METHODS", "GET,POST")
	os.Setenv("CORS_ALLOWED_HEADERS", "X-Custom-Header")
	defer func() {
		os.Unsetenv("CORS_ALLOWED_ORIGINS")
		os.Unsetenv("CORS_ALLOWED_METHODS")
		os.Unsetenv("CORS_ALLOWED_HEADERS")
	}()

	req := httptest.NewRequest("GET", "/api/test", nil)
	req.Header.Set("Origin", "https://custom.com")
	w := httptest.NewRecorder()

	handler := CORS(mockHandler)
	handler.ServeHTTP(w, req)

	if w.Header().Get("Access-Control-Allow-Methods") != "GET,POST" {
		t.Errorf("Expected custom methods, got %q", w.Header().Get("Access-Control-Allow-Methods"))
	}

	if w.Header().Get("Access-Control-Allow-Headers") != "X-Custom-Header" {
		t.Errorf("Expected custom headers, got %q", w.Header().Get("Access-Control-Allow-Headers"))
	}
}

func TestCORS_CloudflarePagesPattern(t *testing.T) {
	// Real-world test for Cloudflare Pages preview deployments
	os.Setenv("CORS_ALLOWED_ORIGINS", "https://ci.dcotelo.dev,https://*.chartimpact.pages.dev,http://localhost:3000")
	defer os.Unsetenv("CORS_ALLOWED_ORIGINS")

	tests := []struct {
		name        string
		origin      string
		shouldAllow bool
	}{
		{
			name:        "production domain",
			origin:      "https://ci.dcotelo.dev",
			shouldAllow: true,
		},
		{
			name:        "preview deployment with hash",
			origin:      "https://da5dc162.chartimpact.pages.dev",
			shouldAllow: true,
		},
		{
			name:        "preview deployment with name",
			origin:      "https://copilot-codebase-review-and.chartimpact.pages.dev",
			shouldAllow: true,
		},
		{
			name:        "localhost development",
			origin:      "http://localhost:3000",
			shouldAllow: true,
		},
		{
			name:        "different pages.dev domain blocked",
			origin:      "https://malicious.other.pages.dev",
			shouldAllow: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/api/versions", nil)
			req.Header.Set("Origin", tt.origin)
			w := httptest.NewRecorder()

			handler := CORS(mockHandler)
			handler.ServeHTTP(w, req)

			gotOrigin := w.Header().Get("Access-Control-Allow-Origin")
			if tt.shouldAllow {
				if gotOrigin != tt.origin {
					t.Errorf("Expected origin %q to be allowed, got %q", tt.origin, gotOrigin)
				}
			} else {
				if gotOrigin != "" {
					t.Errorf("Expected origin %q to be blocked, but got %q", tt.origin, gotOrigin)
				}
			}
		})
	}
}
