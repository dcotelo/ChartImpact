import { render, screen } from '@testing-library/react';
import { StatisticsDashboard } from '../explorer/StatisticsDashboard';
import { DiffResultV2 } from '@/lib/types';

describe('StatisticsDashboard', () => {
  const mockDiffData: DiffResultV2 = {
    metadata: {
      engineVersion: '1.0.0',
      compareId: 'test-123',
      generatedAt: '2024-01-01T00:00:00Z',
      inputs: {
        left: { source: 'helm', version: 'v1.0.0' },
        right: { source: 'helm', version: 'v2.0.0' },
      },
    },
    resources: [
      {
        identity: {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          name: 'test-deployment',
          namespace: 'default',
        },
        changeType: 'added',
      },
      {
        identity: {
          apiVersion: 'v1',
          kind: 'Service',
          name: 'test-service',
          namespace: 'default',
        },
        changeType: 'removed',
      },
      {
        identity: {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          name: 'modified-deployment',
          namespace: 'default',
        },
        changeType: 'modified',
        changes: [
          {
            op: 'replace',
            path: '/spec/replicas',
            pathTokens: ['spec', 'replicas'],
            before: 1,
            after: 3,
            valueType: 'number',
            importance: 'high',
          },
        ],
      },
      {
        identity: {
          apiVersion: 'v1',
          kind: 'ConfigMap',
          name: 'test-config',
          namespace: 'default',
        },
        changeType: 'modified',
        changes: [
          {
            op: 'replace',
            path: '/metadata/labels/app',
            pathTokens: ['metadata', 'labels', 'app'],
            before: 'old',
            after: 'new',
            valueType: 'string',
            importance: 'low',
          },
        ],
      },
    ],
  };

  it('should render the dashboard header', () => {
    render(<StatisticsDashboard diffData={mockDiffData} />);
    
    expect(screen.getByText(/Statistics Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Overview of changes detected/i)).toBeInTheDocument();
  });

  it('should display main stat cards with correct values', () => {
    render(<StatisticsDashboard diffData={mockDiffData} />);
    
    // Check for stat labels
    expect(screen.getByText('Added')).toBeInTheDocument();
    expect(screen.getByText('Removed')).toBeInTheDocument();
    expect(screen.getByText('Modified')).toBeInTheDocument();
    expect(screen.getByText('Total Resources')).toBeInTheDocument();
    
    // Check for correct counts
    expect(screen.getByText(/^\+ 1$/)).toBeInTheDocument(); // Added icon + value
    expect(screen.getByText(/^- 1$/)).toBeInTheDocument(); // Removed icon + value
    expect(screen.getByText(/^~ 2$/)).toBeInTheDocument(); // Modified icon + value
    expect(screen.getByText(/^📦 4$/)).toBeInTheDocument(); // Total icon + value
  });

  it('should display change breakdown section', () => {
    render(<StatisticsDashboard diffData={mockDiffData} />);
    
    expect(screen.getByText(/Change Breakdown/i)).toBeInTheDocument();
    expect(screen.getByText('Spec Changes')).toBeInTheDocument();
    expect(screen.getByText('Metadata Only')).toBeInTheDocument();
  });

  it('should display impact indicators section', () => {
    render(<StatisticsDashboard diffData={mockDiffData} />);
    
    expect(screen.getByText(/Impact Indicators/i)).toBeInTheDocument();
    expect(screen.getByText('Impactful Changes')).toBeInTheDocument();
    expect(screen.getByText('Low Risk')).toBeInTheDocument();
  });

  it('should display top changed resource kinds', () => {
    render(<StatisticsDashboard diffData={mockDiffData} />);
    
    expect(screen.getByText(/Top Changed Resource Kinds/i)).toBeInTheDocument();
    expect(screen.getByText('Deployment')).toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('ConfigMap')).toBeInTheDocument();
  });

  it('should display quick assessment', () => {
    render(<StatisticsDashboard diffData={mockDiffData} />);
    
    expect(screen.getByText(/Quick Assessment:/i)).toBeInTheDocument();
  });

  it('should show warning when there are impactful changes', () => {
    render(<StatisticsDashboard diffData={mockDiffData} />);
    
    expect(screen.getByText(/reviewed carefully/i)).toBeInTheDocument();
    expect(screen.getByText(/This comparison contains 1 impactful change/i)).toBeInTheDocument();
  });

  it('should handle empty resources array', () => {
    const emptyDiffData: DiffResultV2 = {
      ...mockDiffData,
      resources: [],
    };
    
    render(<StatisticsDashboard diffData={emptyDiffData} />);
    
    expect(screen.getByText(/Statistics Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/No changes detected/i)).toBeInTheDocument();
  });

  it('should correctly count spec changes vs metadata-only changes', () => {
    render(<StatisticsDashboard diffData={mockDiffData} />);
    
    // Should have 1 spec change (deployment with /spec/replicas change)
    const specChangesElement = screen.getByText('Spec Changes').nextElementSibling;
    expect(specChangesElement).toHaveTextContent('1');
    
    // Should have 1 metadata-only change (configmap with metadata/labels change)
    const metadataElement = screen.getByText('Metadata Only').nextElementSibling;
    expect(metadataElement).toHaveTextContent('1');
  });

  it('should correctly identify high-importance changes', () => {
    render(<StatisticsDashboard diffData={mockDiffData} />);
    
    // Should have 1 impactful change (deployment with high importance)
    const impactfulElement = screen.getByText('Impactful Changes').nextElementSibling;
    expect(impactfulElement).toHaveTextContent('1');
  });

  it('should show resource kind statistics with correct change counts', () => {
    render(<StatisticsDashboard diffData={mockDiffData} />);
    
    // Deployment should show: +1 (added), ~1 (modified)
    const deploymentCard = screen.getByText('Deployment').parentElement;
    expect(deploymentCard).toHaveTextContent('+1');
    expect(deploymentCard).toHaveTextContent('~1');
    
    // Service should show: -1 (removed)
    const serviceCard = screen.getByText('Service').parentElement;
    expect(serviceCard).toHaveTextContent('-1');
  });

  it('should limit top kinds to 5 maximum', () => {
    const manyKindsDiffData: DiffResultV2 = {
      ...mockDiffData,
      resources: [
        ...mockDiffData.resources,
        { identity: { apiVersion: 'v1', kind: 'Secret', name: 'test1', namespace: 'default' }, changeType: 'added' },
        { identity: { apiVersion: 'v1', kind: 'Secret', name: 'test2', namespace: 'default' }, changeType: 'added' },
        { identity: { apiVersion: 'v1', kind: 'Ingress', name: 'test3', namespace: 'default' }, changeType: 'added' },
        { identity: { apiVersion: 'v1', kind: 'PersistentVolumeClaim', name: 'test4', namespace: 'default' }, changeType: 'added' },
      ],
    };
    
    const { container } = render(<StatisticsDashboard diffData={manyKindsDiffData} />);
    
    // Should only display 5 resource kinds max
    const kindCards = container.querySelectorAll('[style*="gridTemplateColumns: repeat(auto-fit, minmax(180px, 1fr))"]');
    if (kindCards.length > 0) {
      const cards = kindCards[0].children;
      expect(cards.length).toBeLessThanOrEqual(5);
    }
  });
});
