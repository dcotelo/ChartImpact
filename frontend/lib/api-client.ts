/**
 * Shared API client utilities for making requests to the backend
 */

export interface APIResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Makes a POST request to the backend API
 */
export async function fetchAPI<TRequest, TResponse extends APIResponse>(
  endpoint: string,
  body: TRequest,
  options?: RequestInit
): Promise<TResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  
  const response = await fetch(`${apiUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `API request failed with status ${response.status}`);
  }

  return data as TResponse;
}

/**
 * Validates a repository URL format
 * Returns null if valid, error message if invalid
 */
export function validateRepository(repository: string): string | null {
  if (!repository) {
    return 'Repository URL is required';
  }
  
  if (!repository.match(/^(https?:\/\/|git@)/)) {
    return 'Invalid repository URL format. Please use HTTPS or SSH format.';
  }
  
  return null;
}
