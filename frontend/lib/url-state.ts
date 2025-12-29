/**
 * URL State Management for ChartImpact
 * 
 * Enables shareable links by encoding/decoding comparison parameters in URL.
 * Part of Phase 3: Landing & Entry improvements.
 * 
 * Based on: ux-revamp/IMPLEMENTATION_ROADMAP.md Phase 3.1
 */

import { CompareRequest } from './types';

/**
 * URL parameter keys for comparison state
 */
const URL_PARAMS = {
  repository: 'repo',
  chartPath: 'path',
  version1: 'v1',
  version2: 'v2',
  valuesFile: 'values',
  valuesContent: 'valuesContent',
} as const;

/**
 * Encode comparison request into URL search params
 */
export function encodeComparisonToURL(request: CompareRequest): string {
  const params = new URLSearchParams();
  
  if (request.repository) {
    params.set(URL_PARAMS.repository, request.repository);
  }
  
  if (request.chartPath) {
    params.set(URL_PARAMS.chartPath, request.chartPath);
  }
  
  if (request.version1) {
    params.set(URL_PARAMS.version1, request.version1);
  }
  
  if (request.version2) {
    params.set(URL_PARAMS.version2, request.version2);
  }
  
  if (request.valuesFile) {
    params.set(URL_PARAMS.valuesFile, request.valuesFile);
  }
  
  if (request.valuesContent) {
    // Note: Large values content may exceed URL length limits (2KB-8KB typically)
    // For production, consider alternative storage for large content
    params.set(URL_PARAMS.valuesContent, request.valuesContent);
  }
  
  return params.toString();
}

/**
 * Decode URL search params into comparison request
 * Returns null if required parameters are missing or invalid
 */
export function decodeComparisonFromURL(searchParams: URLSearchParams): Partial<CompareRequest> | null {
  const repo = searchParams.get(URL_PARAMS.repository);
  const path = searchParams.get(URL_PARAMS.chartPath);
  const v1 = searchParams.get(URL_PARAMS.version1);
  const v2 = searchParams.get(URL_PARAMS.version2);
  
  // Validate required parameters exist and are not empty strings
  if (!repo || !path || !v1 || !v2 || 
      repo.trim() === '' || path.trim() === '' || 
      v1.trim() === '' || v2.trim() === '') {
    return null;
  }
  
  const request: Partial<CompareRequest> = {
    repository: repo,
    chartPath: path,
    version1: v1,
    version2: v2,
  };
  
  const valuesFile = searchParams.get(URL_PARAMS.valuesFile);
  if (valuesFile) {
    request.valuesFile = valuesFile;
  }
  
  const valuesContent = searchParams.get(URL_PARAMS.valuesContent);
  if (valuesContent) {
    request.valuesContent = valuesContent;
  }
  
  return request;
}

/**
 * Update browser URL without page reload
 */
export function updateBrowserURL(request: CompareRequest): void {
  if (typeof window === 'undefined') return;
  
  const searchString = encodeComparisonToURL(request);
  const newURL = searchString ? `?${searchString}` : window.location.pathname;
  
  window.history.pushState({}, '', newURL);
}

/**
 * Get current URL search params
 */
export function getCurrentURLParams(): URLSearchParams {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }
  
  return new URLSearchParams(window.location.search);
}

/**
 * Build URL for analysis results page
 */
export function buildAnalysisURL(request: CompareRequest): string {
  const searchString = encodeComparisonToURL(request);
  return searchString ? `/analysis?${searchString}` : '/analysis';
}

/**
 * Create shareable URL for a comparison (always points to analysis page)
 */
export function createShareableURL(request: CompareRequest): string {
  if (typeof window === 'undefined') {
    return '';
  }
  
  const searchString = encodeComparisonToURL(request);
  const baseURL = `${window.location.protocol}//${window.location.host}/analysis`;
  
  return searchString ? `${baseURL}?${searchString}` : baseURL;
}
