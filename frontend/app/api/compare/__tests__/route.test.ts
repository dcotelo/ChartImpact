/**
 * Tests for the compare API route
 * Verifies that structuredDiff and related fields are properly forwarded from backend
 */

/**
 * @jest-environment node
 */

import { POST } from '../route';
import { CompareResponse } from '@/lib/types';

// Mock fetch globally
global.fetch = jest.fn();

// Helper to create mock NextRequest
function createMockRequest(body: any) {
  return {
    json: async () => body,
  } as any;
}

describe('Compare API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080';
  });

  describe('Structured Diff Forwarding', () => {
    it('should forward structuredDiff field from backend response', async () => {
      const mockBackendResponse = {
        success: true,
        diff: '--- old\n+++ new',
        structuredDiff: {
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
              beforeHash: 'abc',
              afterHash: 'def',
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
                  flags: ['runtime-impact']
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
            resources: { added: 0, removed: 0, modified: 1 },
            changes: { total: 1 }
          }
        },
        structuredDiffAvailable: true
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse
      });

      const request = createMockRequest({
        repository: 'https://github.com/test/repo.git',
        chartPath: 'charts/myapp',
        version1: '1.0.0',
        version2: '1.1.0'
      });

      const response = await POST(request);
      const data: CompareResponse = await response.json();

      // CRITICAL: structuredDiff must be forwarded
      expect(data.structuredDiff).toBeDefined();
      expect(data.structuredDiff?.metadata.compareId).toBe('test-123');
      expect(data.structuredDiff?.resources).toHaveLength(1);
      expect(data.structuredDiff?.resources[0].identity.kind).toBe('Deployment');
      
      // CRITICAL: structuredDiffAvailable flag must be forwarded
      expect(data.structuredDiffAvailable).toBe(true);
      
      // Traditional fields should also be present
      expect(data.success).toBe(true);
      expect(data.diff).toBeDefined();
      expect(data.version1).toBe('1.0.0');
      expect(data.version2).toBe('1.1.0');
    });

    it('should handle backend response without structuredDiff', async () => {
      const mockBackendResponse = {
        success: true,
        diff: '--- old\n+++ new',
        structuredDiffAvailable: false
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse
      });

      const request = createMockRequest({
        repository: 'https://github.com/test/repo.git',
        chartPath: 'charts/myapp',
        version1: '1.0.0',
        version2: '1.1.0'
      });

      const response = await POST(request);
      const data: CompareResponse = await response.json();

      expect(data.success).toBe(true);
      expect(data.structuredDiff).toBeUndefined();
      expect(data.structuredDiffAvailable).toBe(false);
      expect(data.diff).toBeDefined();
    });

    it('should forward statistics field when available', async () => {
      const mockBackendResponse = {
        success: true,
        diff: '--- old\n+++ new',
        statistics: {
          totalChanges: 5,
          addedResources: 1,
          modifiedResources: 3,
          removedResources: 1
        },
        structuredDiffAvailable: false
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse
      });

      const request = createMockRequest({
        repository: 'https://github.com/test/repo.git',
        chartPath: 'charts/myapp',
        version1: '1.0.0',
        version2: '1.1.0'
      });

      const response = await POST(request);
      const data: CompareResponse = await response.json();

      expect(data.statistics).toBeDefined();
      expect(data.statistics?.summary.totalChanges).toBe(5);
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with minimal backend response (classic mode)', async () => {
      const mockBackendResponse = {
        success: true,
        diff: '--- old\n+++ new\nsome changes'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse
      });

      const request = createMockRequest({
        repository: 'https://github.com/test/repo.git',
        chartPath: 'charts/myapp',
        version1: '1.0.0',
        version2: '1.1.0'
      });

      const response = await POST(request);
      const data: CompareResponse = await response.json();

      expect(data.success).toBe(true);
      expect(data.diff).toBeDefined();
      expect(data.version1).toBe('1.0.0');
      expect(data.version2).toBe('1.1.0');
    });
  });

  describe('Request Validation', () => {
    it('should validate required fields', async () => {
      const request = createMockRequest({
        repository: 'https://github.com/test/repo.git',
        // Missing chartPath, version1, version2
      });

      const response = await POST(request);
      const data: CompareResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required fields');
    });

    it('should validate repository URL format', async () => {
      const request = createMockRequest({
        repository: 'invalid-url',
        chartPath: 'charts/myapp',
        version1: '1.0.0',
        version2: '1.1.0'
      });

      const response = await POST(request);
      const data: CompareResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid repository URL');
    });
  });

  describe('Error Handling', () => {
    it('should handle backend errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Chart not found' })
      });

      const request = createMockRequest({
        repository: 'https://github.com/test/repo.git',
        chartPath: 'charts/myapp',
        version1: '1.0.0',
        version2: '1.1.0'
      });

      const response = await POST(request);
      const data: CompareResponse = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const request = createMockRequest({
        repository: 'https://github.com/test/repo.git',
        chartPath: 'charts/myapp',
        version1: '1.0.0',
        version2: '1.1.0'
      });

      const response = await POST(request);
      const data: CompareResponse = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Network error');
    });
  });

  describe('Regression Prevention', () => {
    it('CRITICAL: must never drop structuredDiff from backend response', async () => {
      const mockBackendResponse = {
        success: true,
        diff: '--- old\n+++ new',
        structuredDiff: {
          metadata: { engineVersion: '1.0.0', compareId: 'test', generatedAt: '2024-01-01T00:00:00Z', inputs: { left: {}, right: {} }, normalizationRules: [] },
          resources: [],
          stats: { resources: { added: 0, removed: 0, modified: 0 }, changes: { total: 0 } }
        },
        structuredDiffAvailable: true
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse
      });

      const request = createMockRequest({
        repository: 'https://github.com/test/repo.git',
        chartPath: 'charts/myapp',
        version1: '1.0.0',
        version2: '1.1.0'
      });

      const response = await POST(request);
      const data: CompareResponse = await response.json();

      // These assertions must NEVER fail
      expect(data.structuredDiff).toBeDefined();
      expect(data.structuredDiffAvailable).toBe(true);
    });
  });
});

