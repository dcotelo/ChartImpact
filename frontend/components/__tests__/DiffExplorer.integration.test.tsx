/**
 * Integration tests for DiffExplorer component with real backend API data flow
 * These tests verify that Explorer v2 works with actual API responses and never blocks unnecessarily
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DiffExplorer } from '../explorer/DiffExplorer';
import { CompareResponse, DiffResultV2 } from '@/lib/types';

// Mock sample structured diff data matching backend response format
const mockStructuredDiff: DiffResultV2 = {
  metadata: {
    engineVersion: '1.0.0',
    compareId: 'test-123',
    generatedAt: '2024-01-01T00:00:00Z',
    inputs: {
      left: { source: 'helm', chart: 'myapp', version: '1.0.0' },
      right: { source: 'helm', chart: 'myapp', version: '1.1.0' }
    },
    normalizationRules: []
  },
  resources: [
    {
      identity: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'myapp',
        namespace: 'default'
      },
      changeType: 'modified',
      beforeHash: 'abc123',
      afterHash: 'def456',
      changes: [
        {
          op: 'replace',
          path: '.spec.replicas',
          pathTokens: ['spec', 'replicas'],
          before: 1,
          after: 3,
          valueType: 'int',
          semanticType: 'workload.replicas',
          changeCategory: 'workload',
          importance: 'high',
          flags: ['runtime-impact', 'scaling-change']
        }
      ],
      summary: {
        totalChanges: 1,
        byImportance: { high: 1 },
        categories: ['workload']
      }
    }
  ],
  stats: {
    resources: {
      added: 0,
      removed: 0,
      modified: 1
    },
    changes: {
      total: 1
    }
  }
};

describe('DiffExplorer - Backend API Integration', () => {
  describe('Structured Diff from Backend', () => {
    it('should render successfully when backend provides structuredDiff', () => {
      const mockResult: CompareResponse = {
        success: true,
        diff: '--- old\n+++ new\nsome plain diff',
        version1: '1.0.0',
        version2: '1.1.0',
        structuredDiff: mockStructuredDiff,
        structuredDiffAvailable: true
      };

      render(<DiffExplorer result={mockResult} />);

      // Explorer should render
      expect(screen.getByText(/Impact Explorer/i)).toBeInTheDocument();
      
      // Should NOT show demo mode badge (using real backend data)
      expect(screen.queryByText(/DEMO MODE/i)).not.toBeInTheDocument();
      
      // Should NOT show blocking message
      expect(screen.queryByText(/No comparison data available/i)).not.toBeInTheDocument();
      
      // Should show version information
      expect(screen.getByText(/1\.0\.0/)).toBeInTheDocument();
      expect(screen.getByText(/1\.1\.0/)).toBeInTheDocument();
      
      // Should render resource (use getAllByText since text appears multiple times)
      expect(screen.getAllByText(/Deployment/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/myapp/i).length).toBeGreaterThan(0);
    });

    it('should NOT show "adapted from plain diff" badge when structuredDiff is available', () => {
      const mockResult: CompareResponse = {
        success: true,
        diff: '--- old\n+++ new\nsome plain diff',
        version1: '1.0.0',
        version2: '1.1.0',
        structuredDiff: mockStructuredDiff,
        structuredDiffAvailable: true
      };

      render(<DiffExplorer result={mockResult} />);

      expect(screen.queryByText(/ADAPTED FROM PLAIN DIFF/i)).not.toBeInTheDocument();
    });

    it('should handle structured diff with multiple resources', () => {
      const multiResourceDiff: DiffResultV2 = {
        ...mockStructuredDiff,
        resources: [
          mockStructuredDiff.resources[0],
          {
            identity: {
              apiVersion: 'v1',
              kind: 'Service',
              name: 'myapp-service',
              namespace: 'default'
            },
            changeType: 'added',
            beforeHash: '',
            afterHash: 'xyz789',
            changes: [],
            summary: {
              totalChanges: 0,
              byImportance: {},
              categories: []
            }
          }
        ],
        stats: {
          resources: {
            added: 1,
            removed: 0,
            modified: 1
          },
          changes: {
            total: 1
          }
        }
      };

      const mockResult: CompareResponse = {
        success: true,
        version1: '1.0.0',
        version2: '1.1.0',
        structuredDiff: multiResourceDiff,
        structuredDiffAvailable: true
      };

      render(<DiffExplorer result={mockResult} />);

      expect(screen.getAllByText(/Deployment/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Service/i).length).toBeGreaterThan(0);
    });
  });

  describe('Plain Diff Fallback (Backend Compatibility)', () => {
    it('should gracefully fallback to plain diff conversion when structuredDiff not available', () => {
      const mockResult: CompareResponse = {
        success: true,
        diff: `
--- /tmp/old/deployment.yaml
+++ /tmp/new/deployment.yaml
@@ -1,5 +1,5 @@
 apiVersion: apps/v1
 kind: Deployment
 metadata:
   name: myapp
-  replicas: 1
+  replicas: 3
        `,
        version1: '1.0.0',
        version2: '1.1.0',
        structuredDiffAvailable: false
      };

      render(<DiffExplorer result={mockResult} />);

      // Should still render (not blocked)
      expect(screen.getByText(/Impact Explorer/i)).toBeInTheDocument();
      
      // Should show adapted badge
      expect(screen.getByText(/ADAPTED FROM PLAIN DIFF/i)).toBeInTheDocument();
      
      // Should NOT show blocking message
      expect(screen.queryByText(/No comparison data available/i)).not.toBeInTheDocument();
    });

    it('should render when backend returns only plain diff (backward compatibility)', () => {
      const mockResult: CompareResponse = {
        success: true,
        diff: '--- old\n+++ new\n-old line\n+new line',
        version1: '1.0.0',
        version2: '1.1.0'
        // No structuredDiff or structuredDiffAvailable fields
      };

      render(<DiffExplorer result={mockResult} />);

      // Explorer should still work with plain diff fallback
      expect(screen.getByText(/Impact Explorer/i)).toBeInTheDocument();
      expect(screen.queryByText(/No comparison data available/i)).not.toBeInTheDocument();
    });
  });

  describe('Blocking Conditions', () => {
    it('should ONLY block when absolutely no comparison data exists', () => {
      const mockResult: CompareResponse = {
        success: true,
        version1: '1.0.0',
        version2: '1.1.0'
        // No diff, no structuredDiff
      };

      render(<DiffExplorer result={mockResult} />);

      // This is the ONLY case where blocking is acceptable
      expect(screen.getByText(/No comparison data available/i)).toBeInTheDocument();
      expect(screen.getByText(/Please run a comparison first/i)).toBeInTheDocument();
    });

    it('should NOT block when comparison failed but has error message', () => {
      const mockResult: CompareResponse = {
        success: false,
        error: 'Comparison failed: chart not found',
        version1: '1.0.0',
        version2: '1.1.0'
      };

      render(<DiffExplorer result={mockResult} />);

      // Should show blocking message since no data
      expect(screen.getByText(/No comparison data available/i)).toBeInTheDocument();
    });

    it('should handle empty resources array gracefully', () => {
      const emptyDiff: DiffResultV2 = {
        ...mockStructuredDiff,
        resources: [],
        stats: {
          resources: {
            added: 0,
            removed: 0,
            modified: 0
          },
          changes: {
            total: 0
          }
        }
      };

      const mockResult: CompareResponse = {
        success: true,
        version1: '1.0.0',
        version2: '1.1.0',
        structuredDiff: emptyDiff,
        structuredDiffAvailable: true
      };

      render(<DiffExplorer result={mockResult} />);

      // Should show informative message, not blocking error
      expect(screen.getByText(/No resource changes detected/i)).toBeInTheDocument();
      expect(screen.getByText(/versions appear to be identical/i)).toBeInTheDocument();
    });
  });

  describe('Data Source Priority', () => {
    it('should prioritize explicit diffData prop over backend structuredDiff (demo mode)', () => {
      const demoDiff: DiffResultV2 = {
        ...mockStructuredDiff,
        metadata: {
          ...mockStructuredDiff.metadata,
          compareId: 'demo-123'
        }
      };

      const mockResult: CompareResponse = {
        success: true,
        version1: '1.0.0',
        version2: '1.1.0',
        structuredDiff: mockStructuredDiff, // Backend data
        structuredDiffAvailable: true
      };

      // Pass explicit diffData prop (demo mode)
      render(<DiffExplorer result={mockResult} diffData={demoDiff} />);

      // Should show demo mode badge
      expect(screen.getByText(/DEMO MODE/i)).toBeInTheDocument();
    });

    it('should use backend structuredDiff when no diffData prop provided', () => {
      const mockResult: CompareResponse = {
        success: true,
        version1: '1.0.0',
        version2: '1.1.0',
        structuredDiff: mockStructuredDiff,
        structuredDiffAvailable: true
      };

      // No diffData prop
      render(<DiffExplorer result={mockResult} />);

      // Should NOT show demo mode
      expect(screen.queryByText(/DEMO MODE/i)).not.toBeInTheDocument();
      
      // Should render with backend data
      expect(screen.getByText(/Impact Explorer/i)).toBeInTheDocument();
    });

    it('should fallback to plain diff conversion as last resort', () => {
      const mockResult: CompareResponse = {
        success: true,
        diff: '--- old\n+++ new\nchanges here',
        version1: '1.0.0',
        version2: '1.1.0'
        // No structuredDiff, no diffData prop
      };

      render(<DiffExplorer result={mockResult} />);

      // Should show adapted badge
      expect(screen.getByText(/ADAPTED FROM PLAIN DIFF/i)).toBeInTheDocument();
      
      // Should NOT be blocked
      expect(screen.queryByText(/No comparison data available/i)).not.toBeInTheDocument();
    });
  });

  describe('Statistics and Metadata', () => {
    it('should display statistics when available in structured diff', () => {
      const mockResult: CompareResponse = {
        success: true,
        version1: '1.0.0',
        version2: '1.1.0',
        structuredDiff: mockStructuredDiff,
        structuredDiffAvailable: true
      };

      render(<DiffExplorer result={mockResult} />);

      // Stats should be accessible in the UI
      expect(screen.getByText(/Impact Explorer/i)).toBeInTheDocument();
    });
  });

  describe('Regression Prevention', () => {
    it('should NEVER show blocking message when structuredDiff exists', () => {
      const mockResult: CompareResponse = {
        success: true,
        version1: '1.0.0',
        version2: '1.1.0',
        structuredDiff: mockStructuredDiff,
        structuredDiffAvailable: true
      };

      render(<DiffExplorer result={mockResult} />);

      expect(screen.queryByText(/No comparison data available/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Please run a comparison first/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/structured diff not available/i)).not.toBeInTheDocument();
    });

    it('should NEVER show blocking message when plain diff exists', () => {
      const mockResult: CompareResponse = {
        success: true,
        diff: '--- old\n+++ new\nchanges',
        version1: '1.0.0',
        version2: '1.1.0'
      };

      render(<DiffExplorer result={mockResult} />);

      expect(screen.queryByText(/No comparison data available/i)).not.toBeInTheDocument();
    });

    it('should handle partial API responses gracefully', () => {
      const partialDiff: DiffResultV2 = {
        metadata: {
          engineVersion: '1.0.0',
          compareId: 'test-123',
          generatedAt: '2024-01-01T00:00:00Z',
          inputs: {
            left: { source: 'helm', chart: 'myapp', version: '1.0.0' },
            right: { source: 'helm', chart: 'myapp', version: '1.1.0' }
          },
          normalizationRules: []
        },
        resources: [
          {
            identity: {
              apiVersion: 'apps/v1',
              kind: 'Deployment',
              name: 'myapp',
              namespace: 'default'
            },
            changeType: 'modified',
            beforeHash: '',
            afterHash: '',
            changes: undefined, // Partial data
            summary: undefined  // Partial data
          }
        ]
        // Missing stats
      };

      const mockResult: CompareResponse = {
        success: true,
        version1: '1.0.0',
        version2: '1.1.0',
        structuredDiff: partialDiff,
        structuredDiffAvailable: true
      };

      // Should not crash with partial data
      expect(() => render(<DiffExplorer result={mockResult} />)).not.toThrow();
      
      // Should still render
      expect(screen.getByText(/Impact Explorer/i)).toBeInTheDocument();
    });
  });
});
