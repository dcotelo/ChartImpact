package signals

import (
	"fmt"
	"strings"

	"github.com/dcotelo/chartimpact/backend/internal/diff"
)

// detectProbeSignal detects changes to health probes (readiness, liveness, startup)
func (d *Detector) detectProbeSignal(resourceDiff diff.ResourceDiff, change diff.Change) *Signal {
	if !isWorkloadResource(resourceDiff.Identity.Kind) {
		return nil
	}

	path := change.Path
	var probeType string
	var signalType string

	if strings.Contains(path, ".readinessProbe") {
		probeType = "readiness"
		signalType = "availability.probe.readiness"
	} else if strings.Contains(path, ".livenessProbe") {
		probeType = "liveness"
		signalType = "availability.probe.liveness"
	} else if strings.Contains(path, ".startupProbe") {
		probeType = "startup"
		signalType = "availability.probe.startup"
	} else {
		return nil
	}

	// Extract container name from path if possible
	containerName := extractContainerName(path)
	containerDesc := ""
	if containerName != "" {
		containerDesc = fmt.Sprintf(" in container '%s'", containerName)
	}

	var description string
	var explanation string

	switch change.Op {
	case diff.OpRemove:
		description = fmt.Sprintf("%s probe removed%s", capitalize(probeType), containerDesc)
		explanation = d.getProbeRemovedExplanation(probeType)
	case diff.OpAdd:
		description = fmt.Sprintf("%s probe added%s", capitalize(probeType), containerDesc)
		explanation = d.getProbeAddedExplanation(probeType)
	case diff.OpReplace:
		description = fmt.Sprintf("%s probe modified%s", capitalize(probeType), containerDesc)
		explanation = d.getProbeModifiedExplanation(probeType)
	}

	return &Signal{
		Type:         signalType,
		Category:     CategoryAvailability,
		Importance:   ImportanceHigh,
		Resource:     createResourceIdentity(resourceDiff),
		ChangeType:   operationToChangeType(change.Op),
		Description:  description,
		Explanation:  explanation,
		AffectedPath: path,
		Before:       change.Before,
		After:        change.After,
		RawChanges:   []diff.Change{change},
		DetectedAt:   "",
		DetectorVersion: DetectorVersion,
	}
}

// detectReplicaSignal detects changes to replica counts
func (d *Detector) detectReplicaSignal(resourceDiff diff.ResourceDiff, change diff.Change) *Signal {
	if !strings.HasSuffix(change.Path, ".replicas") {
		return nil
	}

	kind := resourceDiff.Identity.Kind
	if kind != "Deployment" && kind != "StatefulSet" && kind != "ReplicaSet" {
		return nil
	}

	var description string
	var explanation string

	if change.Op == diff.OpReplace {
		description = fmt.Sprintf("Replica count changed from %v to %v", change.Before, change.After)
		
		// Determine if scaling up or down
		beforeInt, beforeOk := toInt(change.Before)
		afterInt, afterOk := toInt(change.After)
		
		if beforeOk && afterOk {
			if afterInt < beforeInt {
				explanation = fmt.Sprintf("Reducing replicas from %d to %d decreases redundancy. With only %d replica(s), the service has limited failover capacity during pod restarts or node failures.", beforeInt, afterInt, afterInt)
			} else {
				explanation = fmt.Sprintf("Increasing replicas from %d to %d improves availability and capacity. More replicas provide better redundancy and load distribution.", beforeInt, afterInt)
			}
		} else {
			explanation = "Replica count changes affect service availability and resource usage. Ensure the new count aligns with capacity and redundancy requirements."
		}
	} else {
		description = fmt.Sprintf("Replica count %s", change.Op)
		explanation = "Changes to replica count affect availability and capacity."
	}

	return &Signal{
		Type:            "availability.replicas",
		Category:        CategoryAvailability,
		Importance:      ImportanceHigh,
		Resource:        createResourceIdentity(resourceDiff),
		ChangeType:      operationToChangeType(change.Op),
		Description:     description,
		Explanation:     explanation,
		AffectedPath:    change.Path,
		Before:          change.Before,
		After:           change.After,
		RawChanges:      []diff.Change{change},
		DetectorVersion: DetectorVersion,
	}
}

// detectRolloutSignal detects changes to rollout strategy
func (d *Detector) detectRolloutSignal(resourceDiff diff.ResourceDiff, change diff.Change) *Signal {
	if resourceDiff.Identity.Kind != "Deployment" {
		return nil
	}

	path := change.Path
	var signalType string
	var description string
	var explanation string

	if strings.Contains(path, ".strategy.type") {
		signalType = "availability.rollout.strategy"
		description = fmt.Sprintf("Rollout strategy changed from %v to %v", change.Before, change.After)
		
		if fmt.Sprintf("%v", change.After) == "Recreate" {
			explanation = "Recreate strategy terminates all existing pods before creating new ones, causing service downtime during deployments. Consider if this downtime is acceptable for your use case."
		} else {
			explanation = "RollingUpdate strategy updates pods gradually, maintaining service availability during deployments. This is the recommended strategy for most workloads."
		}
	} else if strings.Contains(path, ".maxSurge") {
		signalType = "availability.rollout.maxSurge"
		description = fmt.Sprintf("Maximum surge changed from %v to %v", change.Before, change.After)
		explanation = "MaxSurge controls how many extra pods can be created during a rolling update. Higher values speed up deployments but use more resources temporarily."
	} else if strings.Contains(path, ".maxUnavailable") {
		signalType = "availability.rollout.maxUnavailable"
		description = fmt.Sprintf("Maximum unavailable changed from %v to %v", change.Before, change.After)
		explanation = "MaxUnavailable controls how many pods can be unavailable during a rolling update. Higher values speed up deployments but may reduce availability during the update."
	} else {
		return nil
	}

	return &Signal{
		Type:            signalType,
		Category:        CategoryAvailability,
		Importance:      ImportanceHigh,
		Resource:        createResourceIdentity(resourceDiff),
		ChangeType:      operationToChangeType(change.Op),
		Description:     description,
		Explanation:     explanation,
		AffectedPath:    path,
		Before:          change.Before,
		After:           change.After,
		RawChanges:      []diff.Change{change},
		DetectorVersion: DetectorVersion,
	}
}

// detectResourceLimitSignal detects changes to resource limits and requests
func (d *Detector) detectResourceLimitSignal(resourceDiff diff.ResourceDiff, change diff.Change) *Signal {
	if !isWorkloadResource(resourceDiff.Identity.Kind) {
		return nil
	}

	path := change.Path
	if !strings.Contains(path, ".resources.limits") && !strings.Contains(path, ".resources.requests") {
		return nil
	}

	var signalType string
	var description string
	var explanation string
	var resourceType string

	if strings.Contains(path, ".cpu") {
		resourceType = "CPU"
	} else if strings.Contains(path, ".memory") {
		resourceType = "Memory"
	} else {
		resourceType = "Resource"
	}

	containerName := extractContainerName(path)
	containerDesc := ""
	if containerName != "" {
		containerDesc = fmt.Sprintf(" for container '%s'", containerName)
	}

	if strings.Contains(path, ".limits") {
		signalType = "availability.resources.limits"
		description = fmt.Sprintf("%s limit changed from %v to %v%s", resourceType, change.Before, change.After, containerDesc)
		explanation = fmt.Sprintf("Reducing %s limits increases the risk of throttling (CPU) or OOMKilled events (memory) if the application's actual usage exceeds the new limit. Monitor resource usage after deployment.", strings.ToLower(resourceType))
	} else {
		signalType = "availability.resources.requests"
		description = fmt.Sprintf("%s request changed from %v to %v%s", resourceType, change.Before, change.After, containerDesc)
		explanation = "Request changes affect pod scheduling and node placement. Higher requests may prevent pods from scheduling on nodes with insufficient resources."
	}

	return &Signal{
		Type:            signalType,
		Category:        CategoryAvailability,
		Importance:      ImportanceMedium,
		Resource:        createResourceIdentity(resourceDiff),
		ChangeType:      operationToChangeType(change.Op),
		Description:     description,
		Explanation:     explanation,
		AffectedPath:    path,
		Before:          change.Before,
		After:           change.After,
		RawChanges:      []diff.Change{change},
		DetectorVersion: DetectorVersion,
	}
}

// detectPDBSignal detects changes to PodDisruptionBudgets
func (d *Detector) detectPDBSignal(resourceDiff diff.ResourceDiff, change diff.Change) *Signal {
	if resourceDiff.Identity.Kind != "PodDisruptionBudget" {
		return nil
	}

	path := change.Path
	var signalType string
	var description string
	var explanation string

	if strings.Contains(path, ".minAvailable") {
		signalType = "availability.pdb.minAvailable"
		description = fmt.Sprintf("Minimum available changed from %v to %v", change.Before, change.After)
		explanation = "Lowering minAvailable allows more pods to be disrupted simultaneously. This may speed up cluster maintenance but could affect service availability."
	} else if strings.Contains(path, ".maxUnavailable") {
		signalType = "availability.pdb.maxUnavailable"
		description = fmt.Sprintf("Maximum unavailable changed from %v to %v", change.Before, change.After)
		explanation = "Increasing maxUnavailable allows more pods to be disrupted simultaneously during voluntary disruptions like node drains. Balance between maintenance speed and availability."
	} else {
		return nil
	}

	return &Signal{
		Type:            signalType,
		Category:        CategoryAvailability,
		Importance:      ImportanceHigh,
		Resource:        createResourceIdentity(resourceDiff),
		ChangeType:      operationToChangeType(change.Op),
		Description:     description,
		Explanation:     explanation,
		AffectedPath:    path,
		Before:          change.Before,
		After:           change.After,
		RawChanges:      []diff.Change{change},
		DetectorVersion: DetectorVersion,
	}
}

// Helper functions

func (d *Detector) getProbeRemovedExplanation(probeType string) string {
	switch probeType {
	case "readiness":
		return "Without a readiness probe, pods will receive traffic immediately on startup, potentially before the application is ready to handle requests. This can cause connection errors during deployments."
	case "liveness":
		return "Without a liveness probe, Kubernetes cannot detect and restart unhealthy pods automatically. Failed pods may continue running without serving traffic properly."
	case "startup":
		return "Without a startup probe, slow-starting applications may be killed by liveness probes before they finish starting. Startup probes give applications more time to initialize."
	default:
		return "Removing health probes reduces Kubernetes' ability to manage application lifecycle and traffic routing."
	}
}

func (d *Detector) getProbeAddedExplanation(probeType string) string {
	switch probeType {
	case "readiness":
		return "Adding a readiness probe enables Kubernetes to control when pods receive traffic. Ensure the probe is configured correctly to avoid rolling update issues."
	case "liveness":
		return "Adding a liveness probe enables Kubernetes to automatically restart unhealthy pods. Ensure the probe doesn't trigger false positives which could cause unnecessary restarts."
	case "startup":
		return "Adding a startup probe gives slow-starting applications more time to initialize before liveness checks begin. This prevents premature restarts during startup."
	default:
		return "Adding health probes improves Kubernetes' ability to manage application lifecycle."
	}
}

func (d *Detector) getProbeModifiedExplanation(probeType string) string {
	switch probeType {
	case "readiness":
		return "Changes to readiness probe configuration affect when pods are considered ready to receive traffic. Verify the new settings are appropriate for your application's startup time."
	case "liveness":
		return "Changes to liveness probe configuration affect how Kubernetes detects unhealthy pods. Ensure the new settings balance responsiveness with tolerance for temporary issues."
	case "startup":
		return "Changes to startup probe configuration affect the grace period given to slow-starting applications. Ensure the new settings accommodate your application's initialization time."
	default:
		return "Changes to probe configuration affect how Kubernetes manages application health."
	}
}

func extractContainerName(path string) string {
	// Look for pattern: .containers[N]. or .initContainers[N].
	// Then try to extract name from the path
	// This is a simplified extraction - in practice, we'd need the actual container array
	if strings.Contains(path, ".containers") || strings.Contains(path, ".initContainers") {
		// Try to find [N] pattern and extract N
		// For now, return empty - this would need access to the actual resource structure
		return ""
	}
	return ""
}

func capitalize(s string) string {
	if len(s) == 0 {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

func toInt(v interface{}) (int, bool) {
	switch val := v.(type) {
	case int:
		return val, true
	case int32:
		return int(val), true
	case int64:
		return int(val), true
	case float64:
		return int(val), true
	default:
		return 0, false
	}
}
