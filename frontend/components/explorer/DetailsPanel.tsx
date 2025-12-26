'use client';

import { ResourceDiff, Change } from '@/lib/types';

interface DetailsPanelProps {
  resource?: ResourceDiff;
}

export function DetailsPanel({ resource }: DetailsPanelProps) {
  if (!resource) {
    return (
      <div style={{
        padding: '1.5rem',
        color: '#999',
        textAlign: 'center'
      }}>
        Select a resource to view details
      </div>
    );
  }

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'added': return '#4caf50';
      case 'removed': return '#f44336';
      case 'modified': return '#ff9800';
      default: return '#666';
    }
  };

  const getImportanceColor = (importance?: string) => {
    switch (importance) {
      case 'critical': return '#d32f2f';
      case 'high': return '#f57c00';
      case 'medium': return '#fbc02d';
      case 'low': return '#388e3c';
      default: return '#757575';
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      {/* Header */}
      <div style={{
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #ddd'
      }}>
        <h3 style={{
          fontSize: '1.1rem',
          fontWeight: '600',
          margin: '0 0 0.5rem 0',
          color: '#333'
        }}>
          Resource Details
        </h3>
      </div>

      {/* Identity */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          fontSize: '0.8rem',
          fontWeight: '600',
          color: '#999',
          textTransform: 'uppercase',
          marginBottom: '0.5rem'
        }}>
          Identity
        </div>
        <div style={{ fontSize: '0.85rem', lineHeight: '1.8' }}>
          <div>
            <strong>Kind:</strong> {resource.identity.kind}
          </div>
          <div>
            <strong>Name:</strong> {resource.identity.name}
          </div>
          {resource.identity.namespace && (
            <div>
              <strong>Namespace:</strong> {resource.identity.namespace}
            </div>
          )}
          <div>
            <strong>API Version:</strong> {resource.identity.apiVersion}
          </div>
          {resource.identity.uid && (
            <div>
              <strong>UID:</strong>{' '}
              <code style={{
                fontSize: '0.75rem',
                background: '#f5f5f5',
                padding: '0.1rem 0.3rem',
                borderRadius: '3px'
              }}>
                {resource.identity.uid}
              </code>
            </div>
          )}
        </div>
      </div>

      {/* Change Type */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          fontSize: '0.8rem',
          fontWeight: '600',
          color: '#999',
          textTransform: 'uppercase',
          marginBottom: '0.5rem'
        }}>
          Change Type
        </div>
        <div>
          <span
            style={{
              padding: '0.4rem 0.8rem',
              background: getChangeTypeColor(resource.changeType),
              color: 'white',
              borderRadius: '4px',
              fontSize: '0.85rem',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}
          >
            {resource.changeType}
          </span>
        </div>
      </div>

      {/* Hashes */}
      {(resource.beforeHash || resource.afterHash) && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: '600',
            color: '#999',
            textTransform: 'uppercase',
            marginBottom: '0.5rem'
          }}>
            Hashes
          </div>
          <div style={{ fontSize: '0.85rem', lineHeight: '1.8' }}>
            {resource.beforeHash && (
              <div>
                <strong>Before:</strong>{' '}
                <code style={{
                  fontSize: '0.75rem',
                  background: '#f5f5f5',
                  padding: '0.1rem 0.3rem',
                  borderRadius: '3px'
                }}>
                  {resource.beforeHash.substring(0, 8)}...
                </code>
              </div>
            )}
            {resource.afterHash && (
              <div>
                <strong>After:</strong>{' '}
                <code style={{
                  fontSize: '0.75rem',
                  background: '#f5f5f5',
                  padding: '0.1rem 0.3rem',
                  borderRadius: '3px'
                }}>
                  {resource.afterHash.substring(0, 8)}...
                </code>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      {resource.summary && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: '600',
            color: '#999',
            textTransform: 'uppercase',
            marginBottom: '0.5rem'
          }}>
            Summary
          </div>
          <div style={{ fontSize: '0.85rem', lineHeight: '1.8' }}>
            <div>
              <strong>Total Changes:</strong> {resource.summary.totalChanges}
            </div>
            {resource.summary.byImportance && Object.keys(resource.summary.byImportance).length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>By Importance:</strong>
                <div style={{ marginTop: '0.25rem', paddingLeft: '0.5rem' }}>
                  {Object.entries(resource.summary.byImportance).map(([level, count]) => (
                    <div key={level} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: getImportanceColor(level),
                          display: 'inline-block'
                        }}
                      />
                      <span style={{ textTransform: 'capitalize' }}>{level}:</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {resource.summary.bySemanticType && Object.keys(resource.summary.bySemanticType).length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>By Type:</strong>
                <div style={{ marginTop: '0.25rem', paddingLeft: '0.5rem' }}>
                  {Object.entries(resource.summary.bySemanticType).map(([type, count]) => (
                    <div key={type}>
                      {type}: {count}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Changes */}
      {resource.changes && resource.changes.length > 0 && (
        <div>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: '600',
            color: '#999',
            textTransform: 'uppercase',
            marginBottom: '0.5rem'
          }}>
            Changes ({resource.changes.length})
          </div>
          <div style={{
            maxHeight: '400px',
            overflow: 'auto'
          }}>
            {resource.changes.map((change) => (
              <div
                key={`${change.path}-${change.type}`}
                style={{
                  marginBottom: '0.75rem',
                  padding: '0.75rem',
                  background: '#f9f9f9',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  fontSize: '0.8rem'
                }}
              >
                <div style={{
                  fontFamily: 'monospace',
                  fontWeight: '500',
                  color: '#333',
                  marginBottom: '0.5rem',
                  wordBreak: 'break-all'
                }}>
                  {change.path}
                </div>

                {change.importance && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        background: getImportanceColor(change.importance),
                        color: 'white',
                        borderRadius: '3px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}
                    >
                      {change.importance}
                    </span>
                  </div>
                )}

                {change.semanticType && (
                  <div style={{ marginBottom: '0.5rem', color: '#666' }}>
                    Type: <strong>{change.semanticType}</strong>
                  </div>
                )}

                {change.flags && change.flags.length > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    {change.flags.map((flag) => (
                      <span
                        key={flag}
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.4rem',
                          background: '#e0e0e0',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          marginRight: '0.25rem',
                          marginBottom: '0.25rem'
                        }}
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                )}

                {change.type && (
                  <div style={{ color: '#666', marginBottom: '0.5rem' }}>
                    Change: <strong>{change.type}</strong>
                  </div>
                )}

                {(change.before !== undefined || change.after !== undefined) && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {change.before !== undefined && (
                      <div style={{ marginBottom: '0.25rem' }}>
                        <div style={{ fontSize: '0.7rem', color: '#999' }}>Before:</div>
                        <pre style={{
                          margin: '0.25rem 0 0 0',
                          padding: '0.5rem',
                          background: '#fff',
                          border: '1px solid #e0e0e0',
                          borderRadius: '3px',
                          fontSize: '0.75rem',
                          overflow: 'auto',
                          maxHeight: '100px'
                        }}>
                          {JSON.stringify(change.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {change.after !== undefined && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#999' }}>After:</div>
                        <pre style={{
                          margin: '0.25rem 0 0 0',
                          padding: '0.5rem',
                          background: '#fff',
                          border: '1px solid #e0e0e0',
                          borderRadius: '3px',
                          fontSize: '0.75rem',
                          overflow: 'auto',
                          maxHeight: '100px'
                        }}>
                          {JSON.stringify(change.after, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
