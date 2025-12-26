'use client';

import { useState } from 'react';
import { DiffResultV2, ResourceDiffV2 } from '@/lib/types';

// Mock data demonstrating the DiffResultV2 structure
const mockDiffResultV2: DiffResultV2 = {
  metadata: {
    engineVersion: '1.0.0',
    compareId: 'demo-123',
    generatedAt: new Date().toISOString(),
    inputs: {
      left: {
        source: 'helm',
        chart: 'datadog',
        version: '3.0.0',
      },
      right: {
        source: 'helm',
        chart: 'datadog',
        version: '3.1.0',
      },
    },
    normalizationRules: ['ignoreLabels', 'ignoreAnnotations'],
  },
  resources: [
    {
      identity: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'datadog-agent',
        namespace: 'default',
      },
      changeType: 'modified',
      beforeHash: 'abc123',
      afterHash: 'def456',
      changes: [
        {
          op: 'replace',
          path: '.spec.replicas',
          pathTokens: ['spec', 'replicas'],
          before: 1,
          after: 3,
          valueType: 'int',
          semanticType: 'workload.replicas',
          changeCategory: 'workload',
          importance: 'high',
          flags: ['runtime-impact', 'scaling-change'],
        },
        {
          op: 'replace',
          path: '.spec.template.spec.containers[0].image',
          pathTokens: ['spec', 'template', 'spec', 'containers', 0, 'image'],
          before: 'datadog/agent:7.40.0',
          after: 'datadog/agent:7.41.0',
          valueType: 'string',
          semanticType: 'container.image',
          changeCategory: 'workload',
          importance: 'critical',
          flags: ['runtime-impact', 'rollout-trigger'],
        },
        {
          op: 'replace',
          path: '.spec.template.spec.containers[0].resources.limits.memory',
          pathTokens: ['spec', 'template', 'spec', 'containers', 0, 'resources', 'limits', 'memory'],
          before: '512Mi',
          after: '1Gi',
          valueType: 'string',
          semanticType: 'resources.memory',
          changeCategory: 'resources',
          importance: 'medium',
          flags: ['runtime-impact'],
        },
      ],
      summary: {
        totalChanges: 3,
        byImportance: {
          critical: 1,
          high: 1,
          medium: 1,
        },
        categories: ['workload', 'resources'],
      },
    },
    {
      identity: {
        apiVersion: 'v1',
        kind: 'Service',
        name: 'datadog-service',
        namespace: 'default',
      },
      changeType: 'modified',
      changes: [
        {
          op: 'replace',
          path: '.spec.ports[0].port',
          pathTokens: ['spec', 'ports', 0, 'port'],
          before: 8080,
          after: 8081,
          valueType: 'int',
          semanticType: 'service.port',
          changeCategory: 'networking',
          importance: 'high',
          flags: ['networking-change'],
        },
      ],
      summary: {
        totalChanges: 1,
        byImportance: {
          high: 1,
        },
        categories: ['networking'],
      },
    },
    {
      identity: {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        name: 'datadog-config',
        namespace: 'default',
      },
      changeType: 'added',
      changes: [],
    },
  ],
  stats: {
    resources: {
      added: 1,
      removed: 0,
      modified: 2,
    },
    changes: {
      total: 4,
    },
  },
};

export default function DemoPage() {
  const [selectedResource, setSelectedResource] = useState<ResourceDiffV2 | null>(null);
  const [selectedImportance, setSelectedImportance] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get all changes from all resources
  const allChanges = mockDiffResultV2.resources.flatMap((resource) =>
    (resource.changes || []).map((change) => ({
      ...change,
      resource: resource.identity,
    }))
  );

  // Filter changes based on selected criteria
  const filteredChanges = allChanges.filter((change) => {
    if (selectedImportance !== 'all' && change.importance !== selectedImportance) {
      return false;
    }
    if (selectedCategory !== 'all' && change.changeCategory !== selectedCategory) {
      return false;
    }
    return true;
  });

  // Get unique categories and importance levels
  const categories = Array.from(new Set(allChanges.map((c) => c.changeCategory).filter(Boolean)));
  const importanceLevels = Array.from(new Set(allChanges.map((c) => c.importance).filter(Boolean)));

  return (
    <main
      style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '2rem',
          borderRadius: '12px',
          color: 'white',
          marginBottom: '2rem',
        }}
      >
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          🚀 Explorer v2 Demo
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: '1rem' }}>
          Showcasing structured diff data (DiffResultV2) for advanced features
        </p>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
          }}
        >
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>✨ Features enabled by DiffResultV2:</strong>
          </p>
          <ul style={{ marginLeft: '1.5rem', lineHeight: '1.6' }}>
            <li>Path-level filtering and search</li>
            <li>Semantic grouping (workload, networking, etc.)</li>
            <li>Importance-based highlighting</li>
            <li>Summary graphs and change analytics</li>
          </ul>
        </div>
      </div>

      {/* Metadata Section */}
      <div
        style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#333' }}>📊 Metadata</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Engine Version</div>
            <div style={{ fontSize: '1rem', color: '#333', fontWeight: '500' }}>
              {mockDiffResultV2.metadata.engineVersion}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Compare ID</div>
            <div style={{ fontSize: '1rem', color: '#333', fontWeight: '500', fontFamily: 'monospace' }}>
              {mockDiffResultV2.metadata.compareId}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Left Version</div>
            <div style={{ fontSize: '1rem', color: '#333', fontWeight: '500' }}>
              {mockDiffResultV2.metadata.inputs.left.chart} v{mockDiffResultV2.metadata.inputs.left.version}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Right Version</div>
            <div style={{ fontSize: '1rem', color: '#333', fontWeight: '500' }}>
              {mockDiffResultV2.metadata.inputs.right.chart} v{mockDiffResultV2.metadata.inputs.right.version}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {mockDiffResultV2.stats && (
        <div
          style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '2rem',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#333' }}>📈 Statistics</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ padding: '1rem', background: '#e7f3ff', borderRadius: '6px', flex: '1 1 200px' }}>
              <div style={{ fontSize: '0.85rem', color: '#0066cc', marginBottom: '0.25rem' }}>Added</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0066cc' }}>
                {mockDiffResultV2.stats.resources.added}
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#fff3e0', borderRadius: '6px', flex: '1 1 200px' }}>
              <div style={{ fontSize: '0.85rem', color: '#f57c00', marginBottom: '0.25rem' }}>Modified</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f57c00' }}>
                {mockDiffResultV2.stats.resources.modified}
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#ffebee', borderRadius: '6px', flex: '1 1 200px' }}>
              <div style={{ fontSize: '0.85rem', color: '#c62828', marginBottom: '0.25rem' }}>Removed</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#c62828' }}>
                {mockDiffResultV2.stats.resources.removed}
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f5f5f5', borderRadius: '6px', flex: '1 1 200px' }}>
              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Total Changes</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333' }}>
                {mockDiffResultV2.stats.changes.total}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#333' }}>🔍 Filter Changes</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
              Importance Level
            </label>
            <select
              value={selectedImportance}
              onChange={(e) => setSelectedImportance(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Levels</option>
              {importanceLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
          Showing {filteredChanges.length} of {allChanges.length} changes
        </div>
      </div>

      {/* Resources and Changes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Resource List */}
        <div
          style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            maxHeight: '600px',
            overflowY: 'auto',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#333' }}>📦 Resources</h2>
          {mockDiffResultV2.resources.map((resource, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedResource(resource)}
              style={{
                padding: '1rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                marginBottom: '0.5rem',
                cursor: 'pointer',
                background: selectedResource === resource ? '#f0f0ff' : 'white',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                if (selectedResource !== resource) {
                  e.currentTarget.style.background = '#f9f9f9';
                }
              }}
              onMouseOut={(e) => {
                if (selectedResource !== resource) {
                  e.currentTarget.style.background = 'white';
                }
              }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#333', marginBottom: '0.25rem' }}>
                {resource.identity.kind} / {resource.identity.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>
                {resource.identity.namespace}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span
                  style={{
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    background:
                      resource.changeType === 'added'
                        ? '#e7f3ff'
                        : resource.changeType === 'removed'
                        ? '#ffebee'
                        : '#fff3e0',
                    color:
                      resource.changeType === 'added'
                        ? '#0066cc'
                        : resource.changeType === 'removed'
                        ? '#c62828'
                        : '#f57c00',
                    fontWeight: '500',
                  }}
                >
                  {resource.changeType}
                </span>
                {resource.summary && (
                  <span style={{ fontSize: '0.75rem', color: '#666' }}>
                    {resource.summary.totalChanges} changes
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Change Details */}
        <div
          style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            maxHeight: '600px',
            overflowY: 'auto',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#333' }}>🔧 Changes</h2>
          {filteredChanges.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              No changes match the selected filters
            </div>
          ) : (
            filteredChanges.map((change, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  background: '#fafafa',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                    {change.resource.kind} / {change.resource.name}
                  </div>
                  {change.importance && (
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        background:
                          change.importance === 'critical'
                            ? '#ffebee'
                            : change.importance === 'high'
                            ? '#fff3e0'
                            : '#e8f5e9',
                        color:
                          change.importance === 'critical'
                            ? '#c62828'
                            : change.importance === 'high'
                            ? '#f57c00'
                            : '#2e7d32',
                        fontWeight: '500',
                      }}
                    >
                      {change.importance}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
                  {change.path}
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ color: '#c62828', fontWeight: '500' }}>Before:</span>{' '}
                    <code style={{ background: '#ffebee', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>
                      {JSON.stringify(change.before)}
                    </code>
                  </div>
                  <div>
                    <span style={{ color: '#2e7d32', fontWeight: '500' }}>After:</span>{' '}
                    <code style={{ background: '#e8f5e9', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>
                      {JSON.stringify(change.after)}
                    </code>
                  </div>
                </div>
                {change.semanticType && (
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>
                    <strong>Semantic Type:</strong> {change.semanticType}
                  </div>
                )}
                {change.flags && change.flags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {change.flags.map((flag, fidx) => (
                      <span
                        key={fidx}
                        style={{
                          padding: '0.15rem 0.4rem',
                          background: '#e7f3ff',
                          color: '#0066cc',
                          fontSize: '0.7rem',
                          borderRadius: '3px',
                        }}
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Note */}
      <div
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: '#fffbf0',
          border: '1px solid #ffd966',
          borderRadius: '8px',
          fontSize: '0.9rem',
          color: '#856404',
        }}
      >
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>💡 Note:</strong> This demo uses mock data to showcase the DiffResultV2 structure.
        </p>
        <p>
          The backend already provides this structured diff format in the <code>structuredDiff</code> field of the
          CompareResponse. Explorer v2 can now consume this real data instead of mock data.
        </p>
      </div>
    </main>
  );
}
