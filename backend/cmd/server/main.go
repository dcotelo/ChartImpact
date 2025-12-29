package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	log "github.com/sirupsen/logrus"

	apiHandlers "github.com/dcotelo/chartimpact/backend/internal/api/handlers"
	"github.com/dcotelo/chartimpact/backend/internal/api/middleware"
	"github.com/dcotelo/chartimpact/backend/internal/service"
	"github.com/dcotelo/chartimpact/backend/internal/storage"
	"github.com/dcotelo/chartimpact/backend/internal/util"
)

// version is set via ldflags at build time
var version = "dev"

func main() {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Warn("No .env file found, using system environment variables")
	}

	// Configure logging
	setupLogging()

	log.Infof("Starting ChartImpact Backend API (version: %s)", version)

	// Get configuration from environment
	port := getEnv("PORT", "8080")
	host := getEnv("HOST", "0.0.0.0")

	// Initialize storage (optional, based on feature flag)
	var store storage.ComparisonStore
	storageEnabled := util.GetBoolEnv("STORAGE_ENABLED", false)

	if storageEnabled {
		databaseURL := util.GetStringEnv("DATABASE_URL", "")
		if databaseURL == "" {
			log.Warn("STORAGE_ENABLED=true but DATABASE_URL not set, storage will be disabled")
		} else {
			var err error
			store, err = storage.NewPostgresStore(databaseURL, log.StandardLogger())
			if err != nil {
				log.Errorf("Failed to initialize storage: %v", err)
				log.Warn("Continuing without storage")
			} else {
				log.Info("Storage layer initialized successfully")
				defer store.Close()
			}
		}
	} else {
		log.Info("Storage is disabled (set STORAGE_ENABLED=true to enable)")
	}

	// Initialize services
	helmService := service.NewHelmService()

	// Setup router
	router := mux.NewRouter()

	// Apply middleware
	router.Use(middleware.CORS)
	router.Use(middleware.Logging)
	router.Use(middleware.Recovery)

	// API routes
	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/compare", apiHandlers.CompareHandler(helmService, store)).Methods("POST", "OPTIONS")
	api.HandleFunc("/versions", apiHandlers.VersionsHandler()).Methods("POST", "OPTIONS")
	api.HandleFunc("/health", apiHandlers.HealthHandler(store)).Methods("GET")

	// Storage-enabled routes
	if store != nil {
		api.HandleFunc("/analysis/{id}", apiHandlers.GetAnalysisHandler(store)).Methods("GET", "OPTIONS")
		api.HandleFunc("/analysis", apiHandlers.ListAnalysisHandler(store)).Methods("GET", "OPTIONS")
		api.HandleFunc("/analytics/charts/popular", apiHandlers.PopularChartsHandler(store)).Methods("GET", "OPTIONS")
		log.Info("Storage endpoints enabled:")
		log.Info("  GET  /api/analysis/{id}            - Retrieve stored comparison")
		log.Info("  GET  /api/analysis                 - List recent comparisons")
		log.Info("  GET  /api/analytics/charts/popular - Popular charts statistics")
	}

	// Setup server
	addr := fmt.Sprintf("%s:%s", host, port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 150 * time.Second, // Longer for potentially long-running comparisons
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Infof("Server listening on %s", addr)
		log.Info("API endpoints:")
		log.Info("  POST /api/compare   - Compare two Helm chart versions")
		log.Info("  POST /api/versions  - Fetch available versions from a repository")
		log.Info("  GET  /api/health    - Health check")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down server...")

	// Give outstanding requests a deadline for completion
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Info("Server exited")
}

// setupLogging configures the logging format and level
func setupLogging() {
	// Set log format
	logFormat := getEnv("LOG_FORMAT", "json")
	if logFormat == "json" {
		log.SetFormatter(&log.JSONFormatter{})
	} else {
		log.SetFormatter(&log.TextFormatter{
			FullTimestamp: true,
		})
	}

	// Set log level
	logLevel := getEnv("LOG_LEVEL", "info")
	level, err := log.ParseLevel(logLevel)
	if err != nil {
		level = log.InfoLevel
	}
	log.SetLevel(level)

	// Output to stdout
	log.SetOutput(os.Stdout)
}

// getEnv retrieves an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
