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
    expect(screen.getByText(/ArgoCD Version Comparison/i)).toBeInTheDocument();
    expect(screen.getByText(/DataDog Monorepo/i)).toBeInTheDocument();
  });

  it('displays example descriptions', () => {
    render(<DemoExamples onSelectExample={mockOnSelectExample} />);
    
    expect(screen.getByText(/Compare two ArgoCD release versions/i)).toBeInTheDocument();
    expect(screen.getByText(/Compare DataDog chart versions in monorepo structure/i)).toBeInTheDocument();
  });

  it('calls onSelectExample with correct data when example 1 is clicked', () => {
    render(<DemoExamples onSelectExample={mockOnSelectExample} />);
    
    const example1Button = screen.getByText(/ArgoCD Version Comparison/i);
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
    
    const datadogButton = screen.getByText(/DataDog Monorepo/i);
    fireEvent.click(datadogButton);
    
    expect(mockOnSelectExample).toHaveBeenCalledTimes(1);
    expect(mockOnSelectExample).toHaveBeenCalledWith({
      repository: 'https://github.com/DataDog/helm-charts.git',
      chartPath: 'charts/datadog',
      version1: 'datadog-3.0.0',
      version2: 'datadog-3.1.0',
    });
  });

  it('renders multiple example buttons', () => {
    render(<DemoExamples onSelectExample={mockOnSelectExample} />);
    
    // Find all buttons that contain example names
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(2);
  });

  it('maintains button functionality after multiple clicks', () => {
    render(<DemoExamples onSelectExample={mockOnSelectExample} />);
    
    const example1Button = screen.getByText(/ArgoCD Version Comparison/i);
    
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
    
    const example1Button = screen.getByText(/ArgoCD Version Comparison/i);
    fireEvent.click(example1Button);
    
    const calledData = mockCallback.mock.calls[0][0];
    expect(calledData.repository).toContain('github.com');
    expect(calledData.repository).toContain('.git');
  });

  it('displays correct chart paths in examples', () => {
    const mockCallback = jest.fn();
    render(<DemoExamples onSelectExample={mockCallback} />);
    
    const example1Button = screen.getByText(/ArgoCD Version Comparison/i);
    fireEvent.click(example1Button);
    
    const calledData = mockCallback.mock.calls[0][0];
    expect(calledData.chartPath).toContain('charts/');
  });

  it('shows version tags in correct format', () => {
    const mockCallback = jest.fn();
    render(<DemoExamples onSelectExample={mockCallback} />);
    
    const example1Button = screen.getByText(/ArgoCD Version Comparison/i);
    fireEvent.click(example1Button);
    
    const calledData = mockCallback.mock.calls[0][0];
    expect(calledData.version1).toBe('argo-cd-9.1.5');
    expect(calledData.version2).toBe('argo-cd-9.1.6');
  });
});
