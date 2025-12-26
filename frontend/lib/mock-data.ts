import { DiffResultV2 } from './types';

export const mockDiffResultV2: DiffResultV2 = {
  metadata: {
    engineVersion: '2.0.0',
    compareId: 'demo-compare-123',
    generatedAt: new Date().toISOString(),
    inputs: {
      left: {
        source: 'helm',
        chart: 'argo-cd',
        version: 'argo-cd-9.1.5'
      },
      right: {
        source: 'helm',
        chart: 'argo-cd',
        version: 'argo-cd-9.1.6'
      }
    },
    normalizationRules: ['ignore-timestamps', 'normalize-labels']
  },
  resources: [
    {
      identity: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'argocd-server',
        namespace: 'argocd'
      },
      changeType: 'modified',
      beforeHash: 'abc123def456',
      afterHash: 'def456abc789',
      changes: [
        {
          op: 'replace',
          path: 'spec.template.spec.containers[0].image',
          pathTokens: ['spec', 'template', 'spec', 'containers', 0, 'image'],
          before: 'quay.io/argoproj/argocd:v2.8.0',
          after: 'quay.io/argoproj/argocd:v2.8.1',
          valueType: 'string',
          semanticType: 'container.image',
          changeCategory: 'workload',
          importance: 'critical',
          flags: ['breaking-change', 'rollout-trigger']
        },
        {
          op: 'replace',
          path: 'spec.replicas',
          pathTokens: ['spec', 'replicas'],
          before: 2,
          after: 3,
          valueType: 'int',
          semanticType: 'workload.replicas',
          changeCategory: 'workload',
          importance: 'high'
        },
        {
          op: 'replace',
          path: 'spec.template.spec.containers[0].resources.requests.memory',
          pathTokens: ['spec', 'template', 'spec', 'containers', 0, 'resources', 'requests', 'memory'],
          before: '256Mi',
          after: '512Mi',
          valueType: 'string',
          semanticType: 'resources.memory',
          changeCategory: 'resources',
          importance: 'medium'
        }
      ],
      summary: {
        totalChanges: 3,
        byImportance: {
          critical: 1,
          high: 1,
          medium: 1
        },
        categories: ['workload', 'resources']
      }
    },
    {
      identity: {
        apiVersion: 'v1',
        kind: 'Service',
        name: 'argocd-server',
        namespace: 'argocd'
      },
      changeType: 'modified',
      beforeHash: 'xyz789abc123',
      afterHash: 'abc123xyz789',
      changes: [
        {
          op: 'replace',
          path: 'spec.ports[0].port',
          pathTokens: ['spec', 'ports', 0, 'port'],
          before: 80,
          after: 8080,
          valueType: 'int',
          semanticType: 'service.port',
          changeCategory: 'networking',
          importance: 'high'
        },
        {
          op: 'replace',
          path: 'metadata.labels.version',
          pathTokens: ['metadata', 'labels', 'version'],
          before: 'v2.8.0',
          after: 'v2.8.1',
          valueType: 'string',
          semanticType: 'metadata.label',
          changeCategory: 'metadata',
          importance: 'low'
        }
      ],
      summary: {
        totalChanges: 2,
        byImportance: {
          high: 1,
          low: 1
        },
        categories: ['networking', 'metadata']
      }
    },
    {
      identity: {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        name: 'argocd-cm',
        namespace: 'argocd'
      },
      changeType: 'modified',
      changes: [
        {
          op: 'replace',
          path: 'data.timeout',
          pathTokens: ['data', 'timeout'],
          before: '30s',
          after: '60s',
          valueType: 'string',
          semanticType: 'config.timeout',
          changeCategory: 'configuration',
          importance: 'medium'
        }
      ],
      summary: {
        totalChanges: 1,
        byImportance: {
          medium: 1
        },
        categories: ['configuration']
      }
    },
    {
      identity: {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'ClusterRole',
        name: 'argocd-application-controller',
        namespace: ''
      },
      changeType: 'modified',
      changes: [
        {
          op: 'add',
          path: 'rules[0].verbs',
          pathTokens: ['rules', 0, 'verbs'],
          after: ['delete'],
          valueType: 'array',
          semanticType: 'rbac.permissions',
          changeCategory: 'security',
          importance: 'critical',
          flags: ['security-related']
        }
      ],
      summary: {
        totalChanges: 1,
        byImportance: {
          critical: 1
        },
        categories: ['security']
      }
    },
    {
      identity: {
        apiVersion: 'v1',
        kind: 'ServiceAccount',
        name: 'argocd-dex-server',
        namespace: 'argocd'
      },
      changeType: 'removed',
      beforeHash: 'removed123',
      changes: [],
      summary: {
        totalChanges: 0,
        categories: []
      }
    },
    {
      identity: {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'Ingress',
        name: 'argocd-server',
        namespace: 'argocd'
      },
      changeType: 'added',
      afterHash: 'added456',
      changes: [],
      summary: {
        totalChanges: 0,
        categories: []
      }
    }
  ],
  stats: {
    resources: {
      added: 1,
      removed: 1,
      modified: 4
    },
    changes: {
      total: 7
    }
  }
};
