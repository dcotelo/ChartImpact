package diff

// DiffResult represents the structured output of a diff operation (v1 spec)
type DiffResult struct {
	Metadata  DiffMetadata   `json:"metadata"`
	Resources []ResourceDiff `json:"resources"`
	Stats     *Stats         `json:"stats,omitempty"`
	Raw       string         `json:"raw,omitempty"` // For backward compatibility

	// Legacy fields for backward compatibility
	Summary Summary `json:"summary,omitempty"`
}

// DiffMetadata provides traceability and context for the diff
type DiffMetadata struct {
	EngineVersion      string              `json:"engineVersion"`
	CompareID          string              `json:"compareId"`
	GeneratedAt        string              `json:"generatedAt"` // RFC3339 timestamp
	Inputs             InputMetadata       `json:"inputs"`
	NormalizationRules []string            `json:"normalizationRules,omitempty"`
}

// InputMetadata describes the sources being compared
type InputMetadata struct {
	Left  SourceMetadata `json:"left"`
	Right SourceMetadata `json:"right"`
}

// SourceMetadata describes a single input source
type SourceMetadata struct {
	Source     string `json:"source"`     // e.g., "helm", "kustomize"
	Chart      string `json:"chart,omitempty"`
	Version    string `json:"version,omitempty"`
	ValuesHash string `json:"valuesHash,omitempty"`
}

// Stats provides aggregate statistics about the diff
type Stats struct {
	Resources StatsResources `json:"resources"`
	Changes   StatsChanges   `json:"changes"`
}

// StatsResources provides resource-level statistics
type StatsResources struct {
	Added    int `json:"added"`
	Removed  int `json:"removed"`
	Modified int `json:"modified"`
}

// StatsChanges provides change-level statistics
type StatsChanges struct {
	Total int `json:"total"`
}

// Summary provides high-level statistics about the diff (legacy)
type Summary struct {
	Added    int `json:"added"`
	Removed  int `json:"removed"`
	Modified int `json:"modified"`
	Total    int `json:"total"`
}

// ResourceDiff represents the diff for a single Kubernetes resource
type ResourceDiff struct {
	Identity   ResourceIdentity `json:"identity"`
	ChangeType ChangeType       `json:"changeType"`
	BeforeHash string           `json:"beforeHash,omitempty"`
	AfterHash  string           `json:"afterHash,omitempty"`
	Changes    []Change         `json:"changes,omitempty"`
	Summary    *ResourceSummary `json:"summary,omitempty"`

	// Legacy fields for backward compatibility
	APIVersion string      `json:"apiVersion,omitempty"`
	Kind       string      `json:"kind,omitempty"`
	Name       string      `json:"name,omitempty"`
	Namespace  string      `json:"namespace,omitempty"`
	Fields     []FieldDiff `json:"fields,omitempty"`
}

// ResourceIdentity uniquely identifies a Kubernetes resource
type ResourceIdentity struct {
	APIVersion string  `json:"apiVersion"`
	Kind       string  `json:"kind"`
	Name       string  `json:"name"`
	Namespace  string  `json:"namespace"`
	UID        *string `json:"uid"` // Optional, usually unavailable in Helm renders
}

// ResourceSummary provides a derived summary of changes for a resource
type ResourceSummary struct {
	TotalChanges  int                  `json:"totalChanges"`
	ByImportance  map[string]int       `json:"byImportance,omitempty"`
	Categories    []string             `json:"categories,omitempty"`
}

// ChangeType represents the type of change
type ChangeType string

const (
	ChangeTypeAdded     ChangeType = "added"
	ChangeTypeRemoved   ChangeType = "removed"
	ChangeTypeModified  ChangeType = "modified"
	ChangeTypeUnchanged ChangeType = "unchanged"
)

// Change represents a field-level change with full context
type Change struct {
	Op             OpType      `json:"op"`
	Path           string      `json:"path"`
	PathTokens     []PathToken `json:"pathTokens"`
	Before         interface{} `json:"before,omitempty"`
	After          interface{} `json:"after,omitempty"`
	ValueType      string      `json:"valueType"`
	SemanticType   string      `json:"semanticType,omitempty"`
	ChangeCategory string      `json:"changeCategory,omitempty"`
	Importance     string      `json:"importance,omitempty"`
	Flags          []string    `json:"flags,omitempty"`
	ArrayDiff      *ArrayDiff  `json:"arrayDiff,omitempty"`
}

// OpType represents JSON Patch-style operation types
type OpType string

const (
	OpAdd     OpType = "add"
	OpRemove  OpType = "remove"
	OpReplace OpType = "replace"
)

// PathToken represents a typed component of a path
type PathToken interface{}

// ArrayDiff provides detailed array comparison information
type ArrayDiff struct {
	Strategy string        `json:"strategy"` // "indexed" or "keyed"
	Key      string        `json:"key,omitempty"`
	Added    []interface{} `json:"added,omitempty"`
	Removed  []interface{} `json:"removed,omitempty"`
	Modified []interface{} `json:"modified,omitempty"`
}

// FieldDiff represents a change in a specific field (legacy)
type FieldDiff struct {
	Path     string      `json:"path"`
	OldValue interface{} `json:"oldValue,omitempty"`
	NewValue interface{} `json:"newValue,omitempty"`
	Type     ChangeType  `json:"type"`
}

// Resource represents a normalized Kubernetes resource
type Resource struct {
	APIVersion string                 `json:"apiVersion"`
	Kind       string                 `json:"kind"`
	Metadata   Metadata               `json:"metadata"`
	Spec       map[string]interface{} `json:"spec,omitempty"`
	Data       map[string]interface{} `json:"data,omitempty"`
	Other      map[string]interface{} `json:"-"` // Other fields
}

// Metadata represents Kubernetes resource metadata
type Metadata struct {
	Name        string                 `json:"name"`
	Namespace   string                 `json:"namespace,omitempty"`
	Labels      map[string]string      `json:"labels,omitempty"`
	Annotations map[string]string      `json:"annotations,omitempty"`
	Other       map[string]interface{} `json:"-"` // Other metadata fields
}

// ResourceKey uniquely identifies a Kubernetes resource
type ResourceKey struct {
	APIVersion string
	Kind       string
	Name       string
	Namespace  string
}
