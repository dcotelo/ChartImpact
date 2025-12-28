package signals

import (
	"fmt"
	"strings"

	"github.com/dcotelo/chartimpact/backend/internal/diff"
)

// detectImageChangeSignal detects container image changes
func (d *Detector) detectImageChangeSignal(resourceDiff diff.ResourceDiff, change diff.Change) *Signal {
	if !isWorkloadResource(resourceDiff.Identity.Kind) {
		return nil
	}

	if !strings.HasSuffix(change.Path, ".image") {
		return nil
	}

	containerName := extractContainerName(change.Path)
	containerDesc := ""
	if containerName != "" {
		containerDesc = fmt.Sprintf(" for container '%s'", containerName)
	}

	description := fmt.Sprintf("Container image changed from '%v' to '%v'%s", change.Before, change.After, containerDesc)
	explanation := "Image changes trigger a rolling update (for Deployments) or immediate restart (for DaemonSets). Verify the new image version is tested and ready for production. Image changes are the most common source of application updates."

	return &Signal{
		Type:            "workload.image",
		Category:        CategoryOther,
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
