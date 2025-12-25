package middleware

import (
	"net/http"
	"time"

	"github.com/felixge/httpsnoop"
	log "github.com/sirupsen/logrus"
)

// Logging middleware logs HTTP requests and responses
// Captures method, path, status code, duration, and size
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Capture response metrics
		m := httpsnoop.CaptureMetrics(next, w, r)

		// Log request details
		log.WithFields(log.Fields{
			"method":     r.Method,
			"path":       r.URL.Path,
			"status":     m.Code,
			"duration":   m.Duration.Milliseconds(),
			"size":       m.Written,
			"remote":     r.RemoteAddr,
			"user_agent": r.UserAgent(),
		}).Info("HTTP request")

		// Log slow requests as warnings
		if m.Duration > 5*time.Second {
			log.WithFields(log.Fields{
				"method":   r.Method,
				"path":     r.URL.Path,
				"duration": m.Duration.Seconds(),
			}).Warn("Slow request detected")
		}

		_ = start // Use start if needed for additional metrics
	})
}
