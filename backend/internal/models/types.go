package models

// CompareRequest represents a request to compare two Helm chart versions
type CompareRequest struct {
	Repository     string   `json:"repository"`               // Git repository URL (required)
	ChartPath      string   `json:"chartPath"`                // Path to chart within repository (required)
	Version1       string   `json:"version1"`                 // First version to compare (tag/branch/commit)
	Version2       string   `json:"version2"`                 // Second version to compare (tag/branch/commit)
	ValuesFile     *string  `json:"valuesFile,omitempty"`     // Optional: path to values file in repository
	ValuesContent  *string  `json:"valuesContent,omitempty"`  // Optional: inline values content
	IgnoreLabels   bool     `json:"ignoreLabels,omitempty"`   // Optional: ignore label changes in diff
	SecretHandling string   `json:"secretHandling,omitempty"` // Optional: suppress|show|decode
	ContextLines   *int     `json:"contextLines,omitempty"`   // Optional: number of context lines in diff
	SuppressKinds  []string `json:"suppressKinds,omitempty"`  // Optional: resource kinds to suppress
	SuppressRegex  *string  `json:"suppressRegex,omitempty"`  // Optional: regex pattern to suppress
}

// CompareResponse represents the response from a chart comparison
type CompareResponse struct {
	Success                 bool                  `json:"success"`                  // Whether the comparison succeeded
	Diff                    string                `json:"diff,omitempty"`           // The diff output (legacy, for backwards compatibility)
	Error                   string                `json:"error,omitempty"`          // Error message if failed
	Version1                string                `json:"version1,omitempty"`       // Resolved version 1
	Version2                string                `json:"version2,omitempty"`       // Resolved version 2
	Statistics              *ChangeStatistics     `json:"statistics,omitempty"`     // Optional: statistics about changes (legacy)
	StructuredDiff          *StructuredDiffResult `json:"structuredDiff,omitempty"` // v1 structured diff result
	StructuredDiffAvailable bool                  `json:"structuredDiffAvailable"`  // Indicates if structured diff is available
	Signals                 *SignalResult         `json:"signals,omitempty"`        // Mission-aligned impact signals
	SignalsAvailable        bool                  `json:"signalsAvailable"`         // Indicates if signals are available
}

// SignalResult represents mission-aligned impact signals (from signals package)
type SignalResult struct {
	Metadata SignalMetadata `json:"metadata"`
	Signals  []Signal       `json:"signals"`
	Summary  SignalSummary  `json:"summary"`
}

// SignalMetadata provides traceability for signal detection
type SignalMetadata struct {
	SchemaVersion string       `json:"schemaVersion"`
	GeneratedAt   string       `json:"generatedAt"`
	CompareID     string       `json:"compareId"`
	Inputs        SignalInputs `json:"inputs"`
}

// SignalInputs describes the sources being compared
type SignalInputs struct {
	Left  SignalSourceMetadata `json:"left"`
	Right SignalSourceMetadata `json:"right"`
}

// SignalSourceMetadata describes a single input source for signals
type SignalSourceMetadata struct {
	Source     string `json:"source"`
	Chart      string `json:"chart,omitempty"`
	Version    string `json:"version,omitempty"`
	ValuesHash string `json:"valuesHash,omitempty"`
}

// Signal represents a mission-aligned impact signal
type Signal struct {
	Type         string                 `json:"type"`
	Category     string                 `json:"category"`
	Importance   string                 `json:"importance"`
	Resource     SignalResourceIdentity `json:"resource"`
	ChangeType   string                 `json:"changeType"`
	Description  string                 `json:"description"`
	Explanation  string                 `json:"explanation"`
	AffectedPath string                 `json:"affectedPath"`
	Before       interface{}            `json:"before,omitempty"`
	After        interface{}            `json:"after,omitempty"`
	RawChanges   []Change               `json:"rawChanges"`
	DetectedAt   string                 `json:"detectedAt,omitempty"`
	DetectorVersion string              `json:"detectorVersion,omitempty"`
}

// SignalResourceIdentity uniquely identifies a resource for signals
type SignalResourceIdentity struct {
	Kind       string `json:"kind"`
	Name       string `json:"name"`
	Namespace  string `json:"namespace"`
	APIVersion string `json:"apiVersion"`
}

// SignalSummary provides aggregate statistics
type SignalSummary struct {
	Total        int            `json:"total"`
	ByCategory   map[string]int `json:"byCategory"`
	ByImportance map[string]int `json:"byImportance"`
	TopSignals   []Signal       `json:"topSignals"`
}

// ChangeStatistics provides detailed statistics about the changes between versions
type ChangeStatistics struct {
	Summary    ChangeSummary   `json:"summary"`    // Overall summary of changes
	ByKind     []ResourceStats `json:"byKind"`     // Statistics grouped by resource kind
	ByCategory []CategoryStats `json:"byCategory"` // Statistics grouped by category
	Lines      LineStats       `json:"lines"`      // Line-level statistics
	Impact     ChangeImpact    `json:"impact"`     // Impact analysis
}

// ChangeSummary provides high-level statistics about the comparison
type ChangeSummary struct {
	TotalResources     int `json:"totalResources"`     // Total number of resources
	ResourcesAdded     int `json:"resourcesAdded"`     // Number of resources added
	ResourcesRemoved   int `json:"resourcesRemoved"`   // Number of resources removed
	ResourcesModified  int `json:"resourcesModified"`  // Number of resources modified
	ResourcesUnchanged int `json:"resourcesUnchanged"` // Number of unchanged resources
	TotalChanges       int `json:"totalChanges"`       // Total number of changes
}

// ResourceStats provides statistics for a specific resource kind
type ResourceStats struct {
	Kind     string `json:"kind"`     // Kubernetes resource kind (e.g., Deployment)
	Count    int    `json:"count"`    // Total count of this kind
	Added    int    `json:"added"`    // Number added
	Removed  int    `json:"removed"`  // Number removed
	Modified int    `json:"modified"` // Number modified
}

// CategoryStats groups resources by category (e.g., Workloads, Services)
type CategoryStats struct {
	Category  string   `json:"category"`  // Category name
	Count     int      `json:"count"`     // Number of resources in category
	Resources []string `json:"resources"` // List of resource kinds in category
}

// LineStats provides line-level statistics from the diff
type LineStats struct {
	Added     int `json:"added"`     // Number of lines added
	Removed   int `json:"removed"`   // Number of lines removed
	Unchanged int `json:"unchanged"` // Number of unchanged lines
	Total     int `json:"total"`     // Total number of lines
}

// ChangeImpact analyzes the severity and nature of changes
type ChangeImpact struct {
	Level           string           `json:"level"`           // high|medium|low
	CriticalChanges []CriticalChange `json:"criticalChanges"` // List of critical changes
	BreakingChanges []BreakingChange `json:"breakingChanges"` // List of breaking changes
}

// CriticalChange represents a change that may have significant impact
type CriticalChange struct {
	Resource    string `json:"resource"`    // Resource name
	Kind        string `json:"kind"`        // Resource kind
	Field       string `json:"field"`       // Field that changed
	Description string `json:"description"` // Description of the change
}

// BreakingChange represents a potentially breaking change
type BreakingChange struct {
	Resource    string `json:"resource"`    // Resource name
	Kind        string `json:"kind"`        // Resource kind
	Field       string `json:"field"`       // Field that changed
	Description string `json:"description"` // Description of the change
	Severity    string `json:"severity"`    // high|medium|low
}

// StructuredDiffResult is an alias for the diff engine's DiffResult
// This is exposed in the API response for frontend consumption
type StructuredDiffResult struct {
	Metadata  DiffMetadata   `json:"metadata"`
	Resources []ResourceDiff `json:"resources"`
	Stats     *DiffStats     `json:"stats,omitempty"`
}

// DiffMetadata provides traceability and context
type DiffMetadata struct {
	EngineVersion      string        `json:"engineVersion"`
	CompareID          string        `json:"compareId"`
	GeneratedAt        string        `json:"generatedAt"`
	Inputs             InputMetadata `json:"inputs"`
	NormalizationRules []string      `json:"normalizationRules,omitempty"`
}

// InputMetadata describes the sources being compared
type InputMetadata struct {
	Left  SourceMetadata `json:"left"`
	Right SourceMetadata `json:"right"`
}

// SourceMetadata describes a single input source
type SourceMetadata struct {
	Source     string `json:"source"`
	Chart      string `json:"chart,omitempty"`
	Version    string `json:"version,omitempty"`
	ValuesHash string `json:"valuesHash,omitempty"`
}

// DiffStats provides aggregate statistics
type DiffStats struct {
	Resources DiffStatsResources `json:"resources"`
	Changes   DiffStatsChanges   `json:"changes"`
}

// DiffStatsResources provides resource-level statistics
type DiffStatsResources struct {
	Added    int `json:"added"`
	Removed  int `json:"removed"`
	Modified int `json:"modified"`
}

// DiffStatsChanges provides change-level statistics
type DiffStatsChanges struct {
	Total int `json:"total"`
}

// ResourceDiff represents a diff for a single resource
type ResourceDiff struct {
	Identity   ResourceIdentity `json:"identity"`
	ChangeType string           `json:"changeType"`
	BeforeHash string           `json:"beforeHash,omitempty"`
	AfterHash  string           `json:"afterHash,omitempty"`
	Changes    []Change         `json:"changes,omitempty"`
	Summary    *ResourceSummary `json:"summary,omitempty"`
}

// ResourceIdentity uniquely identifies a resource
type ResourceIdentity struct {
	APIVersion string  `json:"apiVersion"`
	Kind       string  `json:"kind"`
	Name       string  `json:"name"`
	Namespace  string  `json:"namespace"`
	UID        *string `json:"uid"`
}

// ResourceSummary provides a derived summary of changes
type ResourceSummary struct {
	TotalChanges int            `json:"totalChanges"`
	ByImportance map[string]int `json:"byImportance,omitempty"`
	Categories   []string       `json:"categories,omitempty"`
}

// Change represents a field-level change
type Change struct {
	Op             string        `json:"op"`
	Path           string        `json:"path"`
	PathTokens     []interface{} `json:"pathTokens"`
	Before         interface{}   `json:"before,omitempty"`
	After          interface{}   `json:"after,omitempty"`
	ValueType      string        `json:"valueType"`
	SemanticType   string        `json:"semanticType,omitempty"`
	ChangeCategory string        `json:"changeCategory,omitempty"`
	Importance     string        `json:"importance,omitempty"`
	Flags          []string      `json:"flags,omitempty"`
}

// VersionsRequest represents a request to fetch available versions from a repository
type VersionsRequest struct {
	Repository string `json:"repository"` // Git repository URL (required)
}

// VersionsResponse represents the response containing available versions
type VersionsResponse struct {
	Success  bool     `json:"success"`            // Whether the request succeeded
	Tags     []string `json:"tags,omitempty"`     // List of Git tags
	Branches []string `json:"branches,omitempty"` // List of Git branches
	Error    string   `json:"error,omitempty"`    // Error message if failed
}

// HealthResponse represents a health check response
type HealthResponse struct {
	Status  string `json:"status"`            // "ok" or "error"
	Version string `json:"version,omitempty"` // API version
	HelmOK  bool   `json:"helmOk"`            // Whether Helm is available
	GitOK   bool   `json:"gitOk"`             // Whether Git is available
	DyffOK  bool   `json:"dyffOk"`            // DEPRECATED: Whether dyff is available (dyff is deprecated in favor of internal engine)
}
