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
