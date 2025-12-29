'use client';

import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import { CompareRequest } from '@/lib/types';
import { API_ENDPOINTS } from '@/lib/api-config';
import { VersionSelector } from './VersionSelector';

interface CompareFormProps {
  onSubmit: (data: CompareRequest) => void;
  loading: boolean;
  initialData?: CompareRequest;
}

interface VersionsResponse {
  success: boolean;
  tags?: string[];
  branches?: string[];
  error?: string;
}

const defaultFormData: CompareRequest = {
  repository: '',
  chartPath: 'charts/app',
  version1: '',
  version2: '',
  valuesFile: '',
  valuesContent: ''
};

export function CompareForm({ onSubmit, loading, initialData }: CompareFormProps) {
  const [formData, setFormData] = useState<CompareRequest>(() => initialData || defaultFormData);
  const [versions, setVersions] = useState<string[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        repository: initialData.repository || '',
        chartPath: initialData.chartPath || 'charts/app',
        version1: initialData.version1 || '',
        version2: initialData.version2 || '',
        valuesFile: initialData.valuesFile || '',
        valuesContent: initialData.valuesContent || ''
      });
    } else {
      setFormData({ ...defaultFormData });
    }
  }, [initialData]);

  const fetchVersions = useCallback(async (repository: string) => {
    if (!repository || !repository.match(/^(https?:\/\/|git@)/)) {
      setVersions([]);
      setVersionsError(null);
      return;
    }

    setLoadingVersions(true);
    setVersionsError(null);

    try {
      const response = await fetch(API_ENDPOINTS.versions, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repository }),
      });

      const data: VersionsResponse = await response.json();

      if (data.success) {
        // Combine tags and branches, prioritizing tags
        const allVersions = [
          ...(data.tags || []),
          ...(data.branches || [])
        ].filter(v => v && v.trim().length > 0); // Filter out empty strings
        
        if (allVersions.length > 0) {
          setVersions(allVersions);
          setVersionsError(null);
        } else {
          setVersions([]);
          setVersionsError('No tags or branches found in repository');
        }
      } else {
        setVersions([]);
        setVersionsError(data.error || 'Failed to fetch versions');
      }
    } catch (error: any) {
      console.error('Error fetching versions:', error);
      setVersions([]);
      setVersionsError(error.message || 'Failed to fetch versions');
    } finally {
      setLoadingVersions(false);
    }
  }, []);

  // Debounce repository URL changes to fetch versions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.repository) {
        fetchVersions(formData.repository);
      } else {
        setVersions([]);
        setVersionsError(null);
      }
    }, 1000); // Wait 1 second after user stops typing

    return () => clearTimeout(timeoutId);
  }, [formData.repository, fetchVersions]);


  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
      <div>
        <label style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontWeight: '600',
          color: '#333'
        }}>
          Repository URL *
        </label>
        <input
          type="text"
          value={formData.repository}
          onChange={(e) => setFormData({ ...formData, repository: e.target.value })}
          placeholder="https://github.com/user/repo.git"
          required
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '1rem'
          }}
        />
      </div>

      <div>
        <label style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontWeight: '600',
          color: '#333'
        }}>
          Chart Path *
        </label>
        <input
          type="text"
          value={formData.chartPath}
          onChange={(e) => setFormData({ ...formData, chartPath: e.target.value })}
          placeholder="charts/datadog or charts/datadog-operator"
          required
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '1rem'
          }}
        />
        <small style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginTop: '0.25rem' }}>
          Path to the Helm chart directory within the repository. For monorepos, use patterns like:
          <br />
          <code style={{ fontSize: '0.8rem', background: '#f5f5f5', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>
            charts/&lt;chart-name&gt;
          </code>
          {' '}(e.g., <code style={{ fontSize: '0.8rem', background: '#f5f5f5', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>charts/datadog</code>)
        </small>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <VersionSelector
          value={formData.version1}
          onChange={(v) => setFormData({ ...formData, version1: v })}
          versions={versions}
          loadingVersions={loadingVersions}
          versionsError={versionsError}
          label="Version 1 (Tag/Commit)"
        />
        
        <VersionSelector
          value={formData.version2}
          onChange={(v) => setFormData({ ...formData, version2: v })}
          versions={versions}
          loadingVersions={loadingVersions}
          versionsError={versionsError}
          label="Version 2 (Tag/Commit)"
        />
      </div>

      {/* Collapsible Optional Values Section */}
      <div>
        <button
          type="button"
          onClick={() => setShowOptionalFields(!showOptionalFields)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            background: '#f8f9fa',
            border: '1px solid #ddd',
            borderRadius: '6px',
            width: '100%',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
            color: '#333',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#e9ecef'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#f8f9fa'}
        >
          <span>{showOptionalFields ? '▼' : '▶'}</span>
          <span>Optional Values Configuration</span>
        </button>

        {showOptionalFields && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            background: '#fafafa',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#333'
              }}>
                Values File Path (Optional)
              </label>
              <input
                type="text"
                value={formData.valuesFile}
                onChange={(e) => setFormData({ ...formData, valuesFile: e.target.value })}
                placeholder="values/prod.yaml"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  backgroundColor: '#fff'
                }}
              />
              <small style={{ color: '#666', fontSize: '0.875rem' }}>
                Path to values file within the repository (relative to repo root)
              </small>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#333'
              }}>
                Or Paste Values Content (Optional)
              </label>
              <textarea
                value={formData.valuesContent}
                onChange={(e) => setFormData({ ...formData, valuesContent: e.target.value })}
                placeholder="replicaCount: 3&#10;image:&#10;  repository: nginx&#10;  tag: latest"
                rows={6}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontFamily: 'monospace',
                  backgroundColor: '#fff'
                }}
              />
              <small style={{ color: '#666', fontSize: '0.875rem' }}>
                YAML content for values file (takes precedence over values file path)
              </small>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '0.875rem 2rem',
          background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'opacity 0.2s'
        }}
      >
        {loading ? 'Analyzing...' : 'Analyze Impact'}
      </button>
    </form>
  );
}

