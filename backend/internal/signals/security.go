package signals

import (
	"fmt"
	"strings"

	"github.com/dcotelo/chartimpact/backend/internal/diff"
)

// detectSecurityContextSignal detects changes to security contexts
func (d *Detector) detectSecurityContextSignal(resourceDiff diff.ResourceDiff, change diff.Change) *Signal {
	if !isWorkloadResource(resourceDiff.Identity.Kind) {
		return nil
	}

	path := change.Path
	if !strings.Contains(path, ".securityContext") {
		return nil
	}

	var signalType string
	var description string
	var explanation string

	containerName := extractContainerName(path)
	containerDesc := ""
	if containerName != "" {
		containerDesc = fmt.Sprintf(" for container '%s'", containerName)
	}

	if strings.Contains(path, ".privileged") {
		signalType = "security.context.privileged"
		if change.Op == diff.OpAdd || (change.Op == diff.OpReplace && fmt.Sprintf("%v", change.After) == "true") {
			description = fmt.Sprintf("Privileged mode enabled%s", containerDesc)
			explanation = "Privileged containers have full access to the host system, bypassing most security boundaries. This significantly increases security risk. Verify this is necessary and understand the implications."
		} else {
			description = fmt.Sprintf("Privileged mode disabled%s", containerDesc)
			explanation = "Disabling privileged mode improves security by enforcing container isolation. This is a positive security change."
		}
	} else if strings.Contains(path, ".runAsNonRoot") {
		signalType = "security.context.runAsNonRoot"
		description = fmt.Sprintf("runAsNonRoot changed from %v to %v%s", change.Before, change.After, containerDesc)
		if fmt.Sprintf("%v", change.After) == "true" {
			explanation = "Requiring non-root execution improves security by preventing containers from running as UID 0. This is a positive security change."
		} else {
			explanation = "Allowing root execution increases security risk. Review if root access is truly necessary."
		}
	} else if strings.Contains(path, ".runAsUser") {
		signalType = "security.context.runAsUser"
		description = fmt.Sprintf("User ID changed from %v to %v%s", change.Before, change.After, containerDesc)
		explanation = "Changing the user ID affects what permissions the container has. Lower UIDs (especially 0/root) have more privileges."
	} else if strings.Contains(path, ".capabilities") {
		signalType = "security.context.capabilities"
		description = fmt.Sprintf("Linux capabilities changed%s", containerDesc)
		explanation = "Capabilities control access to privileged kernel features. Adding capabilities increases attack surface; removing capabilities improves security."
	} else if strings.Contains(path, ".seLinuxOptions") {
		signalType = "security.context.seLinux"
		description = fmt.Sprintf("SELinux options changed%s", containerDesc)
		explanation = "SELinux provides mandatory access control. Changes to SELinux options affect security policy enforcement."
	} else if strings.Contains(path, ".seccompProfile") {
		signalType = "security.context.seccomp"
		description = fmt.Sprintf("Seccomp profile changed%s", containerDesc)
		explanation = "Seccomp filters system calls that containers can make. Restrictive profiles improve security; removing profiles increases risk."
	} else {
		signalType = "security.context"
		description = fmt.Sprintf("Security context changed%s", containerDesc)
		explanation = "Security context changes affect container isolation and privileges. Review the specific changes carefully."
	}

	return &Signal{
		Type:            signalType,
		Category:        CategorySecurity,
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

// detectServiceAccountSignal detects changes to service accounts
func (d *Detector) detectServiceAccountSignal(resourceDiff diff.ResourceDiff, change diff.Change) *Signal {
	if !isWorkloadResource(resourceDiff.Identity.Kind) {
		return nil
	}

	if !strings.HasSuffix(change.Path, ".serviceAccountName") {
		return nil
	}

	description := fmt.Sprintf("Service account changed from '%v' to '%v'", change.Before, change.After)
	explanation := "Changing the service account changes the pod's Kubernetes API permissions. Review the new service account's RBAC rules to ensure least-privilege access."

	return &Signal{
		Type:            "security.serviceAccount",
		Category:        CategorySecurity,
		Importance:      ImportanceMedium,
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

// detectRBACSignal detects changes to RBAC resources
func (d *Detector) detectRBACSignal(resourceDiff diff.ResourceDiff, change diff.Change) *Signal {
	kind := resourceDiff.Identity.Kind
	if kind != "Role" && kind != "ClusterRole" && kind != "RoleBinding" && kind != "ClusterRoleBinding" {
		return nil
	}

	path := change.Path
	var signalType string
	var description string
	var explanation string

	if kind == "Role" || kind == "ClusterRole" {
		if strings.Contains(path, ".rules") {
			signalType = "security.rbac.rules"
			description = fmt.Sprintf("%s rules changed", kind)
			explanation = "RBAC rule changes affect access control permissions. Review changes carefully to ensure they follow the principle of least privilege. Adding overly broad permissions can create security risks."
		} else {
			return nil
		}
	} else {
		// RoleBinding or ClusterRoleBinding
		if strings.Contains(path, ".subjects") || strings.Contains(path, ".roleRef") {
			signalType = "security.rbac.binding"
			description = fmt.Sprintf("%s binding changed", kind)
			explanation = "Binding changes affect which users or service accounts have which permissions. Verify that the new binding grants appropriate access."
		} else {
			return nil
		}
	}

	return &Signal{
		Type:            signalType,
		Category:        CategorySecurity,
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

// detectServiceExposureSignal detects changes to service exposure
func (d *Detector) detectServiceExposureSignal(resourceDiff diff.ResourceDiff, change diff.Change) *Signal {
	if resourceDiff.Identity.Kind != "Service" {
		return nil
	}

	path := change.Path
	var signalType string
	var description string
	var explanation string

	if strings.Contains(path, ".type") && strings.HasSuffix(path, ".type") {
		signalType = "security.exposure.type"
		
		beforeType := fmt.Sprintf("%v", change.Before)
		afterType := fmt.Sprintf("%v", change.After)
		
		description = fmt.Sprintf("Service type changed from %s to %s", beforeType, afterType)
		
		if afterType == "LoadBalancer" || afterType == "NodePort" {
			explanation = fmt.Sprintf("Changing to %s exposes this service to external traffic. Verify this is intended and consider restricting access using loadBalancerSourceRanges or firewall rules.", afterType)
		} else if afterType == "ClusterIP" {
			explanation = "Changing to ClusterIP restricts access to within the cluster, improving security by reducing external exposure."
		} else {
			explanation = "Service type changes affect network exposure. Review the implications for your security posture."
		}
	} else if strings.Contains(path, ".externalIPs") {
		signalType = "security.exposure.externalIPs"
		description = "External IPs configuration changed"
		explanation = "External IPs allow direct access to the service from specific IP addresses. Verify these IPs are trusted and access is appropriately restricted."
	} else if strings.Contains(path, ".loadBalancerSourceRanges") {
		signalType = "security.exposure.loadBalancerSourceRanges"
		description = "Load balancer source ranges changed"
		explanation = "Source ranges control which IP addresses can access the service. Removing restrictions increases exposure; adding restrictions improves security."
	} else {
		return nil
	}

	return &Signal{
		Type:            signalType,
		Category:        CategorySecurity,
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

// detectNetworkPolicySignal detects changes to network policies
func (d *Detector) detectNetworkPolicySignal(resourceDiff diff.ResourceDiff, change diff.Change) *Signal {
	if resourceDiff.Identity.Kind != "NetworkPolicy" {
		return nil
	}

	// For NetworkPolicy, any change is significant
	description := "Network policy configuration changed"
	explanation := "NetworkPolicy changes affect pod-to-pod network traffic control. Adding policies can restrict traffic (improving security but potentially blocking legitimate connections). Removing policies can expose services."

	return &Signal{
		Type:            "security.networkPolicy",
		Category:        CategorySecurity,
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

// detectSecretReferenceSignal detects changes to secret references
func (d *Detector) detectSecretReferenceSignal(resourceDiff diff.ResourceDiff, change diff.Change) *Signal {
	if !isWorkloadResource(resourceDiff.Identity.Kind) {
		return nil
	}

	path := change.Path
	var signalType string
	var description string

	if strings.Contains(path, ".valueFrom.secretKeyRef") {
		signalType = "security.secrets.env"
		secretName := ""
		if change.After != nil {
			// Try to extract secret name if it's a map
			if afterMap, ok := change.After.(map[string]interface{}); ok {
				if name, ok := afterMap["name"]; ok {
					secretName = fmt.Sprintf("'%v'", name)
				}
			}
		}
		description = fmt.Sprintf("Secret reference %s added to environment variable", secretName)
	} else if strings.Contains(path, ".volumes") && strings.Contains(path, ".secret") {
		signalType = "security.secrets.volume"
		description = "Secret volume mount changed"
	} else {
		return nil
	}

	explanation := "Secret references indicate where sensitive data is consumed. Verify the secret exists and contains the expected data. Changes to secret references may require application restarts to take effect."

	return &Signal{
		Type:            signalType,
		Category:        CategorySecurity,
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

// detectHostAccessSignal detects host namespace and host path access
func (d *Detector) detectHostAccessSignal(resourceDiff diff.ResourceDiff, change diff.Change) *Signal {
	if !isWorkloadResource(resourceDiff.Identity.Kind) {
		return nil
	}

	path := change.Path
	var signalType string
	var description string
	var explanation string

	if strings.Contains(path, ".hostNetwork") {
		signalType = "security.hostAccess.network"
		if fmt.Sprintf("%v", change.After) == "true" {
			description = "Host network access enabled"
			explanation = "Enabling hostNetwork allows pods to access the node's network stack directly, bypassing network policies. This increases security risk and should only be used when necessary."
		} else {
			description = "Host network access disabled"
			explanation = "Disabling hostNetwork improves security by enforcing network isolation. This is a positive security change."
		}
	} else if strings.Contains(path, ".hostPID") {
		signalType = "security.hostAccess.pid"
		description = "Host PID namespace access changed"
		explanation = "Host PID namespace access allows containers to see all processes on the node, breaking isolation. This should only be enabled for specific debugging or monitoring use cases."
	} else if strings.Contains(path, ".hostIPC") {
		signalType = "security.hostAccess.ipc"
		description = "Host IPC namespace access changed"
		explanation = "Host IPC namespace access allows containers to access inter-process communication on the host, breaking isolation. This increases security risk."
	} else if strings.Contains(path, ".hostPath") {
		signalType = "security.hostAccess.path"
		description = "Host path volume added or changed"
		explanation = "HostPath volumes grant direct access to the node's filesystem, bypassing container isolation. This can be a security risk if the container is compromised. Use only when necessary and with appropriate read-only settings."
	} else {
		return nil
	}

	return &Signal{
		Type:            signalType,
		Category:        CategorySecurity,
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
