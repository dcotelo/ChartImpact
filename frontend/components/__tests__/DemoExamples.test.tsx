import { render, screen, fireEvent } from '@testing-library/react';
import { DemoExamples } from '../DemoExamples';

describe('DemoExamples', () => {
  const mockOnSelectExample = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders demo examples section', () => {
    render(<DemoExamples onSelectExample={mockOnSelectExample} />);
    
    expect(screen.getByText('📚 Demo Examples')).toBeInTheDocument();
    expect(screen.getByText(/Try these pre-configured examples/i)).toBeInTheDocument();
  });

  it('displays all example buttons', () => {
    render(<DemoExamples onSelectExample={mockOnSelectExample} />);
    
    // Check for example buttons
    expect(screen.getByText(/Example 1: Compare Two Release Tags/i)).toBeInTheDocument();
    expect(screen.getByText(/DataDog Helm Charts/i)).toBeInTheDocument();
    expect(screen.getByText(/Example 2: With Custom Values/i)).toBeInTheDocument();
    expect(screen.getByText(/Example 3: Compare with Values File/i)).toBeInTheDocument();
  });

  it('displays example descriptions', () => {
    render(<DemoExamples onSelectExample={mockOnSelectExample} />);
    
    expect(screen.getByText(/Compare two ArgoCD release versions/i)).toBeInTheDocument();
    expect(screen.getByText(/Compare DataDog chart versions in monorepo structure/i)).toBeInTheDocument();
    expect(screen.getByText(/Compare versions with custom values content/i)).toBeInTheDocument();
  });

  it('calls onSelectExample with correct data when example 1 is clicked', () => {
    render(<DemoExamples onSelectExample={mockOnSelectExample} />);
    
    const example1Button = screen.getByText(/Example 1: Compare Two Release Tags/i);
    fireEvent.click(example1Button);
    
    expect(mockOnSelectExample).toHaveBeenCalledTimes(1);
    expect(mockOnSelectExample).toHaveBeenCalledWith({
      repository: 'https://github.com/argoproj/argo-helm.git',
      chartPath: 'charts/argo-cd',
      version1: 'argo-cd-9.1.5',
      version2: 'argo-cd-9.1.6',
    });
  });

  it('calls onSelectExample with correct data when DataDog example is clicked', () => {
    render(<DemoExamples onSelectExample={mockOnSelectExample} />);
    
    const datadogButton = screen.getByText(/DataDog Helm Charts/i);
    fireEvent.click(datadogButton);
    
    expect(mockOnSelectExample).toHaveBeenCalledTimes(1);
    expect(mockOnSelectExample).toHaveBeenCalledWith({
      repository: 'https://github.com/DataDog/helm-charts.git',
      chartPath: 'charts/datadog',
      version1: 'datadog-3.0.0',
      version2: 'datadog-3.1.0',
    });
  });

  it('calls onSelectExample with values content when example 2 is clicked', () => {
    render(<DemoExamples onSelectExample={mockOnSelectExample} />);
    
    const example2Button = screen.getByText(/Example 2: With Custom Values/i);
    fireEvent.click(example2Button);
    
    expect(mockOnSelectExample).toHaveBeenCalledTimes(1);
    const call = mockOnSelectExample.mock.calls[0][0];
    expect(call.repository).toBe('https://github.com/argoproj/argo-helm.git');
    expect(call.chartPath).toBe('charts/argo-cd');
    expect(call.version1).toBe('main');
    expect(call.version2).toBe('main');
    expect(call.valuesContent).toContain('global:');
    expect(call.valuesContent).toContain('controller:');
    expect(call.valuesContent).toContain('replicas: 2');
  });

  it('calls onSelectExample with custom values file when example 3 is clicked', () => {
    render(<DemoExamples onSelectExample={mockOnSelectExample} />);
    
    const example3Button = screen.getByText(/Example 3: Compare with Values File/i);
    fireEvent.click(example3Button);
    
    expect(mockOnSelectExample).toHaveBeenCalledTimes(1);
    const call = mockOnSelectExample.mock.calls[0][0];
    expect(call.repository).toBe('https://github.com/argoproj/argo-helm.git');
    expect(call.version1).toBe('argo-cd-9.1.5');
    expect(call.version2).toBe('argo-cd-9.1.6');
    expect(call.valuesContent).toContain('controller:');
    expect(call.valuesContent).toContain('redis-ha:');
  });

  it('renders multiple example buttons', () => {
    render(<DemoExamples onSelectExample={mockOnSelectExample} />);
    
    // Find all buttons that contain "Example"
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('maintains button functionality after multiple clicks', () => {
    render(<DemoExamples onSelectExample={mockOnSelectExample} />);
    
    const example1Button = screen.getByText(/Example 1: Compare Two Release Tags/i);
    
    fireEvent.click(example1Button);
    fireEvent.click(example1Button);
    fireEvent.click(example1Button);
    
    expect(mockOnSelectExample).toHaveBeenCalledTimes(3);
  });

  it('has accessible button elements', () => {
    render(<DemoExamples onSelectExample={mockOnSelectExample} />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeInTheDocument();
    });
  });

  it('displays correct repository URLs in examples', () => {
    const mockCallback = jest.fn();
    render(<DemoExamples onSelectExample={mockCallback} />);
    
    const example1Button = screen.getByText(/Example 1: Compare Two Release Tags/i);
    fireEvent.click(example1Button);
    
    const calledData = mockCallback.mock.calls[0][0];
    expect(calledData.repository).toContain('github.com');
    expect(calledData.repository).toContain('.git');
  });

  it('displays correct chart paths in examples', () => {
    const mockCallback = jest.fn();
    render(<DemoExamples onSelectExample={mockCallback} />);
    
    const example1Button = screen.getByText(/Example 1: Compare Two Release Tags/i);
    fireEvent.click(example1Button);
    
    const calledData = mockCallback.mock.calls[0][0];
    expect(calledData.chartPath).toContain('charts/');
  });

  it('shows version tags in correct format', () => {
    const mockCallback = jest.fn();
    render(<DemoExamples onSelectExample={mockCallback} />);
    
    const example1Button = screen.getByText(/Example 1: Compare Two Release Tags/i);
    fireEvent.click(example1Button);
    
    const calledData = mockCallback.mock.calls[0][0];
    expect(calledData.version1).toBe('argo-cd-9.1.5');
    expect(calledData.version2).toBe('argo-cd-9.1.6');
  });
});
