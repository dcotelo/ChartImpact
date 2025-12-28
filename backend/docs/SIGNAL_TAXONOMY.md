# Signal Taxonomy and Schema

## Overview

This document defines ChartImpact's signal taxonomy—the structured vocabulary for describing availability and security impacts in Helm chart changes. Signals are mission-aligned, deterministic outputs suitable for both interactive exploration and automated workflows.

## Design Principles

### 1. Mission-Driven

Every signal must relate to ChartImpact's mission:
- **Availability**: Will this change affect service uptime, rollout behavior, or workload health?
- **Security**: Does this change affect security posture, access control, or exposure?

### 2. Non-Alarmist

Signals inform, they don't alarm:
- Avoid sensational language ("CRITICAL", "DANGEROUS")
- Use precise, technical descriptions
- Provide context and explanation
- Let teams decide significance

### 3. Deterministic

Same input → same signals:
- No time-based variation
- No randomness
- Reproducible across runs
- Suitable for automation

### 4. Actionable

Signals must answer "what changed and why it matters":
- Identify specific resources
- Explain the nature of change
- Provide context for interpretation
- Reference raw changes for validation

### 5. Versioned

Signals evolve over time:
- Schema version tracking
- Backward compatibility when possible
- Clear migration paths

## Signal Categories

### Availability Signals

Changes that affect service uptime, rollout behavior, or workload health.

#### A1: Probe Configuration

**Type**: `availability.probe`

**Subtypes**:
- `availability.probe.readiness` - Readiness probe added/removed/modified
- `availability.probe.liveness` - Liveness probe added/removed/modified
- `availability.probe.startup` - Startup probe added/removed/modified

**Detection Criteria**:
- Path contains `.readinessProbe`, `.livenessProbe`, or `.startupProbe`
- Resource kind is Deployment, StatefulSet, DaemonSet, Job, CronJob

**Why It Matters**:
- Probes control traffic routing and auto-healing
- Removing probes can hide failures
- Adding probes can cause rollout issues if misconfigured
- Probe timing changes can affect rollout speed

**Example Signals**:
```json
{
  "type": "availability.probe.readiness",
  "importance": "high",
  "resource": {
    "kind": "Deployment",
    "name": "api-server",
    "namespace": "default"
  },
  "changeType": "removed",
  "description": "Readiness probe removed from container 'api'",
  "explanation": "Without a readiness probe, pods will receive traffic immediately on startup, potentially before the application is ready to handle requests. This can cause connection errors during deployments.",
  "affectedPath": "spec.template.spec.containers[0].readinessProbe",
  "rawChanges": [
    {
      "op": "remove",
      "path": "spec.template.spec.containers[0].readinessProbe"
    }
  ]
}
```

#### A2: Replica Count

**Type**: `availability.replicas`

**Detection Criteria**:
- Path ends with `.replicas`
- Resource kind is Deployment, StatefulSet, ReplicaSet

**Why It Matters**:
- Affects high availability and capacity
- Scaling down can reduce redundancy
- Scaling up increases resource usage

**Example Signals**:
```json
{
  "type": "availability.replicas",
  "importance": "high",
  "resource": {
    "kind": "Deployment",
    "name": "web-frontend",
    "namespace": "production"
  },
  "changeType": "modified",
  "description": "Replica count changed from 3 to 1",
  "explanation": "Reducing replicas decreases redundancy. With only 1 replica, the service has no failover capacity during pod restarts or node failures.",
  "affectedPath": "spec.replicas",
  "before": 3,
  "after": 1,
  "rawChanges": [
    {
      "op": "replace",
      "path": "spec.replicas",
      "before": 3,
      "after": 1
    }
  ]
}
```

#### A3: Rollout Strategy

**Type**: `availability.rollout`

**Subtypes**:
- `availability.rollout.strategy` - Strategy type changed (RollingUpdate ↔ Recreate)
- `availability.rollout.maxSurge` - Maximum surge changed
- `availability.rollout.maxUnavailable` - Maximum unavailable changed

**Detection Criteria**:
- Path contains `.strategy.type`, `.maxSurge`, `.maxUnavailable`
- Resource kind is Deployment

**Why It Matters**:
- Controls how deployments roll out
- Affects downtime and resource usage
- Recreate strategy causes downtime
- Surge/unavailable settings affect rollout speed

**Example Signals**:
```json
{
  "type": "availability.rollout.strategy",
  "importance": "high",
  "resource": {
    "kind": "Deployment",
    "name": "database-proxy",
    "namespace": "default"
  },
  "changeType": "modified",
  "description": "Rollout strategy changed from RollingUpdate to Recreate",
  "explanation": "Recreate strategy terminates all existing pods before creating new ones, causing service downtime during deployments. Consider if this downtime is acceptable for your use case.",
  "affectedPath": "spec.strategy.type",
  "before": "RollingUpdate",
  "after": "Recreate",
  "rawChanges": [
    {
      "op": "replace",
      "path": "spec.strategy.type",
      "before": "RollingUpdate",
      "after": "Recreate"
    }
  ]
}
```

#### A4: Resource Limits

**Type**: `availability.resources`

**Subtypes**:
- `availability.resources.limits` - CPU or memory limits changed
- `availability.resources.requests` - CPU or memory requests changed

**Detection Criteria**:
- Path contains `.resources.limits` or `.resources.requests`
- Resource kind has containers (Deployment, StatefulSet, etc.)

**Why It Matters**:
- Affects pod scheduling and eviction
- High limits can prevent scheduling
- Low limits can cause OOMKilled or throttling
- Request changes affect node placement

**Example Signals**:
```json
{
  "type": "availability.resources.limits",
  "importance": "medium",
  "resource": {
    "kind": "Deployment",
    "name": "worker",
    "namespace": "production"
  },
  "changeType": "modified",
  "description": "Memory limit decreased from 2Gi to 512Mi for container 'worker'",
  "explanation": "Reducing memory limits increases the risk of OOMKilled events if the application's actual memory usage exceeds the new limit. Monitor memory usage after deployment.",
  "affectedPath": "spec.template.spec.containers[0].resources.limits.memory",
  "before": "2Gi",
  "after": "512Mi",
  "rawChanges": [
    {
      "op": "replace",
      "path": "spec.template.spec.containers[0].resources.limits.memory",
      "before": "2Gi",
      "after": "512Mi"
    }
  ]
}
```

#### A5: PodDisruptionBudget

**Type**: `availability.pdb`

**Subtypes**:
- `availability.pdb.minAvailable` - Minimum available changed
- `availability.pdb.maxUnavailable` - Maximum unavailable changed

**Detection Criteria**:
- Resource kind is PodDisruptionBudget
- Fields `.minAvailable` or `.maxUnavailable` changed

**Why It Matters**:
- Controls voluntary disruptions (node drains, upgrades)
- Too restrictive can block cluster operations
- Too permissive can cause availability issues

**Example Signals**:
```json
{
  "type": "availability.pdb.minAvailable",
  "importance": "high",
  "resource": {
    "kind": "PodDisruptionBudget",
    "name": "api-pdb",
    "namespace": "production"
  },
  "changeType": "modified",
  "description": "Minimum available changed from 2 to 1",
  "explanation": "Lowering minAvailable allows more pods to be disrupted simultaneously. With minAvailable=1, cluster maintenance operations can potentially disrupt all but one pod at a time.",
  "affectedPath": "spec.minAvailable",
  "before": 2,
  "after": 1,
  "rawChanges": [
    {
      "op": "replace",
      "path": "spec.minAvailable",
      "before": 2,
      "after": 1
    }
  ]
}
```

### Security Signals

Changes that affect security posture, access control, or exposure.

#### S1: Security Context

**Type**: `security.context`

**Subtypes**:
- `security.context.privileged` - Privileged mode changed
- `security.context.runAsUser` - User ID changed
- `security.context.runAsNonRoot` - Non-root requirement changed
- `security.context.capabilities` - Linux capabilities changed
- `security.context.seLinux` - SELinux context changed
- `security.context.seccomp` - Seccomp profile changed

**Detection Criteria**:
- Path contains `.securityContext`
- Changes to privileged, runAsUser, runAsNonRoot, capabilities, seLinuxOptions, seccompProfile

**Why It Matters**:
- Affects container security boundaries
- Privileged containers can compromise nodes
- Running as root increases attack surface
- Capabilities control kernel feature access

**Example Signals**:
```json
{
  "type": "security.context.privileged",
  "importance": "high",
  "resource": {
    "kind": "Deployment",
    "name": "monitoring-agent",
    "namespace": "kube-system"
  },
  "changeType": "added",
  "description": "Container 'agent' now runs in privileged mode",
  "explanation": "Privileged containers have full access to the host system, bypassing most security boundaries. This significantly increases security risk. Verify this is necessary and understand the implications.",
  "affectedPath": "spec.template.spec.containers[0].securityContext.privileged",
  "after": true,
  "rawChanges": [
    {
      "op": "add",
      "path": "spec.template.spec.containers[0].securityContext.privileged",
      "after": true
    }
  ]
}
```

#### S2: Service Account

**Type**: `security.serviceAccount`

**Detection Criteria**:
- Path ends with `.serviceAccountName`
- Resource kind has pods (Deployment, StatefulSet, etc.)

**Why It Matters**:
- Controls pod's Kubernetes API permissions
- Changing service account changes pod's access rights
- Default service account should be avoided for security

**Example Signals**:
```json
{
  "type": "security.serviceAccount",
  "importance": "medium",
  "resource": {
    "kind": "Deployment",
    "name": "api-server",
    "namespace": "production"
  },
  "changeType": "modified",
  "description": "Service account changed from 'api-sa' to 'admin-sa'",
  "explanation": "Changing the service account changes the pod's Kubernetes API permissions. Review the new service account's RBAC rules to ensure least-privilege access.",
  "affectedPath": "spec.template.spec.serviceAccountName",
  "before": "api-sa",
  "after": "admin-sa",
  "rawChanges": [
    {
      "op": "replace",
      "path": "spec.template.spec.serviceAccountName",
      "before": "api-sa",
      "after": "admin-sa"
    }
  ]
}
```

#### S3: RBAC Rules

**Type**: `security.rbac`

**Subtypes**:
- `security.rbac.role` - Role rules changed
- `security.rbac.clusterRole` - ClusterRole rules changed
- `security.rbac.binding` - Role binding changed

**Detection Criteria**:
- Resource kind is Role, ClusterRole, RoleBinding, ClusterRoleBinding
- Fields in `.rules` changed

**Why It Matters**:
- Controls who can do what in the cluster
- Over-permissive rules violate least privilege
- Rule changes can grant unintended access

**Example Signals**:
```json
{
  "type": "security.rbac.clusterRole",
  "importance": "high",
  "resource": {
    "kind": "ClusterRole",
    "name": "app-role",
    "namespace": ""
  },
  "changeType": "modified",
  "description": "ClusterRole now allows 'delete' on 'pods'",
  "explanation": "Adding the 'delete' verb on 'pods' grants the ability to delete any pod in the cluster. Verify this permission is necessary and justified.",
  "affectedPath": "rules[0].verbs",
  "before": ["get", "list", "watch"],
  "after": ["get", "list", "watch", "delete"],
  "rawChanges": [
    {
      "op": "replace",
      "path": "rules[0].verbs",
      "before": ["get", "list", "watch"],
      "after": ["get", "list", "watch", "delete"]
    }
  ]
}
```

#### S4: Service Exposure

**Type**: `security.exposure`

**Subtypes**:
- `security.exposure.type` - Service type changed (ClusterIP ↔ LoadBalancer)
- `security.exposure.externalIPs` - External IPs added/changed
- `security.exposure.loadBalancerSourceRanges` - Source IP ranges changed

**Detection Criteria**:
- Resource kind is Service
- `.spec.type` changed from ClusterIP to LoadBalancer/NodePort or vice versa
- `.spec.externalIPs` added/changed
- `.spec.loadBalancerSourceRanges` changed

**Why It Matters**:
- Affects network exposure to external traffic
- LoadBalancer/NodePort exposes service outside cluster
- Missing source IP restrictions increase attack surface

**Example Signals**:
```json
{
  "type": "security.exposure.type",
  "importance": "high",
  "resource": {
    "kind": "Service",
    "name": "database",
    "namespace": "production"
  },
  "changeType": "modified",
  "description": "Service type changed from ClusterIP to LoadBalancer",
  "explanation": "Changing to LoadBalancer exposes this service to external traffic. The database will be accessible from outside the cluster. Verify this is intended and consider using loadBalancerSourceRanges to restrict access.",
  "affectedPath": "spec.type",
  "before": "ClusterIP",
  "after": "LoadBalancer",
  "rawChanges": [
    {
      "op": "replace",
      "path": "spec.type",
      "before": "ClusterIP",
      "after": "LoadBalancer"
    }
  ]
}
```

#### S5: Network Policy

**Type**: `security.networkPolicy`

**Detection Criteria**:
- Resource kind is NetworkPolicy
- Changes to `.spec.ingress`, `.spec.egress`, or `.spec.policyTypes`

**Why It Matters**:
- Controls pod-to-pod network traffic
- Adding policies can block legitimate traffic
- Removing policies can expose services

**Example Signals**:
```json
{
  "type": "security.networkPolicy",
  "importance": "high",
  "resource": {
    "kind": "NetworkPolicy",
    "name": "api-policy",
    "namespace": "production"
  },
  "changeType": "removed",
  "description": "Network policy deleted",
  "explanation": "Removing this NetworkPolicy eliminates network traffic restrictions for pods matching its selector. This may allow unintended network access.",
  "rawChanges": [
    {
      "op": "remove",
      "path": ""
    }
  ]
}
```

#### S6: Secret References

**Type**: `security.secrets`

**Subtypes**:
- `security.secrets.env` - Secret referenced in environment variable
- `security.secrets.volume` - Secret mounted as volume

**Detection Criteria**:
- Path contains `.valueFrom.secretKeyRef` or `.secretName` in volume context
- Changes to secret references

**Why It Matters**:
- Tracks which secrets are consumed
- Helps identify secret sprawl
- Removal may break application

**Example Signals**:
```json
{
  "type": "security.secrets.env",
  "importance": "medium",
  "resource": {
    "kind": "Deployment",
    "name": "api-server",
    "namespace": "production"
  },
  "changeType": "added",
  "description": "New secret reference 'db-credentials' added to environment variable 'DATABASE_PASSWORD'",
  "explanation": "A new secret is now being consumed by this workload. Verify the secret exists and contains the expected data.",
  "affectedPath": "spec.template.spec.containers[0].env[5].valueFrom.secretKeyRef.name",
  "after": "db-credentials",
  "rawChanges": [
    {
      "op": "add",
      "path": "spec.template.spec.containers[0].env[5].valueFrom.secretKeyRef.name",
      "after": "db-credentials"
    }
  ]
}
```

#### S7: Host Access

**Type**: `security.hostAccess`

**Subtypes**:
- `security.hostAccess.network` - hostNetwork enabled
- `security.hostAccess.pid` - hostPID enabled
- `security.hostAccess.ipc` - hostIPC enabled
- `security.hostAccess.path` - hostPath volume added

**Detection Criteria**:
- Path contains `.hostNetwork`, `.hostPID`, `.hostIPC`
- Volume type is `hostPath`

**Why It Matters**:
- Host namespace access breaks isolation
- hostPath volumes can access node filesystem
- Security risk if container is compromised

**Example Signals**:
```json
{
  "type": "security.hostAccess.network",
  "importance": "high",
  "resource": {
    "kind": "DaemonSet",
    "name": "monitoring",
    "namespace": "kube-system"
  },
  "changeType": "added",
  "description": "Host network access enabled",
  "explanation": "Enabling hostNetwork allows pods to access the node's network stack directly, bypassing network policies. This increases security risk and should only be used when necessary.",
  "affectedPath": "spec.template.spec.hostNetwork",
  "after": true,
  "rawChanges": [
    {
      "op": "add",
      "path": "spec.template.spec.hostNetwork",
      "after": true
    }
  ]
}
```

### Other Signals

Changes that don't directly affect availability or security but are noteworthy.

#### O1: Image Changes

**Type**: `workload.image`

**Detection Criteria**:
- Path ends with `.image`
- Container image changed

**Why It Matters**:
- Triggers pod restart and rollout
- New image may have bugs or vulnerabilities
- Track what's being deployed

**Example Signals**:
```json
{
  "type": "workload.image",
  "importance": "high",
  "resource": {
    "kind": "Deployment",
    "name": "api-server",
    "namespace": "production"
  },
  "changeType": "modified",
  "description": "Container image changed from 'api:v1.2.0' to 'api:v1.3.0'",
  "explanation": "Image changes trigger a rolling update. Verify the new image version is tested and ready for production.",
  "affectedPath": "spec.template.spec.containers[0].image",
  "before": "api:v1.2.0",
  "after": "api:v1.3.0",
  "rawChanges": [
    {
      "op": "replace",
      "path": "spec.template.spec.containers[0].image",
      "before": "api:v1.2.0",
      "after": "api:v1.3.0"
    }
  ]
}
```

## Signal Schema (v1)

### Signal Object Structure

```typescript
interface Signal {
  // Signal identification
  type: string;                    // Signal type (e.g., "availability.probe.readiness")
  category: "availability" | "security" | "other";
  importance: "high" | "medium" | "low";
  
  // Resource identification
  resource: ResourceIdentity;
  
  // Change description
  changeType: "added" | "removed" | "modified";
  description: string;             // One-line summary
  explanation: string;             // Why this matters (2-3 sentences)
  
  // Technical details
  affectedPath: string;            // JSON path to changed field
  before?: any;                    // Previous value (if modified/removed)
  after?: any;                     // New value (if modified/added)
  
  // Raw change references
  rawChanges: Change[];            // Reference to underlying diff engine changes
  
  // Metadata
  detectedAt?: string;             // ISO 8601 timestamp
  detectorVersion?: string;        // Signal engine version
}

interface ResourceIdentity {
  kind: string;
  name: string;
  namespace: string;
  apiVersion: string;
}

interface Change {
  op: "add" | "remove" | "replace";
  path: string;
  before?: any;
  after?: any;
}
```

### Signal Collection Structure

```typescript
interface SignalResult {
  metadata: SignalMetadata;
  signals: Signal[];
  summary: SignalSummary;
}

interface SignalMetadata {
  schemaVersion: string;           // e.g., "1.0.0"
  generatedAt: string;             // ISO 8601
  compareId: string;               // UUID linking to diff result
  inputs: {
    left: SourceMetadata;
    right: SourceMetadata;
  };
}

interface SignalSummary {
  total: number;
  byCategory: {
    availability: number;
    security: number;
    other: number;
  };
  byImportance: {
    high: number;
    medium: number;
    low: number;
  };
  topSignals: Signal[];            // Most important signals (max 5)
}
```

## Signal Detection Algorithm

### 1. Parse Diff Result

Input: `DiffResult` from diff engine
Output: List of `Change` objects with semantic metadata

### 2. Pattern Matching

For each change:
- Match path patterns to signal types
- Check resource kind compatibility
- Validate detection criteria

### 3. Signal Construction

For each matched pattern:
- Create `Signal` object
- Assign category and importance
- Generate human-readable description
- Generate explanation of impact
- Link to raw changes

### 4. Aggregation

- Count signals by category and importance
- Identify top signals for summary
- Generate overall signal result

### 5. Deduplication

- Merge related signals (e.g., multiple probe changes in same container)
- Prioritize higher-importance signals
- Maintain signal uniqueness

## Webhook-Specific Considerations

### Signal Summaries for PR Comments

For webhook-driven PR comments, signals should be:

**Concise**:
```markdown
### Impact Summary

**Availability** (2 high, 1 medium):
- Readiness probe removed from `api-server/api` container
- Replica count decreased from 3 to 1

**Security** (1 high):
- Service `database` changed to LoadBalancer (now externally exposed)
```

**Actionable**:
- Link to full analysis in web UI
- Highlight review-worthy signals
- Omit low-importance signals in summary

**Stable**:
- Same inputs → same summary
- No time-based variation
- Suitable for automation

### Signal Thresholds

For automated checks, teams may configure thresholds:

```yaml
thresholds:
  availability:
    high: fail        # Block PR if high-importance availability signals
    medium: warn      # Warn but don't block
    low: ignore
  security:
    high: fail
    medium: warn
    low: ignore
  other:
    high: warn
    medium: ignore
    low: ignore
```

## Implementation Phases

### Phase 1: Core Signal Detection (Current)

✅ Basic semantic classification in diff engine
✅ Change categorization (workload, security, networking)
✅ Importance levels
✅ Contextual flags

### Phase 2: Structured Signals (This PR)

- [ ] Signal taxonomy documentation
- [ ] Signal schema definition
- [ ] Signal detection framework
- [ ] Pattern matchers for each signal type
- [ ] Signal object construction
- [ ] Signal summary generation

### Phase 3: Enhanced Detection

- [ ] Cross-resource pattern detection
- [ ] Aggregate signal generation
- [ ] Signal deduplication
- [ ] Custom signal rules

### Phase 4: Webhook Integration

- [ ] Concise signal summaries
- [ ] Threshold-based filtering
- [ ] PR comment formatting
- [ ] Signal persistence

## Testing Strategy

### Signal Detection Tests

Test each signal type with:
- Golden input (known chart changes)
- Expected signal output
- Verify signal structure
- Verify explanation quality

### Determinism Tests

Run same input multiple times:
- Verify identical signal output
- No time-based variation
- Stable signal ordering

### Real-World Scenarios

Test with real chart upgrades:
- Popular Helm charts (nginx-ingress, cert-manager, etc.)
- Verify signal accuracy
- No false positives
- No missed signals

### Regression Tests

Maintain golden test suite:
- Known chart changes
- Expected signals
- Detect signal regressions

## Conclusion

This signal taxonomy transforms ChartImpact from a diff viewer into an impact analysis engine. Signals provide mission-aligned, deterministic insights suitable for both interactive exploration and automated workflows.

**Key Benefits**:
- Clear availability and security focus
- Non-alarmist, informative tone
- Deterministic and repeatable
- Webhook-ready from day one
- Extensible for future enhancements
