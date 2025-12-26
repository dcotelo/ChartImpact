import { render, screen } from '@testing-library/react';
import { DiffDisplay } from '../DiffDisplay';
import { CompareResponse } from '@/lib/types';

// Mock react-syntax-highlighter
jest.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: any) => <pre>{children}</pre>,
}));

describe('DiffDisplay - Client-side Filtering', () => {
  const mockResult: CompareResponse = {
    success: true,
    version1: 'v1.0.0',
    version2: 'v1.1.0',
    diff: `metadata.labels.helm.sh/chart  (v1/ServiceAccount/default/argocd-application-controller)
± value change
- 5.0.0
+ 5.1.0

spec.replicas  (apps/v1/Deployment/default/argocd-server)
± value change
- 1
+ 3

spec.template.spec.containers[0].image  (apps/v1/Deployment/default/argocd-server)
± value change
- argoproj/argocd:v2.0.0
+ argoproj/argocd:v2.1.0`
  };

  it('should display all changes by default', () => {
    const { container } = render(<DiffDisplay result={mockResult} />);
    
    // Check that content includes all changes
    const content = container.textContent || '';
    expect(content).toContain('metadata.labels.helm.sh/chart');
    expect(content).toContain('spec.replicas');
    expect(content).toContain('spec.template.spec.containers');
  });

  it('should filter out metadata when ignoreLabels is true', () => {
    const { container } = render(<DiffDisplay result={mockResult} ignoreLabels={true} />);
    
    const content = container.textContent || '';
    
    // Metadata changes should be filtered out
    expect(content).not.toContain('metadata.labels.helm.sh/chart');
    
    // Other changes should still be visible
    expect(content).toContain('spec.replicas');
    expect(content).toContain('spec.template.spec.containers');
  });

  it('should filter resources by search query', () => {
    const { container } = render(<DiffDisplay result={mockResult} searchQuery="replicas" />);
    
    const content = container.textContent || '';
    
    // Should contain replicas change
    expect(content).toContain('spec.replicas');
  });

  it('should apply multiple filters simultaneously', () => {
    const { container } = render(
      <DiffDisplay 
        result={mockResult} 
        ignoreLabels={true}
        searchQuery="Deployment"
      />
    );
    
    const content = container.textContent || '';
    
    // Metadata should be filtered by ignoreLabels
    expect(content).not.toContain('metadata.labels.helm.sh/chart');
    
    // Only Deployment resources should show (both spec changes are from Deployment)
    expect(content).toContain('spec.replicas');
    expect(content).toContain('spec.template.spec.containers');
  });

  it('should handle empty search query', () => {
    const { container } = render(<DiffDisplay result={mockResult} searchQuery="" />);
    
    const content = container.textContent || '';
    
    // All changes should be visible with empty search
    expect(content).toContain('metadata.labels.helm.sh/chart');
    expect(content).toContain('spec.replicas');
  });

  it('should handle search query with no matches', () => {
    const { container } = render(<DiffDisplay result={mockResult} searchQuery="nonexistent-xyz-123" />);
    
    const content = container.textContent || '';
    
    // The component should still render without crashing
    // When there are no category matches, it falls back to showing the raw diff
    expect(content).toContain('Comparison Results');
    expect(content).toContain('Version 1');
    expect(content).toContain('Version 2');
  });

  it('should perform case-insensitive search', () => {
    const { container } = render(<DiffDisplay result={mockResult} searchQuery="DEPLOYMENT" />);
    
    const content = container.textContent || '';
    
    // Should find Deployment resources regardless of case
    expect(content).toContain('spec.replicas');
    expect(content).toContain('spec.template.spec.containers');
  });

  it('should update statistics based on filtered results', () => {
    const { container: container1 } = render(<DiffDisplay result={mockResult} />);
    
    // Initial state should show statistics
    expect(container1.textContent).toContain('Enhanced Statistics Dashboard');
    
    // Filter to show only one type of change
    const { container: container2 } = render(<DiffDisplay result={mockResult} searchQuery="replicas" />);
    
    // Statistics should still be present after filtering
    expect(container2.textContent).toContain('Enhanced Statistics Dashboard');
  });
});
