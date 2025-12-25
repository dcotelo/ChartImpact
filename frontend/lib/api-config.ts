// API base URL - reads from environment variable
// In development: http://localhost:8080
// In production: set NEXT_PUBLIC_API_URL to your backend API URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const API_ENDPOINTS = {
  compare: `${API_BASE_URL}/api/compare`,
  versions: `${API_BASE_URL}/api/versions`,
  health: `${API_BASE_URL}/api/health`,
};
