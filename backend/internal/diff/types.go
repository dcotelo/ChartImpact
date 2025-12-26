package diff

// DiffResult represents the structured output of a diff operation
type DiffResult struct {
	Summary   Summary        `json:"summary"`
	Resources []ResourceDiff `json:"resources"`
	Raw       string         `json:"raw,omitempty"` // For backward compatibility
}

// Summary provides high-level statistics about the diff
type Summary struct {
	Added    int `json:"added"`
	Removed  int `json:"removed"`
	Modified int `json:"modified"`
	Total    int `json:"total"`
}

// ResourceDiff represents the diff for a single Kubernetes resource
type ResourceDiff struct {
	APIVersion string      `json:"apiVersion"`
	Kind       string      `json:"kind"`
	Name       string      `json:"name"`
	Namespace  string      `json:"namespace"`
	ChangeType ChangeType  `json:"changeType"`
	Fields     []FieldDiff `json:"fields,omitempty"`
}

// ChangeType represents the type of change
type ChangeType string

const (
	ChangeTypeAdded    ChangeType = "added"
	ChangeTypeRemoved  ChangeType = "removed"
	ChangeTypeModified ChangeType = "modified"
)

// FieldDiff represents a change in a specific field
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
