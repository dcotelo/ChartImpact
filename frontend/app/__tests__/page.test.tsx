import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../page';

// Mock fetch
global.fetch = jest.fn();

describe('Home Page - Metadata Filter', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should not show metadata filter checkbox before comparison', () => {
    render(<Home />);
    
    // Checkbox should not be visible before results
    expect(screen.queryByLabelText(/ignore metadata\/tag updates/i)).not.toBeInTheDocument();
  });

  it('should show metadata filter checkbox after successful comparison', async () => {
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        diff: 'metadata.labels.app  (Deployment/default/test)\n± value change\n- old-value\n+ new-value\n',
        version1: 'v1.0.0',
        version2: 'v1.1.0',
      }),
    });

    render(<Home />);

    // Fill in the form
    await act(async () => {
      await user.type(screen.getByPlaceholderText(/github.com\/user\/repo/i), 'https://github.com/test/repo.git');
      const versionInputs = screen.getAllByPlaceholderText('Enter version manually');
      await user.type(versionInputs[0], 'v1.0.0');
      await user.type(versionInputs[1], 'v1.1.0');
    });

    // Submit the form
    await act(async () => {
      const submitButtons = screen.getAllByRole('button', { name: /compare versions/i });
      // Click the form submit button (last one, not demo examples)
      await user.click(submitButtons[submitButtons.length - 1]);
    });

    // Wait for results to appear
    await waitFor(() => {
      expect(screen.getByText(/comparison results/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Checkbox should now be visible
    expect(screen.getByLabelText(/ignore metadata\/tag updates/i)).toBeInTheDocument();
  });

  it('should not send ignoreLabels to backend API', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        diff: 'some diff',
        version1: 'v1.0.0',
        version2: 'v1.1.0',
      }),
    });

    render(<Home />);

    await act(async () => {
      await user.type(screen.getByPlaceholderText(/github.com\/user\/repo/i), 'https://github.com/test/repo.git');
      const versionInputs = screen.getAllByPlaceholderText('Enter version manually');
      await user.type(versionInputs[0], 'v1.0.0');
      await user.type(versionInputs[1], 'v1.1.0');
      const submitButtons = screen.getAllByRole('button', { name: /compare versions/i });
      await user.click(submitButtons[submitButtons.length - 1]);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Check that the API call does not include ignoreLabels
    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const apiCall = fetchCalls.find(call => call[0]?.includes('/api/compare'));
    
    if (apiCall && apiCall[1]?.body) {
      const requestBody = JSON.parse(apiCall[1].body);
      expect(requestBody).not.toHaveProperty('ignoreLabels');
    }
  });

  it('should toggle checkbox state without triggering new API call', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        diff: 'metadata.labels.app  (Deployment/default/test)\n± value change\n- old-value\n+ new-value\n',
        version1: 'v1.0.0',
        version2: 'v1.1.0',
      }),
    });

    render(<Home />);

    // Submit form and get results
    await act(async () => {
      await user.type(screen.getByPlaceholderText(/github.com\/user\/repo/i), 'https://github.com/test/repo.git');
      const versionInputs = screen.getAllByPlaceholderText('Enter version manually');
      await user.type(versionInputs[0], 'v1.0.0');
      await user.type(versionInputs[1], 'v1.1.0');
      const submitButtons = screen.getAllByRole('button', { name: /compare versions/i });
      await user.click(submitButtons[submitButtons.length - 1]);
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/ignore metadata\/tag updates/i)).toBeInTheDocument();
    });

    // Clear fetch mock to verify no new calls
    (global.fetch as jest.Mock).mockClear();

    // Toggle the checkbox
    const checkbox = screen.getByLabelText(/ignore metadata\/tag updates/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    
    await act(async () => {
      await user.click(checkbox);
    });

    // Verify checkbox is now checked
    expect(checkbox.checked).toBe(true);

    // Verify no new API calls were made
    expect(global.fetch).not.toHaveBeenCalled();

    // Toggle back
    await act(async () => {
      await user.click(checkbox);
    });

    expect(checkbox.checked).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
