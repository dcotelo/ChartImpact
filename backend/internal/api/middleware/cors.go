package middleware

import (
	"net/http"
	"os"
	"regexp"
	"strings"
)

// CORS middleware handles Cross-Origin Resource Sharing
// Configurable via environment variables:
// - CORS_ALLOWED_ORIGINS: comma-separated list of allowed origins (supports wildcards like https://*.domain.com)
// - CORS_ALLOWED_METHODS: comma-separated list of allowed HTTP methods
// - CORS_ALLOWED_HEADERS: comma-separated list of allowed headers
//
// Wildcard Support:
// The middleware supports wildcard patterns in origins using asterisk (*) as a wildcard character.
// Examples:
//   - https://*.example.com matches https://preview.example.com, https://staging.example.com, etc.
//   - https://preview-*.pages.dev matches https://preview-abc123.pages.dev, etc.
//
// Note: Wildcards are converted to regex patterns for matching. Use with caution to avoid
// overly permissive CORS policies.
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get allowed origins from environment or use default
		allowedOrigins := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
		origins := strings.Split(allowedOrigins, ",")

		// Check if origin is allowed
		origin := r.Header.Get("Origin")
		allowed := false

		for _, allowedOrigin := range origins {
			allowedOrigin = strings.TrimSpace(allowedOrigin)

			// Support wildcard patterns like https://*.domain.com
			if strings.Contains(allowedOrigin, "*") {
				// Convert wildcard to regex pattern
				// Escape regex special characters except *
				pattern := regexp.QuoteMeta(allowedOrigin)
				pattern = strings.ReplaceAll(pattern, "\\*", ".*")

				matched, err := regexp.MatchString("^"+pattern+"$", origin)
				if err == nil && matched {
					allowed = true
					break
				}
			} else if allowedOrigin == origin {
				// Exact match
				allowed = true
				break
			}
		}

		// Set CORS headers if origin is allowed
		if allowed {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			// If origin not allowed, don't set any CORS headers
			// This will cause the browser to block the request
		}

		// Get allowed methods from environment or use default
		allowedMethods := getEnv("CORS_ALLOWED_METHODS", "GET,POST,PUT,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Methods", allowedMethods)

		// Get allowed headers from environment or use default
		allowedHeaders := getEnv("CORS_ALLOWED_HEADERS", "Content-Type,Authorization")
		w.Header().Set("Access-Control-Allow-Headers", allowedHeaders)

		// Allow credentials
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// getEnv retrieves an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
