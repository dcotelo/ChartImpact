/**
 * E2E Tests for Explorer - Regression Prevention
 * 
 * These tests ensure that Explorer is NEVER blocked when comparison data exists.
 * They run against a real browser and test the full integration flow.
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Mock the backend API response with structured diff data
 */
async function mockBackendWithStructuredDiff(page: Page) {
  await page.route('**/api/compare', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        diff: '--- old\n+++ new\n-old line\n+new line',
        version1: '1.0.0',
        version2: '1.1.0',
        structuredDiff: {
          metadata: {
            engineVersion: '1.0.0',
            compareId: 'e2e-test-123',
            generatedAt: new Date().toISOString(),
            inputs: {
              left: { source: 'helm', chart: 'test-chart', version: '1.0.0' },
              right: { source: 'helm', chart: 'test-chart', version: '1.1.0' }
            },
            normalizationRules: []
          },
          resources: [
            {
              identity: {
                apiVersion: 'apps/v1',
                kind: 'Deployment',
                name: 'test-app',
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
            },
            {
              identity: {
                apiVersion: 'v1',
                kind: 'Service',
                name: 'test-service',
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
        },
        structuredDiffAvailable: true
      })
    });
  });
}

/**
 * Mock the backend API response with only plain diff (no structured diff)
 */
async function mockBackendWithPlainDiffOnly(page: Page) {
  await page.route('**/api/compare', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        diff: `
--- /tmp/old/deployment.yaml
+++ /tmp/new/deployment.yaml
@@ -1,5 +1,5 @@
 apiVersion: apps/v1
 kind: Deployment
 metadata:
   name: test-app
-  replicas: 1
+  replicas: 3
        `,
        version1: '1.0.0',
        version2: '1.1.0',
        structuredDiffAvailable: false
      })
    });
  });
}

/**
 * Submit a comparison form
 */
async function submitComparison(page: Page) {
  await page.fill('input[placeholder*="Repository URL"]', 'https://github.com/test/repo.git');
  await page.fill('input[placeholder*="Chart path"]', 'charts/test-chart');
  await page.fill('input[placeholder*="Version 1"]', '1.0.0');
  await page.fill('input[placeholder*="Version 2"]', '1.1.0');
  
  // Click compare button
  await page.click('button:has-text("Compare Versions")');
  
  // Wait for comparison to complete
  await page.waitForTimeout(1000);
}

test.describe('Explorer - End-to-End Tests', () => {
  
  test.describe('With Structured Diff from Backend', () => {
    test('should render Explorer without blocking when backend provides structuredDiff', async ({ page }) => {
      await mockBackendWithStructuredDiff(page);
      
      await page.goto('/');
      await submitComparison(page);
      
      // Switch to Explorer tab
      await page.click('button:has-text("Explorer")');
      
      // CRITICAL: Explorer must render
      await expect(page.locator('text=/Impact Explorer/i')).toBeVisible();
      
      // CRITICAL: Blocking message must NOT appear
      await expect(page.locator('text=/No comparison data available/i')).not.toBeVisible();
      await expect(page.locator('text=/Please run a comparison first/i')).not.toBeVisible();
      
      // Should show version info
      await expect(page.locator('text=/1.0.0/')).toBeVisible();
      await expect(page.locator('text=/1.1.0/')).toBeVisible();
      
      // Should render resources
      await expect(page.locator('text=/Deployment/i').first()).toBeVisible();
      await expect(page.locator('text=/Service/i').first()).toBeVisible();
      
      // Should NOT show demo mode badge (using real backend data)
      await expect(page.locator('text=/DEMO MODE/i')).not.toBeVisible();
      
      // Should NOT show "adapted from plain diff" badge
      await expect(page.locator('text=/ADAPTED FROM PLAIN DIFF/i')).not.toBeVisible();
    });
    
    test('should display resource details and changes', async ({ page }) => {
      await mockBackendWithStructuredDiff(page);
      
      await page.goto('/');
      await submitComparison(page);
      await page.click('button:has-text("Explorer")');
      
      // Resource list should show both resources
      await expect(page.locator('text=/2 resource/i')).toBeVisible();
      
      // Click on deployment to view details
      await page.click('text=test-app');
      
      // Should show change details
      await expect(page.locator('text=/.spec.replicas/i')).toBeVisible();
      await expect(page.locator('text=/high/i')).toBeVisible();
    });
    
    test('should allow switching between Classic and Explorer views', async ({ page }) => {
      await mockBackendWithStructuredDiff(page);
      
      await page.goto('/');
      await submitComparison(page);
      
      // Initially on Classic view
      await expect(page.locator('text=/Classic View/i')).toBeVisible();
      
      // Switch to Explorer
      await page.click('button:has-text("Explorer")');
      await expect(page.locator('text=/Impact Explorer/i')).toBeVisible();
      await expect(page.locator('text=/Deployment/i').first()).toBeVisible();
      
      // Switch back to Classic
      await page.click('button:has-text("Classic View")');
      await expect(page.locator('text=/Classic View/i')).toBeVisible();
      
      // Switch to Explorer again - should still work
      await page.click('button:has-text("Explorer")');
      await expect(page.locator('text=/Impact Explorer/i')).toBeVisible();
      await expect(page.locator('text=/No comparison data available/i')).not.toBeVisible();
    });
  });
  
  test.describe('With Plain Diff Only (Backward Compatibility)', () => {
    test('should gracefully fallback to plain diff conversion when structuredDiff not available', async ({ page }) => {
      await mockBackendWithPlainDiffOnly(page);
      
      await page.goto('/');
      await submitComparison(page);
      
      // Switch to Explorer
      await page.click('button:has-text("Explorer")');
      
      // CRITICAL: Explorer must still render (fallback to plain diff converter)
      await expect(page.locator('text=/Impact Explorer/i')).toBeVisible();
      
      // CRITICAL: Blocking message must NOT appear
      await expect(page.locator('text=/No comparison data available/i')).not.toBeVisible();
      
      // Should show "adapted from plain diff" badge
      await expect(page.locator('text=/ADAPTED FROM PLAIN DIFF/i')).toBeVisible();
      
      // Should still attempt to render resources
      await expect(page.locator('text=/1.0.0/')).toBeVisible();
      await expect(page.locator('text=/1.1.0/')).toBeVisible();
    });
  });
  
  test.describe('Error Cases', () => {
    test('should only block when absolutely no comparison data exists', async ({ page }) => {
      // Mock empty response (no diff, no structuredDiff)
      await page.route('**/api/compare', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            version1: '1.0.0',
            version2: '1.1.0'
            // No diff, no structuredDiff
          })
        });
      });
      
      await page.goto('/');
      await submitComparison(page);
      await page.click('button:has-text("Explorer")');
      
      // This is the ONLY acceptable case for blocking
      await expect(page.locator('text=/No comparison data available/i')).toBeVisible();
      await expect(page.locator('text=/Please run a comparison first/i')).toBeVisible();
    });
    
    test('should handle backend errors gracefully', async ({ page }) => {
      await page.route('**/api/compare', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Backend error occurred'
          })
        });
      });
      
      await page.goto('/');
      await submitComparison(page);
      
      // Should show error message
      await expect(page.locator('text=/error/i')).toBeVisible();
    });
  });
  
  test.describe('Regression Prevention', () => {
    test('CRITICAL: Explorer must NEVER block when structuredDiff exists', async ({ page }) => {
      await mockBackendWithStructuredDiff(page);
      
      await page.goto('/');
      await submitComparison(page);
      await page.click('button:has-text("Explorer")');
      
      // These assertions must NEVER fail
      const blockingMessages = [
        'No comparison data available',
        'Please run a comparison first',
        'structured diff not available',
        'Structured diff is required',
        'Explorer is not available'
      ];
      
      for (const message of blockingMessages) {
        await expect(page.locator(`text=/${message}/i`)).not.toBeVisible();
      }
      
      // Must render successfully
      await expect(page.locator('text=/Impact Explorer/i')).toBeVisible();
    });
    
    test('CRITICAL: Explorer must NEVER block when plain diff exists', async ({ page }) => {
      await mockBackendWithPlainDiffOnly(page);
      
      await page.goto('/');
      await submitComparison(page);
      await page.click('button:has-text("Explorer")');
      
      // Must not block with plain diff
      await expect(page.locator('text=/No comparison data available/i')).not.toBeVisible();
      await expect(page.locator('text=/Impact Explorer/i')).toBeVisible();
    });
    
    test('CRITICAL: Both Classic and Explorer must use the same comparison data', async ({ page }) => {
      await mockBackendWithStructuredDiff(page);
      
      await page.goto('/');
      await submitComparison(page);
      
      // Verify Classic view shows data
      await expect(page.locator('text=/1.0.0/')).toBeVisible();
      await expect(page.locator('text=/1.1.0/')).toBeVisible();
      
      // Switch to Explorer
      await page.click('button:has-text("Explorer")');
      
      // Explorer must show the same versions (same data source)
      await expect(page.locator('text=/1.0.0/')).toBeVisible();
      await expect(page.locator('text=/1.1.0/')).toBeVisible();
      await expect(page.locator('text=/Impact Explorer/i')).toBeVisible();
    });
  });
  
  test.describe('Demo Mode vs Real Data', () => {
    test('should NOT show demo mode badge when using real backend data', async ({ page }) => {
      await mockBackendWithStructuredDiff(page);
      
      await page.goto('/');
      await submitComparison(page);
      await page.click('button:has-text("Explorer")');
      
      // Real backend data - no demo badge
      await expect(page.locator('text=/DEMO MODE/i')).not.toBeVisible();
    });
    
    test('should show demo mode badge only on /demo route', async ({ page }) => {
      await page.goto('/demo');
      
      // Demo route should show DEMO MODE badge
      await expect(page.locator('text=/DEMO MODE/i')).toBeVisible();
      await expect(page.locator('text=/Impact Explorer/i')).toBeVisible();
    });
  });
});
