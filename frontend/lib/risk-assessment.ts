/**
 * Risk Assessment Logic for ChartImpact
 * 
 * Analyzes Helm chart changes and categorizes them by risk level and impact category.
 * Part of Phase 4: Impact Summary (Core Feature)
 * 
 * Based on: ux-revamp/IMPLEMENTATION_ROADMAP.md Phase 4.1
 */

import { 
  ImpactCategory, 
  RiskSignal, 
  ImpactSummary,
  ResourceDiffV2,
  ChangeV2 
} from './types';

/**
 * Analyze resources and generate risk signals
 */
export function assessRisk(resources: ResourceDiffV2[]): ImpactSummary {
  const availabilitySignals: RiskSignal[] = [];
  const securitySignals: RiskSignal[] = [];
  const otherSignals: RiskSignal[] = [];

  // Count total changed resources
  const totalChangedResources = resources.filter(r => 
    r.changeType === 'added' || r.changeType === 'removed' || r.changeType === 'modified'
  ).length;

  for (const resource of resources) {
    const signals = analyzeResource(resource);
    
    for (const signal of signals) {
      switch (signal.category) {
        case 'availability':
          availabilitySignals.push(signal);
          break;
        case 'security':
          securitySignals.push(signal);
          break;
        case 'other':
          otherSignals.push(signal);
          break;
      }
    }
  }

  // Count risks by level
  const allSignals = [...availabilitySignals, ...securitySignals, ...otherSignals];
  const totalHighRisk = allSignals.filter(s => s.level === 'high').length;
  const totalMediumRisk = allSignals.filter(s => s.level === 'medium').length;
  const totalLowRisk = allSignals.filter(s => s.level === 'low').length;

  // Determine overall verdict
  let verdict: ImpactSummary['verdict'];
  if (totalChangedResources === 0) {
    verdict = 'no-changes';
  } else if (totalHighRisk > 0) {
    verdict = 'high-risk';
  } else if (totalMediumRisk > 0) {
    verdict = 'medium-risk';
  } else {
    verdict = 'low-risk';
  }

  return {
    verdict,
    availabilityImpact: availabilitySignals,
    securityImpact: securitySignals,
    otherChanges: otherSignals,
    totalHighRisk,
    totalMediumRisk,
    totalLowRisk,
    totalChangedResources,
  };
}

/**
 * Analyze a single resource for risk signals
 * 
 * Risk Categorization Logic:
 * - Availability-critical: Deployment, StatefulSet, DaemonSet, Service
 *   These directly affect application uptime and accessibility
 * - Security-sensitive: NetworkPolicy, ServiceAccount, RBAC resources, Secret
 *   These control access and network security
 */

// Resource types that affect availability
const AVAILABILITY_CRITICAL_KINDS = ['Deployment', 'StatefulSet', 'DaemonSet', 'Service'];

// Resource types that affect security
const SECURITY_SENSITIVE_KINDS = [
  'NetworkPolicy', 
  'ServiceAccount', 
  'Role', 
  'RoleBinding', 
  'ClusterRole', 
  'ClusterRoleBinding', 
  'Secret'
];

function analyzeResource(resource: ResourceDiffV2): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const { identity, changeType, changes } = resource;
  const resourceName = `${identity.kind}/${identity.name}`;

  const isAvailabilityCritical = AVAILABILITY_CRITICAL_KINDS.includes(identity.kind);
  const isSecuritySensitive = SECURITY_SENSITIVE_KINDS.includes(identity.kind);

  // Resource added or removed
  if (changeType === 'added') {
    if (isAvailabilityCritical) {
      signals.push({
        resource: resourceName,
        kind: identity.kind,
        level: 'medium',
        category: 'availability',
        title: `${identity.kind} added`,
        description: `New ${identity.kind} resource created. Ensure this aligns with your deployment strategy.`,
      });
    } else if (isSecuritySensitive) {
      signals.push({
        resource: resourceName,
        kind: identity.kind,
        level: 'medium',
        category: 'security',
        title: `${identity.kind} added`,
        description: `New ${identity.kind} resource created. Review security implications.`,
      });
    }
  } else if (changeType === 'removed') {
    if (isAvailabilityCritical) {
      signals.push({
        resource: resourceName,
        kind: identity.kind,
        level: 'high',
        category: 'availability',
        title: `${identity.kind} removed`,
        description: `This ${identity.kind} will be deleted. Ensure no workloads depend on it.`,
      });
    } else if (isSecuritySensitive) {
      signals.push({
        resource: resourceName,
        kind: identity.kind,
        level: 'medium',
        category: 'security',
        title: `${identity.kind} removed`,
        description: `${identity.kind} will be removed. Verify access control implications.`,
      });
    }
  }

  // Analyze field-level changes
  if (changes && changes.length > 0) {
    for (const change of changes) {
      const signal = analyzeChange(resourceName, identity.kind, change);
      if (signal) {
        signals.push(signal);
      }
    }
  }

  return signals;
}

/**
 * Analyze a specific field change
 */
function analyzeChange(resourceName: string, kind: string, change: ChangeV2): RiskSignal | null {
  const path = change.path;
  
  // Replica count changes (Deployment/StatefulSet)
  if ((kind === 'Deployment' || kind === 'StatefulSet') && path.includes('replicas')) {
    const oldReplicas = change.before;
    const newReplicas = change.after;
    
    if (typeof oldReplicas === 'number' && typeof newReplicas === 'number') {
      if (newReplicas < oldReplicas) {
        return {
          resource: resourceName,
          kind,
          level: 'high',
          category: 'availability',
          title: 'Replica count decreased',
          description: `Replica count changed from ${oldReplicas} to ${newReplicas}. Reduced redundancy may impact availability during pod restarts or node failures.`,
          field: path,
          oldValue: oldReplicas,
          newValue: newReplicas,
        };
      } else if (newReplicas > oldReplicas) {
        return {
          resource: resourceName,
          kind,
          level: 'medium',
          category: 'availability',
          title: 'Replica count increased',
          description: `Replica count changed from ${oldReplicas} to ${newReplicas}. Increased redundancy improves availability but uses more resources.`,
          field: path,
          oldValue: oldReplicas,
          newValue: newReplicas,
        };
      }
    }
  }

  // Update strategy changes
  if ((kind === 'Deployment' || kind === 'StatefulSet') && path.includes('strategy')) {
    return {
      resource: resourceName,
      kind,
      level: 'medium',
      category: 'availability',
      title: 'Update strategy changed',
      description: 'Update strategy modification may affect rollout behavior and availability during updates.',
      field: path,
      oldValue: change.before,
      newValue: change.after,
    };
  }

  // Service port changes
  if (kind === 'Service' && (path.includes('port') || path.includes('targetPort'))) {
    return {
      resource: resourceName,
      kind,
      level: 'high',
      category: 'availability',
      title: 'Service port changed',
      description: 'Port changes may break connectivity. Ensure all clients are updated to use the new port.',
      field: path,
      oldValue: change.before,
      newValue: change.after,
    };
  }

  // Service type changes
  if (kind === 'Service' && path.includes('type')) {
    return {
      resource: resourceName,
      kind,
      level: 'high',
      category: 'availability',
      title: 'Service type changed',
      description: 'Service type change affects how the service is exposed. Verify external access requirements.',
      field: path,
      oldValue: change.before,
      newValue: change.after,
    };
  }

  // NetworkPolicy changes
  if (kind === 'NetworkPolicy') {
    return {
      resource: resourceName,
      kind,
      level: 'high',
      category: 'security',
      title: 'Network policy modified',
      description: 'Changes to network policies affect pod communication rules. Review security implications carefully.',
      field: path,
      oldValue: change.before,
      newValue: change.after,
    };
  }

  // RBAC changes
  if (['Role', 'ClusterRole', 'RoleBinding', 'ClusterRoleBinding'].includes(kind)) {
    if (path.includes('rules') || path.includes('subjects')) {
      return {
        resource: resourceName,
        kind,
        level: 'high',
        category: 'security',
        title: 'RBAC permissions changed',
        description: 'Changes to roles or bindings affect access control. Verify permissions align with security requirements.',
        field: path,
        oldValue: change.before,
        newValue: change.after,
      };
    }
  }

  // ServiceAccount changes
  if (kind === 'ServiceAccount' && path.includes('automountServiceAccountToken')) {
    return {
      resource: resourceName,
      kind,
      level: 'medium',
      category: 'security',
      title: 'Service account token mount changed',
      description: 'Changes to token mounting affect pod authentication. Review security implications.',
      field: path,
      oldValue: change.before,
      newValue: change.after,
    };
  }

  // Image changes
  if (path.includes('image') && !path.includes('imagePullPolicy')) {
    return {
      resource: resourceName,
      kind,
      level: 'medium',
      category: 'other',
      title: 'Container image changed',
      description: 'Container image updated. Ensure the new image is tested and compatible.',
      field: path,
      oldValue: change.before,
      newValue: change.after,
    };
  }

  // Resource requests/limits changes
  if (path.includes('resources') && (path.includes('requests') || path.includes('limits'))) {
    return {
      resource: resourceName,
      kind,
      level: 'medium',
      category: 'availability',
      title: 'Resource requirements changed',
      description: 'Changes to resource requests or limits may affect scheduling and performance.',
      field: path,
      oldValue: change.before,
      newValue: change.after,
    };
  }

  // For high/critical importance changes flagged by backend
  if (change.importance === 'high' || change.importance === 'critical') {
    const category: ImpactCategory = 
      change.changeCategory === 'security' ? 'security' :
      change.changeCategory === 'availability' ? 'availability' : 'other';
    
    return {
      resource: resourceName,
      kind,
      level: change.importance === 'critical' ? 'high' : 'medium',
      category,
      title: `${path} changed`,
      description: change.semanticType || 'Significant change detected. Review carefully.',
      field: path,
      oldValue: change.before,
      newValue: change.after,
    };
  }

  return null;
}

/**
 * Generate a plain-language impact statement from a summary.
 * e.g. "2 workloads will restart and 1 service port will change."
 */
export function generateImpactStatement(summary: ImpactSummary): string | null {
  if (summary.verdict === 'no-changes') return null;

  const all = [...summary.availabilityImpact, ...summary.securityImpact, ...summary.otherChanges];

  const imageRestarts = new Set<string>();
  let scaleDown = 0;
  let scaleUp = 0;
  let portChanges = 0;
  let serviceTypeChanges = 0;
  let rbacChanges = 0;
  let networkPolicyChanges = 0;
  let workloadsRemoved = 0;
  let workloadsAdded = 0;
  let resourceLimitChanges = 0;

  for (const signal of all) {
    switch (signal.title) {
      case 'Container image changed':
        imageRestarts.add(signal.resource);
        break;
      case 'Replica count decreased':
        scaleDown++;
        break;
      case 'Replica count increased':
        scaleUp++;
        break;
      case 'Service port changed':
        portChanges++;
        break;
      case 'Service type changed':
        serviceTypeChanges++;
        break;
      case 'Network policy modified':
        networkPolicyChanges++;
        break;
      case 'RBAC permissions changed':
        rbacChanges++;
        break;
      case 'Resource requirements changed':
        resourceLimitChanges++;
        break;
    }
    if (signal.title.endsWith(' removed') && AVAILABILITY_CRITICAL_KINDS.includes(signal.kind)) {
      workloadsRemoved++;
    }
    if (signal.title.endsWith(' added') && AVAILABILITY_CRITICAL_KINDS.includes(signal.kind)) {
      workloadsAdded++;
    }
  }

  const parts: string[] = [];

  const restartCount = imageRestarts.size;
  if (restartCount > 0) {
    parts.push(`${restartCount} workload${restartCount > 1 ? 's' : ''} will restart`);
  }
  if (workloadsRemoved > 0) {
    parts.push(`${workloadsRemoved} workload${workloadsRemoved > 1 ? 's' : ''} will be deleted`);
  }
  if (workloadsAdded > 0) {
    parts.push(`${workloadsAdded} workload${workloadsAdded > 1 ? 's' : ''} will be added`);
  }
  if (scaleDown > 0) {
    parts.push(`${scaleDown} workload${scaleDown > 1 ? 's' : ''} will scale down`);
  }
  if (scaleUp > 0) {
    parts.push(`${scaleUp} workload${scaleUp > 1 ? 's' : ''} will scale up`);
  }
  if (portChanges > 0) {
    parts.push(`${portChanges} service port${portChanges > 1 ? 's' : ''} will change`);
  }
  if (serviceTypeChanges > 0) {
    parts.push(`${serviceTypeChanges} service type${serviceTypeChanges > 1 ? 's' : ''} will change`);
  }
  if (rbacChanges > 0) {
    parts.push(`${rbacChanges} RBAC permission${rbacChanges > 1 ? 's' : ''} will be modified`);
  }
  if (networkPolicyChanges > 0) {
    parts.push(`${networkPolicyChanges} network polic${networkPolicyChanges > 1 ? 'ies' : 'y'} will change`);
  }
  if (resourceLimitChanges > 0 && parts.length === 0) {
    parts.push(`${resourceLimitChanges} resource limit${resourceLimitChanges > 1 ? 's' : ''} will change`);
  }

  if (parts.length === 0) {
    if (summary.verdict === 'low-risk') {
      return `${summary.totalChangedResources} resource${summary.totalChangedResources !== 1 ? 's' : ''} changed — no significant availability or security impact detected.`;
    }
    return null;
  }

  if (parts.length === 1) return cap(parts[0]) + '.';
  if (parts.length === 2) return `${cap(parts[0])} and ${parts[1]}.`;
  const last = parts[parts.length - 1];
  return `${cap(parts[0])}, ${parts.slice(1, -1).join(', ')}, and ${last}.`;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
