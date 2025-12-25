import { render, screen } from '@testing-library/react';
import { ProgressIndicator } from '../ProgressIndicator';

describe('ProgressIndicator', () => {
  it('renders with message', () => {
    render(<ProgressIndicator message="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with progress bar when steps are provided', () => {
    const { container } = render(
      <ProgressIndicator message="Step 2 of 4" step={2} totalSteps={4} />
    );
    
    // Should render progress bar
    const progressBar = container.querySelector('div[style*="width: 50%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('renders without progress bar when steps not provided', () => {
    const { container } = render(<ProgressIndicator message="Loading..." />);
    
    // Progress bar should not exist
    const progressBarContainer = container.querySelector('div[style*="height: 6px"]');
    expect(progressBarContainer).not.toBeInTheDocument();
  });
});
