import { DiffResultV2, ResourceDiff } from './types';

export const mockDiffResultV2: DiffResultV2 = {
  metadata: {
    engineVersion: '2.0.0',
    compareId: 'demo-compare-123',
    generatedAt: new Date().toISOString(),
    inputs: {
      left: {
        repository: 'https://github.com/argoproj/argo-helm.git',
        chartPath: 'charts/argo-cd',
        version: 'argo-cd-9.1.5'
      },
      right: {
        repository: 'https://github.com/argoproj/argo-helm.git',
        chartPath: 'charts/argo-cd',
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
          path: 'spec.template.spec.containers[0].image',
          semanticType: 'spec',
          importance: 'critical',
          flags: ['breaking-change'],
          type: 'value-change',
          before: 'quay.io/argoproj/argocd:v2.8.0',
          after: 'quay.io/argoproj/argocd:v2.8.1'
        },
        {
          path: 'spec.replicas',
          semanticType: 'spec',
          importance: 'high',
          type: 'value-change',
          before: 2,
          after: 3
        },
        {
          path: 'spec.template.spec.containers[0].resources.requests.memory',
          semanticType: 'spec',
          importance: 'medium',
          type: 'value-change',
          before: '256Mi',
          after: '512Mi'
        }
      ],
      summary: {
        totalChanges: 3,
        byImportance: {
          critical: 1,
          high: 1,
          medium: 1
        },
        bySemanticType: {
          spec: 3
        }
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
          path: 'spec.ports[0].port',
          semanticType: 'spec',
          importance: 'high',
          type: 'value-change',
          before: 80,
          after: 8080
        },
        {
          path: 'metadata.labels.version',
          semanticType: 'metadata',
          importance: 'low',
          type: 'value-change',
          before: 'v2.8.0',
          after: 'v2.8.1'
        }
      ],
      summary: {
        totalChanges: 2,
        byImportance: {
          high: 1,
          low: 1
        },
        bySemanticType: {
          spec: 1,
          metadata: 1
        }
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
          path: 'data.timeout',
          semanticType: 'data',
          importance: 'medium',
          type: 'value-change',
          before: '30s',
          after: '60s'
        }
      ],
      summary: {
        totalChanges: 1,
        byImportance: {
          medium: 1
        },
        bySemanticType: {
          data: 1
        }
      }
    },
    {
      identity: {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'ClusterRole',
        name: 'argocd-application-controller',
        namespace: null
      },
      changeType: 'modified',
      changes: [
        {
          path: 'rules[0].verbs',
          semanticType: 'spec',
          importance: 'critical',
          flags: ['security-related'],
          type: 'added',
          after: ['delete']
        }
      ],
      summary: {
        totalChanges: 1,
        byImportance: {
          critical: 1
        }
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
        totalChanges: 0
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
        totalChanges: 0
      }
    }
  ],
  stats: {
    totalResources: 6,
    byChangeType: {
      added: 1,
      removed: 1,
      modified: 4,
      unchanged: 0
    },
    byKind: {
      Deployment: 1,
      Service: 1,
      ConfigMap: 1,
      ClusterRole: 1,
      ServiceAccount: 1,
      Ingress: 1
    },
    byNamespace: {
      argocd: 5,
      '': 1 // cluster-scoped
    }
  }
};
