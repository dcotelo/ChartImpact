import { render, screen } from '@testing-library/react';
import { DiffExplorer } from '../explorer/DiffExplorer';
import { CompareResponse, DiffResultV2 } from '@/lib/types';
import { mockDiffResultV2 } from '@/lib/mock-data';

// Mock the child components
jest.mock('../explorer/ResourceList', () => ({
  ResourceList: () => <div data-testid="resource-list">Resource List</div>,
}));

jest.mock('../explorer/ViewPanel', () => ({
  ViewPanel: () => <div data-testid="view-panel">View Panel</div>,
}));

jest.mock('../explorer/DetailsPanel', () => ({
  DetailsPanel: () => <div data-testid="details-panel">Details Panel</div>,
}));

jest.mock('../explorer/SearchBar', () => ({
  SearchBar: () => <div data-testid="search-bar">Search Bar</div>,
}));

describe('DiffExplorer', () => {
  const mockResult: CompareResponse = {
    success: true,
    diff: '', // Empty diff - no data at all
    version1: 'v1.0.0',
    version2: 'v2.0.0',
  };

  it('should show blocking message when no comparison data is available', () => {
    render(<DiffExplorer result={mockResult} />);

    expect(screen.getByText(/No comparison data available/i)).toBeInTheDocument();
    expect(screen.getByText(/Please run a comparison first/i)).toBeInTheDocument();
  });

  it('should render explorer when structured diff is provided via result', () => {
    const resultWithStructuredDiff: CompareResponse = {
      ...mockResult,
      structuredDiff: mockDiffResultV2,
      structuredDiffAvailable: true,
    };

    render(<DiffExplorer result={resultWithStructuredDiff} />);

    expect(screen.getByText(/Impact Explorer/i)).toBeInTheDocument();
    expect(screen.getByTestId('resource-list')).toBeInTheDocument();
    expect(screen.getByTestId('view-panel')).toBeInTheDocument();
    expect(screen.queryByText(/not yet available/i)).not.toBeInTheDocument();
  });

  it('should render explorer when structured diff is provided via diffData prop', () => {
    render(<DiffExplorer result={mockResult} diffData={mockDiffResultV2} />);

    expect(screen.getByText(/Impact Explorer/i)).toBeInTheDocument();
    expect(screen.getByTestId('resource-list')).toBeInTheDocument();
    expect(screen.getByTestId('view-panel')).toBeInTheDocument();
    expect(screen.queryByText(/not yet available/i)).not.toBeInTheDocument();
  });

  it('should show demo mode badge when diffData prop is provided', () => {
    render(<DiffExplorer result={mockResult} diffData={mockDiffResultV2} />);

    expect(screen.getByText(/DEMO MODE/i)).toBeInTheDocument();
  });

  it('should not show demo mode badge when using result.structuredDiff', () => {
    const resultWithStructuredDiff: CompareResponse = {
      ...mockResult,
      structuredDiff: mockDiffResultV2,
      structuredDiffAvailable: true,
    };

    render(<DiffExplorer result={resultWithStructuredDiff} />);

    expect(screen.queryByText(/DEMO MODE/i)).not.toBeInTheDocument();
  });

  it('should display version information in header', () => {
    const resultWithStructuredDiff: CompareResponse = {
      ...mockResult,
      structuredDiff: mockDiffResultV2,
      structuredDiffAvailable: true,
    };

    render(<DiffExplorer result={resultWithStructuredDiff} />);

    expect(screen.getByText(/v1:/i)).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText(/v2:/i)).toBeInTheDocument();
    expect(screen.getByText('v2.0.0')).toBeInTheDocument();
  });

  it('should prefer diffData prop over result.structuredDiff', () => {
    const customDiffData: DiffResultV2 = {
      ...mockDiffResultV2,
      metadata: {
        ...mockDiffResultV2.metadata,
        compareId: 'custom-compare-id',
      },
    };

    const resultWithStructuredDiff: CompareResponse = {
      ...mockResult,
      structuredDiff: mockDiffResultV2,
      structuredDiffAvailable: true,
    };

    render(<DiffExplorer result={resultWithStructuredDiff} diffData={customDiffData} />);

    // Should show demo mode badge since diffData prop is provided
    expect(screen.getByText(/DEMO MODE/i)).toBeInTheDocument();
    expect(screen.getByText(/Impact Explorer/i)).toBeInTheDocument();
  });

  it('should handle empty resources gracefully', () => {
    const emptyDiffData: DiffResultV2 = {
      ...mockDiffResultV2,
      resources: [],
    };

    render(<DiffExplorer result={mockResult} diffData={emptyDiffData} />);

    expect(screen.getByText(/Impact Explorer/i)).toBeInTheDocument();
    expect(screen.getByText(/No resource changes detected/i)).toBeInTheDocument();
  });

  it('should convert plain text diff when structured diff not available', () => {
    const resultWithPlainDiff: CompareResponse = {
      success: true,
      diff: `metadata.labels.helm.sh/chart  (v1/ServiceAccount/default/test-sa)
        + added-label: value`,
      version1: 'v1.0.0',
      version2: 'v2.0.0',
    };

    render(<DiffExplorer result={resultWithPlainDiff} />);

    expect(screen.getByText(/Impact Explorer/i)).toBeInTheDocument();
    expect(screen.getByText(/ADAPTED FROM PLAIN DIFF/i)).toBeInTheDocument();
    expect(screen.getByTestId('resource-list')).toBeInTheDocument();
  });
});
