package signals

import "github.com/dcotelo/chartimpact/backend/internal/diff"

// SignalCategory represents the high-level category of a signal
type SignalCategory string

const (
	CategoryAvailability SignalCategory = "availability"
	CategorySecurity     SignalCategory = "security"
	CategoryOther        SignalCategory = "other"
)

// SignalImportance represents the importance level of a signal
type SignalImportance string

const (
	ImportanceHigh   SignalImportance = "high"
	ImportanceMedium SignalImportance = "medium"
	ImportanceLow    SignalImportance = "low"
)

// SignalChangeType represents the type of change
type SignalChangeType string

const (
	ChangeTypeAdded    SignalChangeType = "added"
	ChangeTypeRemoved  SignalChangeType = "removed"
	ChangeTypeModified SignalChangeType = "modified"
)

// Signal represents a mission-aligned impact signal
type Signal struct {
	// Signal identification
	Type       string           `json:"type"`       // e.g., "availability.probe.readiness"
	Category   SignalCategory   `json:"category"`   // availability | security | other
	Importance SignalImportance `json:"importance"` // high | medium | low

	// Resource identification
	Resource ResourceIdentity `json:"resource"`

	// Change description
	ChangeType  SignalChangeType `json:"changeType"`  // added | removed | modified
	Description string           `json:"description"` // One-line summary
	Explanation string           `json:"explanation"` // Why this matters (2-3 sentences)

	// Technical details
	AffectedPath string      `json:"affectedPath"`     // JSON path to changed field
	Before       interface{} `json:"before,omitempty"` // Previous value (if modified/removed)
	After        interface{} `json:"after,omitempty"`  // New value (if modified/added)

	// Raw change references
	RawChanges []diff.Change `json:"rawChanges"` // Reference to underlying diff engine changes

	// Metadata
	DetectedAt      string `json:"detectedAt,omitempty"`      // ISO 8601 timestamp
	DetectorVersion string `json:"detectorVersion,omitempty"` // Signal engine version
}

// ResourceIdentity uniquely identifies a Kubernetes resource
type ResourceIdentity struct {
	Kind       string `json:"kind"`
	Name       string `json:"name"`
	Namespace  string `json:"namespace"`
	APIVersion string `json:"apiVersion"`
}

// SignalResult represents a collection of detected signals
type SignalResult struct {
	Metadata SignalMetadata `json:"metadata"`
	Signals  []Signal       `json:"signals"`
	Summary  SignalSummary  `json:"summary"`
}

// SignalMetadata provides traceability for signal detection
type SignalMetadata struct {
	SchemaVersion string       `json:"schemaVersion"` // e.g., "1.0.0"
	GeneratedAt   string       `json:"generatedAt"`   // ISO 8601
	CompareID     string       `json:"compareId"`     // UUID linking to diff result
	Inputs        SignalInputs `json:"inputs"`
}

// SignalInputs describes the sources being compared
type SignalInputs struct {
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

// SignalSummary provides aggregate statistics about detected signals
type SignalSummary struct {
	Total        int                        `json:"total"`
	ByCategory   map[SignalCategory]int     `json:"byCategory"`
	ByImportance map[SignalImportance]int   `json:"byImportance"`
	TopSignals   []Signal                   `json:"topSignals"` // Most important signals (max 5)
}
