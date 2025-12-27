package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/chartutil"
	"helm.sh/helm/v3/pkg/cli"
	"sigs.k8s.io/yaml"

	"github.com/dcotelo/chartimpact/backend/internal/diff"
	"github.com/dcotelo/chartimpact/backend/internal/models"
	"github.com/dcotelo/chartimpact/backend/internal/util"
)

// Compiled regex for cleaning up excessive empty lines in diff output
var excessiveNewlinesRegex = regexp.MustCompile(`\n{3,}`)

// HelmService handles Helm chart operations using the Helm Go SDK
type HelmService struct {
	settings *cli.EnvSettings
	tempDir  string
}

// NewHelmService creates a new instance of HelmService
func NewHelmService() *HelmService {
	settings := cli.New()
	tempDir := os.Getenv("TEMP_DIR")
	if tempDir == "" {
		tempDir = "/tmp/chartimpact"
	}

	// Ensure temp directory exists
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		log.Warnf("Failed to create temp directory %s: %v", tempDir, err)
	}

	return &HelmService{
		settings: settings,
		tempDir:  tempDir,
	}
}

// CompareVersions compares two versions of a Helm chart and returns the diff
// This is the main method that orchestrates the entire comparison process:
// 1. Creates a unique work directory
// 2. Clones the Git repository
// 3. Extracts both chart versions
// 4. Builds dependencies for both versions
// 5. Renders templates using Helm SDK
// 6. Compares rendered manifests using the internal comparison engine
func (h *HelmService) CompareVersions(ctx context.Context, req *models.CompareRequest) (*models.CompareResponse, error) {
	// Create unique work directory with timestamp and random ID
	workDir, err := h.createWorkDir()
	if err != nil {
		return &models.CompareResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to create work directory: %v", err),
		}, nil
	}
	defer h.cleanup(workDir)

	log.WithFields(log.Fields{
		"repository": req.Repository,
		"chartPath":  req.ChartPath,
		"version1":   req.Version1,
		"version2":   req.Version2,
		"workDir":    workDir,
	}).Info("Starting chart comparison")

	// Clone the repository
	repoDir := filepath.Join(workDir, "repo")
	if err := h.cloneRepository(ctx, req.Repository, repoDir); err != nil {
		return &models.CompareResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to clone repository: %v", err),
		}, nil
	}

	// Extract version 1
	chart1Dir := filepath.Join(workDir, "version1")
	if err := h.extractVersion(ctx, repoDir, req.ChartPath, req.Version1, chart1Dir, req.ValuesFile, req.ValuesContent); err != nil {
		return &models.CompareResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to extract version 1 (%s): %v", req.Version1, err),
		}, nil
	}

	// Extract version 2
	chart2Dir := filepath.Join(workDir, "version2")
	if err := h.extractVersion(ctx, repoDir, req.ChartPath, req.Version2, chart2Dir, req.ValuesFile, req.ValuesContent); err != nil {
		return &models.CompareResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to extract version 2 (%s): %v", req.Version2, err),
		}, nil
	}

	// Build dependencies for both versions
	if err := h.buildDependencies(ctx, chart1Dir); err != nil {
		log.Warnf("Failed to build dependencies for version 1: %v", err)
	}
	if err := h.buildDependencies(ctx, chart2Dir); err != nil {
		log.Warnf("Failed to build dependencies for version 2: %v", err)
	}

	// Render templates for both versions using Helm SDK
	rendered1, err := h.renderTemplate(ctx, chart1Dir, req.ValuesContent)
	if err != nil {
		return &models.CompareResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to render version 1 templates: %v", err),
		}, nil
	}

	rendered2, err := h.renderTemplate(ctx, chart2Dir, req.ValuesContent)
	if err != nil {
		return &models.CompareResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to render version 2 templates: %v", err),
		}, nil
	}

	// Compare the rendered templates
	diffResult, diffRaw, err := h.compareRendered(ctx, rendered1, rendered2, req.IgnoreLabels)
	if err != nil {
		return &models.CompareResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to compare templates: %v", err),
		}, nil
	}

	log.Info("Chart comparison completed successfully")

	response := h.buildCompareResponse(req.Version1, req.Version2, diffRaw, diffResult)
	return response, nil
}

// buildCompareResponse constructs a CompareResponse with structured diff if available
func (h *HelmService) buildCompareResponse(version1, version2, diffRaw string, diffResult *diff.DiffResult) *models.CompareResponse {
	response := &models.CompareResponse{
		Success:  true,
		Diff:     diffRaw,
		Version1: version1,
		Version2: version2,
	}

	// Add structured diff if available
	if diffResult != nil {
		response.StructuredDiff = h.convertToStructuredDiff(diffResult)
		response.StructuredDiffAvailable = true
	} else {
		response.StructuredDiffAvailable = false
	}

	return response
}

// createWorkDir creates a unique working directory for this comparison operation
// Directory name format: chart-compare-<timestamp>-<random-id>
func (h *HelmService) createWorkDir() (string, error) {
	// Generate random ID for uniqueness
	randomBytes := make([]byte, 8)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", fmt.Errorf("failed to generate random ID: %w", err)
	}
	randomID := hex.EncodeToString(randomBytes)

	// Create directory with timestamp and random ID
	timestamp := time.Now().Format("20060102-150405")
	dirName := fmt.Sprintf("chart-compare-%s-%s", timestamp, randomID)
	workDir := filepath.Join(h.tempDir, dirName)

	if err := os.MkdirAll(workDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory %s: %w", workDir, err)
	}

	return workDir, nil
}

// cloneRepository clones a Git repository to the specified directory
// Uses shallow clone (--depth=1) for efficiency
// Sets environment variables to prevent credential prompts
func (h *HelmService) cloneRepository(ctx context.Context, repoURL, destDir string) error {
	timeout := h.getTimeout("GIT_CLONE_TIMEOUT", 120)
	ctx, cancel := context.WithTimeout(ctx, time.Duration(timeout)*time.Second)
	defer cancel()

	log.Infof("Cloning repository: %s", repoURL)

	cmd := exec.CommandContext(ctx, "git", "clone", "--depth=1", repoURL, destDir)
	cmd.Env = append(os.Environ(),
		"GIT_TERMINAL=dumb",
		"GIT_ASKPASS=echo",
		"GIT_SSH_COMMAND=ssh -o StrictHostKeyChecking=no",
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("git clone failed: %w\nOutput: %s", err, string(output))
	}

	// Fetch all tags
	tagCmd := exec.CommandContext(ctx, "git", "-C", destDir, "fetch", "--tags")
	tagCmd.Env = cmd.Env
	if output, err := tagCmd.CombinedOutput(); err != nil {
		log.Warnf("Failed to fetch tags: %v\nOutput: %s", err, string(output))
	}

	return nil
}

// extractVersion checks out a specific version and copies the chart to a destination directory
// Supports Git tags, branches, and commit SHAs
// Validates chart structure (Chart.yaml and templates/ directory)
func (h *HelmService) extractVersion(ctx context.Context, repoDir, chartPath, version, destDir string, valuesFile, valuesContent *string) error {
	log.Infof("Extracting version %s from chart path %s", version, chartPath)

	// Fetch all refs to ensure we have the version
	fetchCmd := exec.CommandContext(ctx, "git", "-C", repoDir, "fetch", "--all", "--tags", "--prune")
	if output, err := fetchCmd.CombinedOutput(); err != nil {
		log.Warnf("Failed to fetch all refs: %v\nOutput: %s", err, string(output))
	}

	// Checkout the specified version
	checkoutCmd := exec.CommandContext(ctx, "git", "-C", repoDir, "checkout", version)
	if output, err := checkoutCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to checkout version %s: %w\nOutput: %s", version, err, string(output))
	}

	// Validate chart path exists and has proper structure
	sourceChartPath := filepath.Join(repoDir, chartPath)
	chartYaml := filepath.Join(sourceChartPath, "Chart.yaml")
	templatesDir := filepath.Join(sourceChartPath, "templates")

	// Check if Chart.yaml exists
	if _, err := os.Stat(chartYaml); err != nil {
		// Try to find the chart by looking for Chart.yaml files
		suggestion := h.suggestChartPath(repoDir)
		return fmt.Errorf("chart not found at %s. Did you mean one of these?\n%s", chartPath, suggestion)
	}

	// Check if templates directory exists
	if _, err := os.Stat(templatesDir); err != nil {
		return fmt.Errorf("templates directory not found at %s/templates", chartPath)
	}

	// Copy chart directory to destination
	if err := h.copyDir(sourceChartPath, destDir); err != nil {
		return fmt.Errorf("failed to copy chart: %w", err)
	}

	// Handle values file if specified
	if valuesFile != nil && *valuesFile != "" {
		sourceValuesPath := filepath.Join(repoDir, *valuesFile)
		destValuesPath := filepath.Join(destDir, "custom-values.yaml")
		if err := h.copyFile(sourceValuesPath, destValuesPath); err != nil {
			log.Warnf("Failed to copy values file: %v", err)
		}
	}

	return nil
}

// buildDependencies builds Helm chart dependencies
// Extracts dependency repositories and adds them to Helm
// Runs helm dependency update to download and build dependencies
func (h *HelmService) buildDependencies(ctx context.Context, chartDir string) error {
	log.Infof("Building dependencies for chart at %s", chartDir)

	// Load the chart to check for dependencies
	chart, err := loader.Load(chartDir)
	if err != nil {
		return fmt.Errorf("failed to load chart: %w", err)
	}

	// Check if chart has dependencies
	if chart.Metadata == nil || len(chart.Metadata.Dependencies) == 0 {
		log.Info("No dependencies found, skipping dependency build")
		return nil
	}

	// Extract and add repositories
	repos := h.extractRepositories(chart.Metadata.Dependencies)
	if err := h.addRepositories(ctx, repos); err != nil {
		log.Warnf("Failed to add repositories: %v", err)
	}

	// Build dependencies using helm dependency update command
	// The SDK doesn't provide a direct way to update dependencies, so we use CLI
	timeout := h.getTimeout("HELM_TIMEOUT", 60)
	ctx, cancel := context.WithTimeout(ctx, time.Duration(timeout)*time.Second)
	defer cancel()

	updateCmd := exec.CommandContext(ctx, "helm", "dependency", "update", chartDir)
	output, err := updateCmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("helm dependency update failed: %w\nOutput: %s", err, string(output))
	}

	log.Info("Dependencies built successfully")
	return nil
}

// extractRepositories extracts unique repository URLs from chart dependencies
// Filters out OCI repositories and @-prefixed aliases
func (h *HelmService) extractRepositories(dependencies []*chart.Dependency) []string {
	repoMap := make(map[string]bool)
	var repos []string

	for _, dep := range dependencies {
		if dep.Repository != "" && !strings.HasPrefix(dep.Repository, "@") && !strings.HasPrefix(dep.Repository, "oci://") {
			if strings.HasPrefix(dep.Repository, "http://") || strings.HasPrefix(dep.Repository, "https://") {
				if !repoMap[dep.Repository] {
					repoMap[dep.Repository] = true
					repos = append(repos, dep.Repository)
				}
			}
		}
	}

	return repos
}

// addRepositories adds Helm repositories from the dependency list
// Generates safe repository names from URLs
func (h *HelmService) addRepositories(ctx context.Context, repos []string) error {
	if len(repos) == 0 {
		return nil
	}

	log.Infof("Adding %d repositories", len(repos))

	for _, repoURL := range repos {
		repoName := h.generateRepoName(repoURL)

		// Try to add repository (idempotent operation)
		addCmd := exec.CommandContext(ctx, "helm", "repo", "add", repoName, repoURL)
		if output, err := addCmd.CombinedOutput(); err != nil {
			log.Warnf("Failed to add repo %s: %v\nOutput: %s", repoName, err, string(output))
		}
	}

	// Update all repositories
	updateCmd := exec.CommandContext(ctx, "helm", "repo", "update")
	if output, err := updateCmd.CombinedOutput(); err != nil {
		log.Warnf("Failed to update repos: %v\nOutput: %s", err, string(output))
	}

	return nil
}

// generateRepoName generates a safe repository name from a URL
// Extracts domain and replaces dots with dashes
func (h *HelmService) generateRepoName(repoURL string) string {
	// Extract domain from URL
	re := regexp.MustCompile(`^https?://([^/]+)`)
	matches := re.FindStringSubmatch(repoURL)
	if len(matches) > 1 {
		// Use domain as repo name, replace dots with dashes
		return strings.ReplaceAll(matches[1], ".", "-")
	}
	// Fallback to hash if regex doesn't match
	return fmt.Sprintf("repo-%x", []byte(repoURL)[:8])
}

// renderTemplate renders a Helm chart to YAML using the Helm Go SDK
// Uses action.Install with DryRun=true for client-side rendering
// Supports custom values via valuesContent parameter
func (h *HelmService) renderTemplate(ctx context.Context, chartDir string, valuesContent *string) (string, error) {
	log.Infof("Rendering chart at %s", chartDir)

	// Create Helm action configuration
	actionConfig := new(action.Configuration)
	if err := actionConfig.Init(h.settings.RESTClientGetter(), h.settings.Namespace(), os.Getenv("HELM_DRIVER"), log.Debugf); err != nil {
		return "", fmt.Errorf("failed to initialize Helm action config: %w", err)
	}

	// Create install action (dry-run for templating)
	client := action.NewInstall(actionConfig)
	client.DryRun = true
	client.ReleaseName = "release-name"
	client.Replace = true
	client.ClientOnly = true
	client.IncludeCRDs = true
	client.Namespace = h.settings.Namespace()

	// Set Kubernetes version to latest stable to avoid kubeVersion compatibility issues
	// This allows charts requiring newer Kubernetes versions to render
	client.KubeVersion = &chartutil.KubeVersion{
		Version: "v1.29.0",
		Major:   "1",
		Minor:   "29",
	}

	// Load the chart
	chart, err := loader.Load(chartDir)
	if err != nil {
		return "", fmt.Errorf("failed to load chart: %w", err)
	}

	// Parse custom values if provided
	vals := map[string]interface{}{}
	if valuesContent != nil && *valuesContent != "" {
		if err := yaml.Unmarshal([]byte(*valuesContent), &vals); err != nil {
			return "", fmt.Errorf("failed to parse values content: %w", err)
		}
	}

	// Run the install (dry-run)
	rel, err := client.Run(chart, vals)
	if err != nil {
		return "", fmt.Errorf("failed to render chart: %w", err)
	}

	return rel.Manifest, nil
}

// compareRendered compares two rendered YAML manifests
// Returns the structured diff result, raw string output, and any error
// Uses the internal diff engine as the primary comparison mechanism
// If ignoreLabels is true, filters out metadata.labels and metadata.annotations changes
//
// DEPRECATED: The dyff and simple diff fallback paths are deprecated and will be removed in a future version.
// The internal diff engine is now the recommended and default comparison mechanism.
func (h *HelmService) compareRendered(ctx context.Context, rendered1, rendered2 string, ignoreLabels bool) (*diff.DiffResult, string, error) {
	log.Info("Comparing rendered templates")

	// Check if internal diff engine is enabled (default: true)
	if util.GetBoolEnv("INTERNAL_DIFF_ENABLED", true) {
		log.Info("Using internal diff engine")
		diffEngine := diff.NewEngine()
		diffEngine.IgnoreLabels = ignoreLabels
		diffEngine.IgnoreAnnotations = ignoreLabels

		result, err := diffEngine.Compare(rendered1, rendered2)
		if err == nil {
			log.Info("Internal diff engine comparison completed successfully")
			return result, result.Raw, nil
		}
		log.Warnf("Internal diff engine failed, falling back to dyff: %v", err)
	}

	// DEPRECATED: dyff fallback is deprecated and will be removed in a future version
	// TODO: Remove dyff support once internal diff engine is fully validated
	// Check if dyff is enabled (default: false since dyff is deprecated)
	if util.GetBoolEnv("DYFF_ENABLED", false) {
		// Try using dyff (DEPRECATED)
		diffRaw, err := h.dyffCompare(ctx, rendered1, rendered2, ignoreLabels)
		if err == nil {
			return nil, diffRaw, nil
		}
		log.Warnf("dyff comparison failed, falling back to simple diff: %v", err)
	}

	// DEPRECATED: simple diff fallback is deprecated
	// Fallback to simple line-by-line comparison
	return nil, h.simpleDiff(rendered1, rendered2), nil
}

// dyffCompare uses the dyff tool for enhanced YAML comparison
// Creates temporary files and runs dyff between command
// If ignoreLabels is true, filters out metadata.labels and metadata.annotations from the output
//
// DEPRECATED: This function is deprecated and will be removed in a future version.
// Use the internal diff engine (Engine.Compare) instead, which provides better performance,
// semantic understanding, and structured output without requiring external dependencies.
// TODO: Remove this function once all code paths use the internal engine exclusively.
func (h *HelmService) dyffCompare(ctx context.Context, rendered1, rendered2 string, ignoreLabels bool) (string, error) {
	// Check if dyff is available
	if _, err := exec.LookPath("dyff"); err != nil {
		return "", fmt.Errorf("dyff not found in PATH")
	}

	// Write rendered content to temporary files
	file1 := filepath.Join(h.tempDir, "rendered1.yaml")
	file2 := filepath.Join(h.tempDir, "rendered2.yaml")

	if err := os.WriteFile(file1, []byte(rendered1), 0644); err != nil {
		return "", fmt.Errorf("failed to write file1: %w", err)
	}
	defer os.Remove(file1)

	if err := os.WriteFile(file2, []byte(rendered2), 0644); err != nil {
		return "", fmt.Errorf("failed to write file2: %w", err)
	}
	defer os.Remove(file2)

	// Run dyff
	cmd := exec.CommandContext(ctx, "dyff", "between", "--omit-header", file1, file2)
	output, err := cmd.CombinedOutput()

	// Exit code 1 means differences found (expected), not an error
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == 1 {
			result := string(output)
			// Filter metadata changes if requested
			if ignoreLabels {
				result = h.filterMetadataChanges(result)
			}
			return result, nil
		}
		return "", fmt.Errorf("dyff command failed: %w\nOutput: %s", err, string(output))
	}

	result := string(output)
	// Filter metadata changes if requested
	if ignoreLabels {
		result = h.filterMetadataChanges(result)
	}
	return result, nil
}

// simpleDiff provides a basic line-by-line diff as fallback
// Shows both versions side-by-side with line counts
//
// DEPRECATED: This function is deprecated and will be removed in a future version.
// Use the internal diff engine instead for better structured output and semantic understanding.
// TODO: Remove this function once all code paths use the internal engine exclusively.
func (h *HelmService) simpleDiff(content1, content2 string) string {
	lines1 := strings.Split(content1, "\n")
	lines2 := strings.Split(content2, "\n")

	var diff strings.Builder
	diff.WriteString("=== Version 1 ===\n")
	diff.WriteString(content1)
	diff.WriteString("\n\n=== Version 2 ===\n")
	diff.WriteString(content2)
	diff.WriteString(fmt.Sprintf("\n\n=== Summary ===\nVersion 1: %d lines\nVersion 2: %d lines\n", len(lines1), len(lines2)))

	return diff.String()
}

// filterMetadataChanges filters out metadata.labels and metadata.annotations changes from dyff output
// Parses the dyff output line by line and removes sections related to metadata changes
// Handles both top-level and nested metadata paths (e.g., spec.template.metadata.labels)
//
// DEPRECATED: This function is only used with the deprecated dyff comparison path.
// TODO: Remove this function when dyff support is removed.
func (h *HelmService) filterMetadataChanges(diffOutput string) string {
	lines := strings.Split(diffOutput, "\n")
	var filteredLines []string
	skipSection := false

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Check if this is a path line that starts a new diff section
		if !strings.HasPrefix(line, " ") && !strings.HasPrefix(line, "\t") {
			// This could be a dyff path line
			if h.isMetadataPath(trimmed) {
				skipSection = true
				continue
			} else if h.isDyffPathLine(trimmed) {
				// New non-metadata path line, stop skipping
				skipSection = false
			}
		}

		// Skip lines in filtered sections
		if skipSection {
			// Continue skipping until we find a new section or empty line
			if trimmed == "" && i+1 < len(lines) {
				// Check if next line starts a new section
				nextTrimmed := strings.TrimSpace(lines[i+1])
				if h.isDyffPathLine(lines[i+1]) && nextTrimmed != "" {
					skipSection = false
				}
			}
			continue
		}

		filteredLines = append(filteredLines, line)
	}

	result := strings.Join(filteredLines, "\n")

	// Clean up excessive empty lines using pre-compiled regex
	result = excessiveNewlinesRegex.ReplaceAllString(result, "\n\n")

	return strings.TrimSpace(result)
}

// isMetadataPath checks if a path contains metadata.labels or metadata.annotations
// Handles both direct paths like "metadata.labels.app" and nested paths like "spec.template.metadata.labels.app"
//
// DEPRECATED: This function is only used with the deprecated dyff comparison path.
// TODO: Remove this function when dyff support is removed.
func (h *HelmService) isMetadataPath(path string) bool {
	return strings.Contains(path, "metadata.labels") || strings.Contains(path, "metadata.annotations")
}

// isDyffPathLine checks if a line is a dyff path line (not indented and not containing diff markers)
// Path lines in dyff output are not indented and don't start with diff marker characters
// This is more precise than checking if markers exist anywhere in the line
//
// DEPRECATED: This function is only used with the deprecated dyff comparison path.
// TODO: Remove this function when dyff support is removed.
func (h *HelmService) isDyffPathLine(line string) bool {
	if strings.HasPrefix(line, " ") || strings.HasPrefix(line, "\t") {
		return false
	}
	trimmed := strings.TrimSpace(line)
	if trimmed == "" {
		return false
	}
	// Path lines don't start with diff markers (±, +, -, or whitespace)
	// This is more reliable than checking for markers anywhere in the string
	firstChar := trimmed[0]
	return firstChar != '±' && firstChar != '+' && firstChar != '-' && firstChar != ' '
}

// convertToStructuredDiff converts the internal diff.DiffResult to models.StructuredDiffResult
func (h *HelmService) convertToStructuredDiff(diffResult *diff.DiffResult) *models.StructuredDiffResult {
	if diffResult == nil {
		return nil
	}

	result := &models.StructuredDiffResult{
		Metadata: models.DiffMetadata{
			EngineVersion:      diffResult.Metadata.EngineVersion,
			CompareID:          diffResult.Metadata.CompareID,
			GeneratedAt:        diffResult.Metadata.GeneratedAt,
			NormalizationRules: diffResult.Metadata.NormalizationRules,
			Inputs: models.InputMetadata{
				Left: models.SourceMetadata{
					Source:     diffResult.Metadata.Inputs.Left.Source,
					Chart:      diffResult.Metadata.Inputs.Left.Chart,
					Version:    diffResult.Metadata.Inputs.Left.Version,
					ValuesHash: diffResult.Metadata.Inputs.Left.ValuesHash,
				},
				Right: models.SourceMetadata{
					Source:     diffResult.Metadata.Inputs.Right.Source,
					Chart:      diffResult.Metadata.Inputs.Right.Chart,
					Version:    diffResult.Metadata.Inputs.Right.Version,
					ValuesHash: diffResult.Metadata.Inputs.Right.ValuesHash,
				},
			},
		},
		Resources: make([]models.ResourceDiff, 0, len(diffResult.Resources)),
	}

	// Convert stats if present
	if diffResult.Stats != nil {
		result.Stats = &models.DiffStats{
			Resources: models.DiffStatsResources{
				Added:    diffResult.Stats.Resources.Added,
				Removed:  diffResult.Stats.Resources.Removed,
				Modified: diffResult.Stats.Resources.Modified,
			},
			Changes: models.DiffStatsChanges{
				Total: diffResult.Stats.Changes.Total,
			},
		}
	}

	// Convert resources
	for _, r := range diffResult.Resources {
		resource := models.ResourceDiff{
			Identity: models.ResourceIdentity{
				APIVersion: r.Identity.APIVersion,
				Kind:       r.Identity.Kind,
				Name:       r.Identity.Name,
				Namespace:  r.Identity.Namespace,
				UID:        r.Identity.UID,
			},
			ChangeType: string(r.ChangeType),
			BeforeHash: r.BeforeHash,
			AfterHash:  r.AfterHash,
			Changes:    make([]models.Change, 0, len(r.Changes)),
		}

		// Convert summary if present
		if r.Summary != nil {
			resource.Summary = &models.ResourceSummary{
				TotalChanges: r.Summary.TotalChanges,
				ByImportance: r.Summary.ByImportance,
				Categories:   r.Summary.Categories,
			}
		}

		// Convert changes
		for _, c := range r.Changes {
			// Convert PathTokens to []interface{} for API response
			// Note: This conversion creates a new slice for each change. For large diffs,
			// consider optimizing by having the API models use []PathToken directly.
			// The conversion is done here to maintain type flexibility in the API layer.
			pathTokens := make([]interface{}, len(c.PathTokens))
			for i, token := range c.PathTokens {
				pathTokens[i] = token
			}

			change := models.Change{
				Op:             string(c.Op),
				Path:           c.Path,
				PathTokens:     pathTokens,
				Before:         c.Before,
				After:          c.After,
				ValueType:      c.ValueType,
				SemanticType:   c.SemanticType,
				ChangeCategory: c.ChangeCategory,
				Importance:     c.Importance,
				Flags:          c.Flags,
			}
			resource.Changes = append(resource.Changes, change)
		}

		result.Resources = append(result.Resources, resource)
	}

	return result
}

// suggestChartPath searches for Chart.yaml files and suggests valid chart paths
// Helpful when user provides incorrect chart path
func (h *HelmService) suggestChartPath(repoDir string) string {
	var suggestions []string

	filepath.Walk(repoDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		if info.Name() == "Chart.yaml" {
			relPath, _ := filepath.Rel(repoDir, filepath.Dir(path))
			suggestions = append(suggestions, "  - "+relPath)
		}
		return nil
	})

	if len(suggestions) == 0 {
		return "  No charts found in repository"
	}
	return strings.Join(suggestions, "\n")
}

// copyDir recursively copies a directory and all its contents
func (h *HelmService) copyDir(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		targetPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			return os.MkdirAll(targetPath, info.Mode())
		}

		return h.copyFile(path, targetPath)
	})
}

// copyFile copies a single file from source to destination
func (h *HelmService) copyFile(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, data, 0644)
}

// cleanup removes the work directory and all its contents
func (h *HelmService) cleanup(workDir string) {
	if err := os.RemoveAll(workDir); err != nil {
		log.Warnf("Failed to cleanup work directory %s: %v", workDir, err)
	}
}

// getTimeout retrieves a timeout value from environment or returns default
func (h *HelmService) getTimeout(envKey string, defaultSeconds int) int {
	if val := os.Getenv(envKey); val != "" {
		var timeout int
		if _, err := fmt.Sscanf(val, "%d", &timeout); err == nil {
			return timeout
		}
	}
	return defaultSeconds
}

// FetchVersions fetches available tags and branches from a Git repository
// This is a standalone function used by the versions API endpoint
func FetchVersions(ctx context.Context, repoURL string) (*models.VersionsResponse, error) {
	log.Infof("Fetching versions from repository: %s", repoURL)

	// Create temporary directory
	tempDir := os.Getenv("TEMP_DIR")
	if tempDir == "" {
		tempDir = "/tmp/chartimpact"
	}

	workDir, err := os.MkdirTemp(tempDir, "versions-*")
	if err != nil {
		return &models.VersionsResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to create temp directory: %v", err),
		}, nil
	}
	defer os.RemoveAll(workDir)

	// Clone repository (shallow)
	cloneCmd := exec.CommandContext(ctx, "git", "clone", "--depth=50", repoURL, workDir)
	cloneCmd.Env = append(os.Environ(),
		"GIT_TERMINAL=dumb",
		"GIT_ASKPASS=echo",
		"GIT_SSH_COMMAND=ssh -o StrictHostKeyChecking=no",
	)

	if output, err := cloneCmd.CombinedOutput(); err != nil {
		return &models.VersionsResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to clone repository: %v\nOutput: %s", err, string(output)),
		}, nil
	}

	// Fetch tags
	fetchCmd := exec.CommandContext(ctx, "git", "-C", workDir, "fetch", "--tags", "--depth=100")
	if output, err := fetchCmd.CombinedOutput(); err != nil {
		log.Warnf("Failed to fetch tags: %v\nOutput: %s", err, string(output))
	}

	// List tags
	tagsCmd := exec.CommandContext(ctx, "git", "-C", workDir, "tag", "--sort=-creatordate")
	tagsOutput, err := tagsCmd.CombinedOutput()
	var tags []string
	if err == nil {
		tagLines := strings.Split(strings.TrimSpace(string(tagsOutput)), "\n")
		for i, tag := range tagLines {
			if i >= 50 || tag == "" {
				break
			}
			tags = append(tags, tag)
		}
	}

	// List branches
	branchesCmd := exec.CommandContext(ctx, "git", "-C", workDir, "branch", "-r", "--sort=-committerdate")
	branchesOutput, err := branchesCmd.CombinedOutput()
	var branches []string
	if err == nil {
		branchLines := strings.Split(strings.TrimSpace(string(branchesOutput)), "\n")
		for i, branch := range branchLines {
			if i >= 20 {
				break
			}
			// Clean up branch name (remove "origin/" prefix and skip HEAD)
			branch = strings.TrimSpace(branch)
			if strings.Contains(branch, "HEAD") {
				continue
			}
			branch = strings.TrimPrefix(branch, "origin/")
			if branch != "" {
				branches = append(branches, branch)
			}
		}
	}

	return &models.VersionsResponse{
		Success:  true,
		Tags:     tags,
		Branches: branches,
	}, nil
}
