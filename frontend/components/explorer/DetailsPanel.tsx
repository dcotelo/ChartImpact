'use client';

import React from 'react';
import { ResourceDiff, Change } from '@/lib/types';
import { getChangeTypeColor, getImportanceColor, COLORS, STYLES } from './utils';

interface DetailsPanelProps {
  resource?: ResourceDiff;
}

export function DetailsPanel({ resource }: DetailsPanelProps) {
  if (!resource) {
    return (
      <div style={{
        padding: '1.5rem',
        color: COLORS.textLighter,
        textAlign: 'center'
      }}>
        Select a resource to view details
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '1rem',
      height: '100%',
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: `2px solid ${COLORS.border}`
      }}>
        <h3 style={{
          fontSize: '1.1rem',
          fontWeight: '600',
          margin: '0 0 0.5rem 0',
          color: COLORS.text
        }}>
          Resource Details
        </h3>
      </div>

      {/* Identity */}
      <Section title="Identity">
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
                background: COLORS.bgLight,
                padding: '0.1rem 0.3rem',
                borderRadius: '3px'
              }}>
                {resource.identity.uid}
              </code>
            </div>
          )}
        </div>
      </Section>

      {/* Change Type */}
      <Section title="Change Type">
        <div>
          <span style={{
            ...STYLES.badge(getChangeTypeColor(resource.changeType)),
            padding: '0.4rem 0.8rem',
            fontSize: '0.85rem',
          }}>
            {resource.changeType}
          </span>
        </div>
      </Section>

      {/* Hashes */}
      {(resource.beforeHash || resource.afterHash) && (
        <Section title="Hashes">
          <div style={{ fontSize: '0.85rem', lineHeight: '1.8' }}>
            {resource.beforeHash && (
              <div>
                <strong>Before:</strong>{' '}
                <code style={{
                  fontSize: '0.75rem',
                  background: COLORS.bgLight,
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
                  background: COLORS.bgLight,
                  padding: '0.1rem 0.3rem',
                  borderRadius: '3px'
                }}>
                  {resource.afterHash.substring(0, 8)}...
                </code>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Summary */}
      {resource.summary && (
        <Section title="Summary">
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
                      <span>{typeof count === 'number' ? count : 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {resource.summary.categories && resource.summary.categories.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>Categories:</strong>
                <div style={{ marginTop: '0.25rem', paddingLeft: '0.5rem' }}>
                  {resource.summary.categories.map((category, index) => (
                    <div key={`${category}-${index}`}>
                      • {category}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Changes */}
      {resource.changes && Array.isArray(resource.changes) && resource.changes.length > 0 && (
        <Section title={`Changes (${resource.changes.length})`}>
          <div style={{
            overflow: 'auto'
          }}>
            {resource.changes.map((change, index) => {
              if (!change) return null;
              const changeKey = change.path ? `${change.path}-${change.op || index}` : `change-${index}`;
              
              return (
                <div
                  key={changeKey}
                  style={{
                    marginBottom: '0.75rem',
                    padding: '0.75rem',
                    background: COLORS.bgLighter,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}
                >
                  <div style={{
                    fontFamily: 'monospace',
                    fontWeight: '500',
                    color: COLORS.text,
                    marginBottom: '0.5rem',
                    wordBreak: 'break-all'
                  }}>
                    {change.path || 'Unknown path'}
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
                  <div style={{ marginBottom: '0.5rem', color: COLORS.textLight }}>
                    Type: <strong>{change.semanticType}</strong>
                  </div>
                )}

                {change.flags && Array.isArray(change.flags) && change.flags.length > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    {change.flags.map((flag, flagIndex) => (
                      <span
                        key={`${flag}-${flagIndex}`}
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.4rem',
                          background: COLORS.bgLight,
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          marginRight: '0.25rem',
                          marginBottom: '0.25rem',
                          color: COLORS.text
                        }}
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                )}

                {change.op && (
                  <div style={{ color: COLORS.textLight, marginBottom: '0.5rem' }}>
                    Operation: <strong>{change.op}</strong>
                  </div>
                )}

                {(change.before !== undefined || change.after !== undefined) && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {change.before !== undefined && (
                      <div style={{ marginBottom: '0.25rem' }}>
                        <div style={{ fontSize: '0.7rem', color: COLORS.textLight }}>Before:</div>
                        <pre style={{
                          margin: '0.25rem 0 0 0',
                          padding: '0.5rem',
                          background: COLORS.bgLight,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: '3px',
                          fontSize: '0.75rem',
                          overflow: 'auto',
                          maxHeight: '100px',
                          color: COLORS.text
                        }}>
                          {JSON.stringify(change.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {change.after !== undefined && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: COLORS.textLight }}>After:</div>
                        <pre style={{
                          margin: '0.25rem 0 0 0',
                          padding: '0.5rem',
                          background: COLORS.bgLight,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: '3px',
                          fontSize: '0.75rem',
                          overflow: 'auto',
                          maxHeight: '100px',
                          color: COLORS.text
                        }}>
                          {JSON.stringify(change.after, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

// Helper Section component to reduce duplication
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={STYLES.sectionHeader}>
        {title}
      </div>
      {children}
    </div>
  );
}
