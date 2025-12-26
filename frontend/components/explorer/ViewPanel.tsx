'use client';

import { ResourceDiff, Change } from '@/lib/types';
import { useMemo } from 'react';

interface ViewPanelProps {
  resources: ResourceDiff[];
  searchQuery: string;
  filters: {
    changeType: string[];
    kind: string[];
    namespace: string[];
    importance: string[];
  };
  viewMode: 'tree' | 'table' | 'sidebyside';
  onViewModeChange: (mode: 'tree' | 'table' | 'sidebyside') => void;
  selectedResource: string | null;
}

export function ViewPanel({
  resources,
  searchQuery,
  filters,
  viewMode,
  onViewModeChange,
  selectedResource
}: ViewPanelProps) {
  // Filter resources
  const filteredResources = useMemo(() => {
    return resources.filter(resource => {
      if (filters.changeType.length > 0 && !filters.changeType.includes(resource.changeType)) {
        return false;
      }
      if (filters.kind.length > 0 && !filters.kind.includes(resource.identity.kind)) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = resource.identity.name.toLowerCase().includes(query);
        const matchesKind = resource.identity.kind.toLowerCase().includes(query);
        return matchesName || matchesKind;
      }
      return true;
    });
  }, [resources, searchQuery, filters]);

  // If a resource is selected, show only that one
  const displayResources = useMemo(() => {
    if (selectedResource) {
      return filteredResources.filter(
        r => `${r.identity.kind}/${r.identity.name}` === selectedResource
      );
    }
    return filteredResources;
  }, [filteredResources, selectedResource]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* View Mode Selector */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #ddd',
        background: '#f9f9f9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => onViewModeChange('tree')}
            style={{
              padding: '0.5rem 1rem',
              background: viewMode === 'tree' ? '#667eea' : 'white',
              color: viewMode === 'tree' ? 'white' : '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '500'
            }}
          >
            🌳 Tree
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            style={{
              padding: '0.5rem 1rem',
              background: viewMode === 'table' ? '#667eea' : 'white',
              color: viewMode === 'table' ? 'white' : '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '500'
            }}
          >
            📊 Table
          </button>
          <button
            onClick={() => onViewModeChange('sidebyside')}
            style={{
              padding: '0.5rem 1rem',
              background: viewMode === 'sidebyside' ? '#667eea' : 'white',
              color: viewMode === 'sidebyside' ? 'white' : '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '500'
            }}
          >
            ↔️ Side-by-side
          </button>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#666' }}>
          {displayResources.length} resource{displayResources.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* View Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
        {viewMode === 'tree' && <TreeView resources={displayResources} />}
        {viewMode === 'table' && <TableView resources={displayResources} />}
        {viewMode === 'sidebyside' && <SideBySideView resources={displayResources} />}
      </div>
    </div>
  );
}

// Tree View Component
function TreeView({ resources }: { resources: ResourceDiff[] }) {
  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'added': return '#4caf50';
      case 'removed': return '#f44336';
      case 'modified': return '#ff9800';
      default: return '#666';
    }
  };

  return (
    <div>
      {resources.map((resource, idx) => (
        <div
          key={idx}
          style={{
            marginBottom: '1.5rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            overflow: 'hidden'
          }}
        >
          {/* Resource Header */}
          <div style={{
            padding: '0.75rem 1rem',
            background: '#f5f5f5',
            borderBottom: '1px solid #ddd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontWeight: '600', fontSize: '1rem' }}>
                {resource.identity.kind} / {resource.identity.name}
              </span>
              {resource.identity.namespace && (
                <span style={{ marginLeft: '1rem', fontSize: '0.85rem', color: '#666' }}>
                  ns: {resource.identity.namespace}
                </span>
              )}
            </div>
            <div>
              <span
                style={{
                  padding: '0.25rem 0.75rem',
                  background: getChangeTypeColor(resource.changeType),
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}
              >
                {resource.changeType}
              </span>
            </div>
          </div>

          {/* Changes */}
          {resource.changes && resource.changes.length > 0 && (
            <div style={{ padding: '1rem' }}>
              {resource.changes.map((change, changeIdx) => (
                <div
                  key={changeIdx}
                  style={{
                    marginBottom: '0.75rem',
                    padding: '0.75rem',
                    background: '#fafafa',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px'
                  }}
                >
                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    color: '#333',
                    marginBottom: '0.5rem',
                    fontFamily: 'monospace'
                  }}>
                    {change.path}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                    {change.before !== undefined && (
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#999', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                          Before:
                        </div>
                        <div style={{
                          background: '#ffebee',
                          padding: '0.5rem',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontSize: '0.8rem',
                          color: '#c62828'
                        }}>
                          {JSON.stringify(change.before, null, 2)}
                        </div>
                      </div>
                    )}
                    {change.after !== undefined && (
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#999', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                          After:
                        </div>
                        <div style={{
                          background: '#e8f5e9',
                          padding: '0.5rem',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontSize: '0.8rem',
                          color: '#2e7d32'
                        }}>
                          {JSON.stringify(change.after, null, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                  {change.importance && (
                    <div style={{
                      marginTop: '0.5rem',
                      fontSize: '0.75rem',
                      color: '#666'
                    }}>
                      Importance: <strong>{change.importance}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {resources.length === 0 && (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: '#999'
        }}>
          No resources to display
        </div>
      )}
    </div>
  );
}

// Table View Component
function TableView({ resources }: { resources: ResourceDiff[] }) {
  return (
    <div style={{ overflow: 'auto' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.85rem'
      }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
              Kind
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
              Name
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
              Namespace
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
              Change Type
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
              Changes
            </th>
          </tr>
        </thead>
        <tbody>
          {resources.map((resource, idx) => (
            <tr
              key={idx}
              style={{
                borderBottom: '1px solid #e0e0e0',
                background: idx % 2 === 0 ? 'white' : '#fafafa'
              }}
            >
              <td style={{ padding: '0.75rem' }}>{resource.identity.kind}</td>
              <td style={{ padding: '0.75rem', fontWeight: '500' }}>{resource.identity.name}</td>
              <td style={{ padding: '0.75rem' }}>{resource.identity.namespace || '-'}</td>
              <td style={{ padding: '0.75rem' }}>
                <span
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: resource.changeType === 'added' ? '#e8f5e9' :
                                resource.changeType === 'removed' ? '#ffebee' :
                                resource.changeType === 'modified' ? '#fff3e0' : '#f5f5f5',
                    color: resource.changeType === 'added' ? '#2e7d32' :
                           resource.changeType === 'removed' ? '#c62828' :
                           resource.changeType === 'modified' ? '#e65100' : '#666',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}
                >
                  {resource.changeType}
                </span>
              </td>
              <td style={{ padding: '0.75rem' }}>
                {resource.changes ? resource.changes.length : 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {resources.length === 0 && (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: '#999'
        }}>
          No resources to display
        </div>
      )}
    </div>
  );
}

// Side-by-side View Component
function SideBySideView({ resources }: { resources: ResourceDiff[] }) {
  return (
    <div>
      {resources.map((resource, idx) => (
        <div
          key={idx}
          style={{
            marginBottom: '1.5rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            overflow: 'hidden'
          }}
        >
          <div style={{
            padding: '0.75rem 1rem',
            background: '#f5f5f5',
            borderBottom: '1px solid #ddd',
            fontWeight: '600'
          }}>
            {resource.identity.kind} / {resource.identity.name}
          </div>

          <div style={{ display: 'flex' }}>
            {/* Before (Left) */}
            <div style={{
              flex: 1,
              padding: '1rem',
              borderRight: '1px solid #ddd',
              background: '#ffebee'
            }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: '#c62828'
              }}>
                Before
              </div>
              <pre style={{
                margin: 0,
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                color: '#333',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {resource.changes && resource.changes.length > 0
                  ? resource.changes.map(c => `${c.path}: ${JSON.stringify(c.before, null, 2)}`).join('\n\n')
                  : 'No changes'}
              </pre>
            </div>

            {/* After (Right) */}
            <div style={{
              flex: 1,
              padding: '1rem',
              background: '#e8f5e9'
            }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: '#2e7d32'
              }}>
                After
              </div>
              <pre style={{
                margin: 0,
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                color: '#333',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {resource.changes && resource.changes.length > 0
                  ? resource.changes.map(c => `${c.path}: ${JSON.stringify(c.after, null, 2)}`).join('\n\n')
                  : 'No changes'}
              </pre>
            </div>
          </div>
        </div>
      ))}

      {resources.length === 0 && (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: '#999'
        }}>
          No resources to display
        </div>
      )}
    </div>
  );
}
