package signals

import (
	"fmt"
	"strings"
	"time"

	"github.com/dcotelo/chartimpact/backend/internal/diff"
)

const (
	// DetectorVersion is the version of the signal detection engine
	DetectorVersion = "1.0.0"
	// SchemaVersion is the version of the signal schema
	SchemaVersion = "1.0.0"
)

// Detector analyzes diff results and generates mission-aligned signals
type Detector struct {
	// Configuration options can be added here in the future
}

// NewDetector creates a new signal detector
func NewDetector() *Detector {
	return &Detector{}
}

// DetectSignals analyzes a diff result and generates signals
func (d *Detector) DetectSignals(diffResult *diff.DiffResult) (*SignalResult, error) {
	if diffResult == nil {
		return nil, fmt.Errorf("diffResult cannot be nil")
	}

	signals := make([]Signal, 0)

	// Process each resource diff
	for _, resourceDiff := range diffResult.Resources {
		resourceSignals := d.analyzeResource(resourceDiff)
		signals = append(signals, resourceSignals...)
	}

	// Build metadata
	metadata := SignalMetadata{
		SchemaVersion: SchemaVersion,
		GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
		CompareID:     diffResult.Metadata.CompareID,
		Inputs: SignalInputs{
			Left: SourceMetadata{
				Source:     diffResult.Metadata.Inputs.Left.Source,
				Chart:      diffResult.Metadata.Inputs.Left.Chart,
				Version:    diffResult.Metadata.Inputs.Left.Version,
				ValuesHash: diffResult.Metadata.Inputs.Left.ValuesHash,
			},
			Right: SourceMetadata{
				Source:     diffResult.Metadata.Inputs.Right.Source,
				Chart:      diffResult.Metadata.Inputs.Right.Chart,
				Version:    diffResult.Metadata.Inputs.Right.Version,
				ValuesHash: diffResult.Metadata.Inputs.Right.ValuesHash,
			},
		},
	}

	// Build summary
	summary := d.buildSummary(signals)

	return &SignalResult{
		Metadata: metadata,
		Signals:  signals,
		Summary:  summary,
	}, nil
}

// analyzeResource examines a single resource and generates signals for its changes
func (d *Detector) analyzeResource(resourceDiff diff.ResourceDiff) []Signal {
	signals := make([]Signal, 0)

	// Handle added/removed resources
	// NOTE: Resource-level signals (for entire resources being added/removed) are not yet implemented.
	// This is a known limitation documented in SIGNAL_TAXONOMY.md.
	// Future enhancement: Add signals like "availability.resource.added" for new Deployments,
	// "security.resource.removed" for deleted NetworkPolicies, etc.
	if resourceDiff.ChangeType == diff.ChangeTypeAdded || resourceDiff.ChangeType == diff.ChangeTypeRemoved {
		return signals
	}

	// Analyze each change in the resource
	for _, change := range resourceDiff.Changes {
		signal := d.analyzeChange(resourceDiff, change)
		if signal != nil {
			signals = append(signals, *signal)
		}
	}

	return signals
}

// analyzeChange examines a single change and generates a signal if applicable
func (d *Detector) analyzeChange(resourceDiff diff.ResourceDiff, change diff.Change) *Signal {
	path := change.Path

	// Detect availability signals
	if sig := d.detectProbeSignal(resourceDiff, change); sig != nil {
		return sig
	}
	if sig := d.detectReplicaSignal(resourceDiff, change); sig != nil {
		return sig
	}
	if sig := d.detectRolloutSignal(resourceDiff, change); sig != nil {
		return sig
	}
	if sig := d.detectResourceLimitSignal(resourceDiff, change); sig != nil {
		return sig
	}
	if sig := d.detectPDBSignal(resourceDiff, change); sig != nil {
		return sig
	}

	// Detect security signals
	if sig := d.detectSecurityContextSignal(resourceDiff, change); sig != nil {
		return sig
	}
	if sig := d.detectServiceAccountSignal(resourceDiff, change); sig != nil {
		return sig
	}
	if sig := d.detectRBACSignal(resourceDiff, change); sig != nil {
		return sig
	}
	if sig := d.detectServiceExposureSignal(resourceDiff, change); sig != nil {
		return sig
	}
	if sig := d.detectNetworkPolicySignal(resourceDiff, change); sig != nil {
		return sig
	}
	if sig := d.detectSecretReferenceSignal(resourceDiff, change); sig != nil {
		return sig
	}
	if sig := d.detectHostAccessSignal(resourceDiff, change); sig != nil {
		return sig
	}

	// Detect other notable signals
	if sig := d.detectImageChangeSignal(resourceDiff, change); sig != nil {
		return sig
	}

	// Skip low-importance changes (labels, annotations) unless they have high importance flags
	if strings.Contains(path, "metadata.labels") || strings.Contains(path, "metadata.annotations") {
		return nil
	}

	return nil
}

// Helper function to check if resource is a workload type
func isWorkloadResource(kind string) bool {
	workloadKinds := []string{"Deployment", "StatefulSet", "DaemonSet", "Job", "CronJob", "ReplicaSet"}
	for _, wk := range workloadKinds {
		if kind == wk {
			return true
		}
	}
	return false
}

// Helper function to determine change type from operation
func operationToChangeType(op diff.OpType) SignalChangeType {
	switch op {
	case diff.OpAdd:
		return ChangeTypeAdded
	case diff.OpRemove:
		return ChangeTypeRemoved
	case diff.OpReplace:
		return ChangeTypeModified
	default:
		return ChangeTypeModified
	}
}

// Helper function to create resource identity
func createResourceIdentity(resourceDiff diff.ResourceDiff) ResourceIdentity {
	return ResourceIdentity{
		Kind:       resourceDiff.Identity.Kind,
		Name:       resourceDiff.Identity.Name,
		Namespace:  resourceDiff.Identity.Namespace,
		APIVersion: resourceDiff.Identity.APIVersion,
	}
}

// buildSummary generates aggregate statistics for the signals
func (d *Detector) buildSummary(signals []Signal) SignalSummary {
	summary := SignalSummary{
		Total:        len(signals),
		ByCategory:   make(map[SignalCategory]int),
		ByImportance: make(map[SignalImportance]int),
		TopSignals:   make([]Signal, 0),
	}

	// Count by category and importance
	for _, sig := range signals {
		summary.ByCategory[sig.Category]++
		summary.ByImportance[sig.Importance]++
	}

	// Select top 5 high-importance signals
	highSignals := make([]Signal, 0)
	for _, sig := range signals {
		if sig.Importance == ImportanceHigh {
			highSignals = append(highSignals, sig)
		}
	}

	// If we have fewer than 5 high signals, add medium importance signals
	if len(highSignals) < 5 {
		for _, sig := range signals {
			if sig.Importance == ImportanceMedium && len(highSignals) < 5 {
				highSignals = append(highSignals, sig)
			}
		}
	}

	// Take up to 5 signals
	if len(highSignals) > 5 {
		summary.TopSignals = highSignals[:5]
	} else {
		summary.TopSignals = highSignals
	}

	return summary
}
